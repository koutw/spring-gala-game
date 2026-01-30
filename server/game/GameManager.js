import { v4 as uuidv4 } from 'uuid';
import { HorseRacing } from './HorseRacing.js';
import { QuizGame } from './QuizGame.js';

/**
 * GameManager - 遊戲管理器
 * 管理遊戲狀態、玩家、房間和遊戲階段
 */
export class GameManager {
  constructor(io) {
    this.io = io;

    // Game state
    this.gameState = {
      phase: 'waiting', // waiting, phase1, phase2, finished
      isRunning: false,
      startTime: null,
      settings: {
        phase1Duration: 30, // seconds
        phase1Winners: 10,  // top N winners
        phase2Questions: 10,
        phase2TimePerQuestion: 15 // seconds
      }
    };

    // Player management
    this.players = new Map(); // socketId -> player data
    this.teams = new Map();   // teamId -> { name, players[], score }

    // Screen and admin clients
    this.screens = new Set(); // socket ids of big screens
    this.admins = new Set();  // socket ids of admins

    // Game instances
    this.horseRacing = new HorseRacing(this);
    this.quizGame = new QuizGame(this);

    // Predefined teams (departments)
    this.initializeTeams();
  }

  initializeTeams() {
    const defaultTeams = [
      { id: 'team1', name: '研發部', color: '#FF6B6B' },
      { id: 'team2', name: '設計部', color: '#4ECDC4' },
      { id: 'team3', name: '行銷部', color: '#45B7D1' },
      { id: 'team4', name: '業務部', color: '#96CEB4' },
      { id: 'team5', name: '人資部', color: '#FFEAA7' },
      { id: 'team6', name: '財務部', color: '#DDA0DD' }
    ];

    defaultTeams.forEach(team => {
      this.teams.set(team.id, {
        ...team,
        players: [],
        score: 0,
        horsePower: 100
      });
    });
  }

  // Add a new player
  addPlayer(socket, data) {
    const { nickname, teamId } = data;

    const player = {
      id: socket.id,
      oderId: uuidv4().slice(0, 8),
      nickname: nickname || `玩家${this.players.size + 1}`,
      teamId: teamId || this.autoAssignTeam(),
      score: 0,
      joinedAt: Date.now()
    };

    this.players.set(socket.id, player);

    // Add player to team
    const team = this.teams.get(player.teamId);
    if (team) {
      team.players.push(socket.id);
    }

    // Join socket room
    socket.join('players');
    socket.join(`team:${player.teamId}`);

    // Notify player of successful join
    socket.emit('player:joined', {
      player,
      team: this.teams.get(player.teamId),
      gameState: this.getGameStatus()
    });

    // Broadcast updated player count
    this.broadcastPlayerCount();

    console.log(`Player joined: ${player.nickname} (Team: ${team?.name})`);
  }

  // Auto-assign player to team with fewest members
  autoAssignTeam() {
    let minPlayers = Infinity;
    let targetTeamId = 'team1';

    this.teams.forEach((team, id) => {
      if (team.players.length < minPlayers) {
        minPlayers = team.players.length;
        targetTeamId = id;
      }
    });

    return targetTeamId;
  }

  // Add big screen
  addScreen(socket) {
    this.screens.add(socket.id);
    socket.join('screens');

    // Send current game state
    socket.emit('screen:init', {
      gameState: this.getGameStatus(),
      players: this.getPlayersList(),
      teams: this.getTeamsList()
    });

    console.log(`Big screen connected: ${socket.id}`);
  }

  // Add admin
  addAdmin(socket) {
    this.admins.add(socket.id);
    socket.join('admins');

    // Send full game state
    socket.emit('admin:init', {
      gameState: this.getGameStatus(),
      players: this.getPlayersList(),
      teams: this.getTeamsList(),
      settings: this.gameState.settings
    });

    console.log(`Admin connected: ${socket.id}`);
  }

  // Remove disconnected client
  removeClient(socketId) {
    if (this.players.has(socketId)) {
      const player = this.players.get(socketId);
      const team = this.teams.get(player.teamId);

      if (team) {
        team.players = team.players.filter(id => id !== socketId);
      }

      this.players.delete(socketId);
      this.broadcastPlayerCount();
    }

    this.screens.delete(socketId);
    this.admins.delete(socketId);
  }

  // Handle player action (Phase 1 - tap/shake)
  handlePlayerAction(socketId, data) {
    if (this.gameState.phase !== 'phase1' || !this.gameState.isRunning) {
      return;
    }

    this.horseRacing.handleAction(socketId, data);
  }

  // Handle player answer (Phase 2 - quiz)
  handlePlayerAnswer(socketId, data) {
    if (this.gameState.phase !== 'phase2' || !this.gameState.isRunning) {
      return;
    }

    this.quizGame.handleAnswer(socketId, data);
  }

  // Start game
  startGame(phase, settings = {}) {
    this.gameState.phase = phase;
    this.gameState.isRunning = true;
    this.gameState.startTime = Date.now();
    this.gameState.settings = { ...this.gameState.settings, ...settings };

    if (phase === 'phase1') {
      this.horseRacing.start();
    } else if (phase === 'phase2') {
      this.quizGame.start();
    }

    // Broadcast game start
    this.io.emit('game:start', {
      phase,
      settings: this.gameState.settings
    });

    console.log(`Game started: ${phase}`);
  }

  // Stop game
  stopGame() {
    this.gameState.isRunning = false;

    if (this.gameState.phase === 'phase1') {
      this.horseRacing.stop();
    } else if (this.gameState.phase === 'phase2') {
      this.quizGame.stop();
    }

    this.io.emit('game:stop', {});
    console.log('Game stopped');
  }

  // Send question (Phase 2)
  sendQuestion(question) {
    this.quizGame.sendQuestion(question);
  }

  // Get game status
  getGameStatus() {
    return {
      phase: this.gameState.phase,
      isRunning: this.gameState.isRunning,
      playerCount: this.players.size,
      teamCount: this.teams.size,
      settings: this.gameState.settings
    };
  }

  // Get players list
  getPlayersList() {
    return Array.from(this.players.values());
  }

  // Get teams list
  getTeamsList() {
    return Array.from(this.teams.entries()).map(([id, team]) => ({
      id,
      ...team,
      playerCount: team.players.length
    }));
  }

  // Broadcast player count update
  broadcastPlayerCount() {
    this.io.emit('players:count', {
      total: this.players.size,
      teams: this.getTeamsList()
    });
  }

  // Broadcast to all screens
  broadcastToScreens(event, data) {
    this.io.to('screens').emit(event, data);
  }

  // Broadcast to all players
  broadcastToPlayers(event, data) {
    this.io.to('players').emit(event, data);
  }

  // Broadcast to specific team
  broadcastToTeam(teamId, event, data) {
    this.io.to(`team:${teamId}`).emit(event, data);
  }
}
