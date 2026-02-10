import { v4 as uuidv4 } from 'uuid';
import { HorseRacing } from './HorseRacing.js';
import { RedisStore } from './RedisStore.js';

/**
 * GameManager - 遊戲管理器
 * 管理 600 位參與者，分 3 組（藍、黃、紅）進行賽馬競賽
 */
export class GameManager {
  constructor(io) {
    this.io = io;

    // Redis 持久化
    this.redis = new RedisStore();

    // 遊戲設定（可由控制台調整）
    this.settings = {
      round1TargetScore: 40000,  // Round 1 目標分數
      round2TargetScore: 25000,  // Round 2 目標分數
      leaderboardSize: 20,       // 排行榜顯示人數
      round1BonusThreshold1: 20000,
      round1BonusThreshold2: 30000,
      round2BonusThreshold: 15000,
      // 感測門檻
      gyroThreshold: 2.0,        // 搖晃門檻 (rad/s)
      accelThreshold: 15         // 加速度門檻 (m/s²)
    };

    // 遊戲狀態
    this.gameState = {
      gameId: this.generateGameId(),  // 遊戲場次識別碼
      phase: 'waiting',  // waiting, round1, round1_result, round2_warmup, round2, round2_result, finished
      isRunning: false,
      currentRound: 0,
      startTime: null
    };

    // 玩家管理 (socketId -> player data)
    this.players = new Map();

    // 玩家 Session 管理 (employeeId -> player data) - 用於斷線重連
    this.playersByEmployeeId = new Map();

    // Session Token 管理 (sessionToken -> employeeId) - 安全驗證
    this.sessionTokens = new Map();

    // 3 組隊伍（藍、黃、紅）
    this.teams = new Map();

    // 大螢幕和管理員
    this.screens = new Set();
    this.admins = new Set();

    // 遊戲實例
    this.horseRacing = new HorseRacing(this);

    // 初始化隊伍
    this.initializeTeams();

    // 連接 Redis 並嘗試恢復狀態
    this.initRedis();

    console.log(`Game initialized with ID: ${this.gameState.gameId}`);
  }

  // 初始化 Redis 連接並恢復狀態
  async initRedis() {
    const connected = await this.redis.connect();
    if (connected) {
      await this.restoreFromRedis();
      // 啟動定期儲存
      this.startPeriodicSave();
    }
  }

  // 從 Redis 恢復狀態
  async restoreFromRedis() {
    try {
      // 恢復遊戲狀態
      const savedGameState = await this.redis.loadGameState();
      if (savedGameState) {
        this.gameState = savedGameState;
        console.log(`Restored game state: ${savedGameState.gameId}`);
      }

      // 恢復設定
      const savedSettings = await this.redis.loadSettings();
      if (savedSettings) {
        this.settings = { ...this.settings, ...savedSettings };
        console.log('Restored settings');
      }

      // 恢復隊伍
      const savedTeams = await this.redis.loadTeams();
      if (savedTeams) {
        savedTeams.forEach((team, id) => {
          const existingTeam = this.teams.get(id);
          if (existingTeam) {
            existingTeam.round1Score = team.round1Score || 0;
            existingTeam.round2Score = team.round2Score || 0;
            existingTeam.totalScore = team.totalScore || 0;
          }
        });
        console.log('Restored teams');
      }

      // 恢復玩家
      const savedPlayers = await this.redis.loadPlayers();
      if (savedPlayers.size > 0) {
        savedPlayers.forEach((player, employeeId) => {
          player.isOnline = false; // 伺服器重啟，所有人離線
          player.id = null;
          this.playersByEmployeeId.set(employeeId, player);
        });
        console.log(`Restored ${savedPlayers.size} players`);
      }
    } catch (error) {
      console.error('Failed to restore from Redis:', error.message);
    }
  }

  // 定期儲存到 Redis（每 5 秒）
  startPeriodicSave() {
    setInterval(async () => {
      await this.saveToRedis();
    }, 5000);
  }

  // 儲存到 Redis
  async saveToRedis() {
    if (!this.redis.isConnected) return;

    await this.redis.saveGameState(this.gameState);
    await this.redis.saveSettings(this.settings);
    await this.redis.saveTeams(this.teams);

    // 儲存玩家
    for (const [employeeId, player] of this.playersByEmployeeId) {
      await this.redis.savePlayer(employeeId, player);
    }
  }

