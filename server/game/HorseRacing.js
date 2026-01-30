/**
 * HorseRacing - 第一階段：數位賽馬遊戲
 * 玩家透過搖晃手機或點擊螢幕累積分數
 */
export class HorseRacing {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.scores = new Map(); // socketId -> score
    this.timer = null;
    this.updateInterval = null;
    this.startTime = null;
    this.duration = 30; // seconds
  }

  start() {
    this.scores.clear();
    this.startTime = Date.now();
    this.duration = this.gameManager.gameState.settings.phase1Duration;

    // Initialize all player scores
    this.gameManager.players.forEach((player, socketId) => {
      this.scores.set(socketId, 0);
    });

    // Update leaderboard every 500ms for smooth animation
    this.updateInterval = setInterval(() => {
      this.broadcastLeaderboard();
    }, 500);

    // End game timer
    this.timer = setTimeout(() => {
      this.end();
    }, this.duration * 1000);

    // Broadcast start with countdown
    this.gameManager.io.emit('phase1:start', {
      duration: this.duration,
      startTime: this.startTime
    });

    console.log(`Horse Racing started! Duration: ${this.duration}s`);
  }

  stop() {
    this.cleanup();
  }

  cleanup() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  handleAction(socketId, data) {
    const { type, intensity = 1 } = data; // type: 'tap' or 'shake'

    // Calculate score increment based on action type
    let increment = 1;
    if (type === 'shake') {
      // Shake gives more points but requires device motion
      increment = Math.min(Math.floor(intensity * 2), 5);
    } else if (type === 'tap') {
      // Tap is consistent
      increment = 1;
    }

    // Update score
    const currentScore = this.scores.get(socketId) || 0;
    const newScore = currentScore + increment;
    this.scores.set(socketId, newScore);

    // Update player's score in game manager
    const player = this.gameManager.players.get(socketId);
    if (player) {
      player.score = newScore;
    }

    // Send immediate feedback to player
    this.gameManager.io.to(socketId).emit('phase1:score', {
      score: newScore,
      increment
    });
  }

  broadcastLeaderboard() {
    const leaderboard = this.getLeaderboard();
    const elapsed = (Date.now() - this.startTime) / 1000;
    const remaining = Math.max(0, this.duration - elapsed);

    // Send to screens
    this.gameManager.broadcastToScreens('phase1:leaderboard', {
      leaderboard: leaderboard.slice(0, 20), // Top 20 for display
      remaining: Math.ceil(remaining),
      totalPlayers: this.scores.size
    });

    // Send individual rank to players
    leaderboard.forEach((entry, index) => {
      this.gameManager.io.to(entry.id).emit('phase1:rank', {
        rank: index + 1,
        score: entry.score,
        remaining: Math.ceil(remaining)
      });
    });
  }

  getLeaderboard() {
    const entries = [];

    this.scores.forEach((score, socketId) => {
      const player = this.gameManager.players.get(socketId);
      if (player) {
        entries.push({
          id: socketId,
          oderId: player.oderId,
          nickname: player.nickname,
          teamId: player.teamId,
          score
        });
      }
    });

    // Sort by score descending
    entries.sort((a, b) => b.score - a.score);

    return entries;
  }

  end() {
    this.cleanup();

    const leaderboard = this.getLeaderboard();
    const winners = leaderboard.slice(0, this.gameManager.gameState.settings.phase1Winners);

    // Update game state
    this.gameManager.gameState.isRunning = false;

    // Broadcast results
    this.gameManager.io.emit('phase1:end', {
      winners,
      leaderboard: leaderboard.slice(0, 50), // Top 50
      totalPlayers: this.scores.size
    });

    console.log(`Horse Racing ended! Winners: ${winners.map(w => w.nickname).join(', ')}`);
  }
}