  // 產生遊戲場次識別碼 (格式: GAME-YYYYMMDD-XXXX)
  generateGameId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GAME-${dateStr}-${randomStr}`;
  }

  // 產生安全的 Session Token（32 位隨機字串）
  generateSessionToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  // 重置遊戲（開始新的一場）
  async resetGame() {
    // 產生新的遊戲 ID
    const newGameId = this.generateGameId();

    // 清除所有玩家資料
    this.players.clear();
    this.playersByEmployeeId.clear();
    this.sessionTokens.clear();  // 清除所有 session tokens

    // 重置遊戲狀態
    this.gameState = {
      gameId: newGameId,
      phase: 'waiting',
      isRunning: false,
      currentRound: 0,
      startTime: null
    };

    // 重置隊伍分數
    this.initializeTeams();

    // 清除 Redis 資料
    await this.redis.clearAll();

    // 廣播遊戲重置
    this.io.emit('game:reset', { gameId: newGameId });
    this.broadcastPlayerCount();

    console.log(`Game reset! New ID: ${newGameId}`);
    return newGameId;
  }

  initializeTeams() {
    const defaultTeams = [
      { id: 'blue', name: '藍隊', color: '#3B82F6', gradient: 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)' },
      { id: 'yellow', name: '黃隊', color: '#EAB308', gradient: 'linear-gradient(180deg, #EAB308 0%, #CA8A04 100%)' },
      { id: 'red', name: '紅隊', color: '#EF4444', gradient: 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)' }
    ];

    defaultTeams.forEach(team => {
      this.teams.set(team.id, {
        ...team,
        players: [],
        round1Score: 0,
        round2Score: 0,
        totalScore: 0
      });
    });
  }

  // 新增/重連玩家 - 支援 Session Token 安全驗證
  addPlayer(socket, data) {
    const { employeeId, teamId, sessionToken } = data;

    // 1. 嘗試使用 sessionToken 重連（安全驗證）
    if (sessionToken && this.sessionTokens.has(sessionToken)) {
      const storedEmployeeId = this.sessionTokens.get(sessionToken);
      if (this.playersByEmployeeId.has(storedEmployeeId)) {
        return this.reconnectPlayer(socket, storedEmployeeId, sessionToken);
      }
    }

    // 2. 新玩家加入（需要 employeeId）
    if (!employeeId) {
      socket.emit('player:error', { message: '缺少員工編號' });
      return;
    }

    const normalizedEmployeeId = employeeId.trim().toUpperCase();

    // 檢查 employeeId 是否已被使用
    if (this.playersByEmployeeId.has(normalizedEmployeeId)) {
      socket.emit('player:error', {
        message: '此員工編號已在遊戲中，請使用原裝置重新連線'
      });
      return;
    }

    // 驗證隊伍 ID
    const validTeamId = ['blue', 'yellow', 'red'].includes(teamId) ? teamId : 'blue';

    // 產生新的 sessionToken
    const newSessionToken = this.generateSessionToken();

    const player = {
      id: socket.id,
      oderId: uuidv4().slice(0, 8),
      employeeId: normalizedEmployeeId,
      sessionToken: newSessionToken,
      teamId: validTeamId,
      round1Score: 0,
      round2Score: 0,
      totalScore: 0,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      isOnline: true
    };

    // 儲存 sessionToken → employeeId 對應
    this.sessionTokens.set(newSessionToken, normalizedEmployeeId);

    this.players.set(socket.id, player);
    this.playersByEmployeeId.set(normalizedEmployeeId, player);

    // 加入隊伍
    const team = this.teams.get(player.teamId);
    if (team) {
      team.players.push(socket.id);
    }

    // 加入 Socket 房間
    socket.join('players');
    socket.join(`team:${player.teamId}`);

    // 回傳加入成功（包含 sessionToken 供前端儲存）
    socket.emit('player:joined', {
      player: { ...player, sessionToken: newSessionToken },
      team: this.getTeamInfo(player.teamId),
      gameState: this.getGameStatus(),
      sessionToken: newSessionToken,  // 獨立欄位方便前端取用
      isReconnect: false
    });

    // 廣播更新人數
    this.broadcastPlayerCount();

    console.log(`Player joined: ${player.employeeId} (Team: ${team?.name})`);
  }

  // 重連玩家 - 恢復之前的分數和狀態，使用 sessionToken 驗證
  reconnectPlayer(socket, employeeId, sessionToken) {
    const existingPlayer = this.playersByEmployeeId.get(employeeId);
    if (!existingPlayer) return;

    const oldSocketId = existingPlayer.id;

    // 踢掉前一個連線（如果還在線）
    if (oldSocketId && this.io.sockets.sockets.has(oldSocketId)) {
      const oldSocket = this.io.sockets.sockets.get(oldSocketId);
      oldSocket.emit('player:kicked', { reason: '您已在其他裝置登入' });
      oldSocket.disconnect(true);
      console.log(`Kicked previous connection for ${employeeId}: ${oldSocketId}`);
    }

    // 從舊的 socket 移除
    this.players.delete(oldSocketId);
    const team = this.teams.get(existingPlayer.teamId);
    if (team) {
      team.players = team.players.filter(id => id !== oldSocketId);
    }

    // 更新為新的 socket
    existingPlayer.id = socket.id;
    existingPlayer.lastActiveAt = Date.now();
    existingPlayer.isOnline = true;

    this.players.set(socket.id, existingPlayer);

    // 重新加入隊伍
    if (team) {
      team.players.push(socket.id);
    }

    // 加入 Socket 房間
    socket.join('players');
    socket.join(`team:${existingPlayer.teamId}`);

    // 回傳重連成功（包含 sessionToken、分數和狀態）
    socket.emit('player:joined', {
      player: existingPlayer,
      team: this.getTeamInfo(existingPlayer.teamId),
      gameState: this.getGameStatus(),
      roundState: this.getRoundState(),
      sessionToken: sessionToken,  // 回傳原有的 sessionToken
      isReconnect: true
    });

    // 廣播更新人數
    this.broadcastPlayerCount();

    console.log(`Player reconnected: ${employeeId} (Score: R1=${existingPlayer.round1Score}, R2=${existingPlayer.round2Score})`);
  }

  getTeamInfo(teamId) {
    const team = this.teams.get(teamId);
    if (!team) return null;
    return {
      id: team.id,
      name: team.name,
      color: team.color,
      gradient: team.gradient,
      playerCount: team.players.length
    };
  }

  // 大螢幕連線 - 發送完整賽跑狀態
  addScreen(socket) {
    this.screens.add(socket.id);
    socket.join('screens');

    socket.emit('screen:init', {
      gameState: this.getGameStatus(),
      teams: this.getTeamsList(),
      settings: this.settings,
      roundState: this.getRoundState(),
      raceProgress: this.getRaceProgress()
    });

    console.log(`Big screen connected: ${socket.id}`);
  }

  // 取得當前 Round 狀態
  getRoundState() {
    return {
      bonusStage: this.horseRacing.roundState?.bonusStage || 0,
      buttonPosition: this.horseRacing.roundState?.buttonPosition || 0,
      motionType: this.horseRacing.roundState?.motionType || 'twist'
    };
  }

  // 取得賽跑進度
  getRaceProgress() {
    const teams = [];
    this.teams.forEach((team, id) => {
      const targetScore = this.gameState.currentRound === 1
        ? this.settings.round1TargetScore
        : this.settings.round2TargetScore;
      const currentScore = this.gameState.currentRound === 1
        ? team.round1Score
        : team.round2Score;

      teams.push({
        id: team.id,
        name: team.name,
        color: team.color,
        score: currentScore,
        progress: Math.min((currentScore / targetScore) * 100, 100)
      });
    });
    return { teams };
  }

  // 管理員連線
  addAdmin(socket) {
    this.admins.add(socket.id);
    socket.join('admins');

    socket.emit('admin:init', {
      gameState: this.getGameStatus(),
      teams: this.getTeamsList(),
      settings: this.settings
    });

    console.log(`Admin connected: ${socket.id}`);
  }

  // 斷線處理 - 保留玩家資料以供重連
  removeClient(socketId) {
    if (this.players.has(socketId)) {
      const player = this.players.get(socketId);
      const team = this.teams.get(player.teamId);

      if (team) {
        team.players = team.players.filter(id => id !== socketId);
      }

      // 標記為離線，但保留資料（30 分鐘內可重連）
      player.isOnline = false;
      player.disconnectedAt = Date.now();

      // 從 active players 移除，但保留在 playersByEmployeeId
      this.players.delete(socketId);
      // 注意：不要從 playersByEmployeeId 刪除！

      this.broadcastPlayerCount();
      console.log(`Player disconnected (session kept): ${player.employeeId}`);
    }

    this.screens.delete(socketId);
    this.admins.delete(socketId);
  }

  // 處理玩家動作
  handlePlayerAction(socketId, data) {
    if (!this.gameState.isRunning) return;

    if (this.gameState.phase === 'round1' || this.gameState.phase === 'round2') {
      this.horseRacing.handleAction(socketId, data);
    }
  }

  // 更新設定
  updateSettings(newSettings) {
    // 遊戲進行中不可調整設定
    if (this.gameState.isRunning) {
      console.log('Settings locked: game is running');
      return { success: false, message: '遊戲進行中，無法調整設定' };
    }

    // 如果 Round 1 總分調整，等比例調整 Bonus 門檻
    if (newSettings.round1TargetScore && newSettings.round1TargetScore !== this.settings.round1TargetScore) {
      const ratio = newSettings.round1TargetScore / 40000; // 以預設值 40000 為基準
      newSettings.round1BonusThreshold1 = Math.round(20000 * ratio);
      newSettings.round1BonusThreshold2 = Math.round(30000 * ratio);
    }

    // 如果 Round 2 總分調整，等比例調整 Bonus 門檻
    if (newSettings.round2TargetScore && newSettings.round2TargetScore !== this.settings.round2TargetScore) {
      const ratio = newSettings.round2TargetScore / 25000; // 以預設值 25000 為基準
      newSettings.round2BonusThreshold = Math.round(15000 * ratio);
    }

    this.settings = { ...this.settings, ...newSettings };

    // 廣播設定更新給管理員和大螢幕
    this.io.to('admins').emit('admin:settings', this.settings);
    this.io.to('screens').emit('settings:update', this.settings);

    console.log('Settings updated:', this.settings);
    return { success: true };
  }

  // 開始遊戲
  startGame(round) {
    if (round === 1) {
      this.gameState.phase = 'round1';
      this.gameState.currentRound = 1;
    } else if (round === 2) {
      this.gameState.phase = 'round2';
      this.gameState.currentRound = 2;
    }

    this.gameState.isRunning = true;
    this.gameState.startTime = Date.now();

    this.horseRacing.start(round);

    this.io.emit('game:start', {
      phase: this.gameState.phase,
      round
    });

    console.log(`Game started: Round ${round}`);
  }

  // 停止遊戲
  stopGame() {
    this.gameState.isRunning = false;
    this.horseRacing.stop();
    this.io.emit('game:stop', {});
    console.log('Game stopped');
  }

  // 開始 Round 2 暖身階段
  startWarmup() {
    this.gameState.phase = 'round2_warmup';
    this.io.emit('round2:warmup', {});
    console.log('Round 2 warmup started - players can authorize motion sensors');
  }

  // 強制結束當前回合
  endRound(round) {
    if (!this.gameState.isRunning) return;

    // 確認是正確的回合
    if (this.gameState.currentRound !== round) return;

    // 呼叫 HorseRacing 的 endRound 方法
    this.horseRacing.endRound();
    console.log(`Round ${round} ended by admin`);
  }

  // 顯示排行榜
  showLeaderboard(type = 'current') {
    const leaderboard = this.getLeaderboard(type);

    if (this.gameState.currentRound === 1) {
      this.gameState.phase = 'round1_result';
    } else if (this.gameState.currentRound === 2) {
      this.gameState.phase = 'round2_result';
    }

    this.io.emit('leaderboard:show', {
      type,
      leaderboard: leaderboard.slice(0, this.settings.leaderboardSize),
      teams: this.getTeamsList()
    });
  }

  // 取得排行榜
  getLeaderboard(type = 'total') {
    const entries = [];

    this.players.forEach((player, socketId) => {
      let score = 0;
      if (type === 'round1') {
        score = player.round1Score;
      } else if (type === 'round2') {
        score = player.round2Score;
      } else {
        score = player.totalScore;
      }

      entries.push({
        id: socketId,
        employeeId: player.employeeId,
        teamId: player.teamId,
        score
      });
    });

    entries.sort((a, b) => b.score - a.score);
    return entries;
  }

  // 取得遊戲狀態
  getGameStatus() {
    return {
      phase: this.gameState.phase,
      isRunning: this.gameState.isRunning,
      currentRound: this.gameState.currentRound,
      playerCount: this.players.size,
      settings: this.settings
    };
  }

  // 取得隊伍列表
  getTeamsList() {
    return Array.from(this.teams.entries()).map(([id, team]) => ({
      id,
      name: team.name,
      color: team.color,
      gradient: team.gradient,
      playerCount: team.players.length,
      round1Score: team.round1Score,
      round2Score: team.round2Score,
      totalScore: team.totalScore
    }));
  }

  // 廣播人數更新
  broadcastPlayerCount() {
    this.io.emit('players:count', {
      total: this.players.size,
      teams: this.getTeamsList()
    });
  }

  // 廣播到所有大螢幕
  broadcastToScreens(event, data) {
    this.io.to('screens').emit(event, data);
  }

  // 廣播到所有玩家
  broadcastToPlayers(event, data) {
    this.io.to('players').emit(event, data);
  }

  // 廣播到特定隊伍
  broadcastToTeam(teamId, event, data) {
    this.io.to(`team:${teamId}`).emit(event, data);
  }
}
