/**
 * HorseRacing - 賽馬遊戲（Phase 1）
 * 支援 Round 1（點擊）和 Round 2（搖晃）
 */
export class HorseRacing {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.updateInterval = null;
    this.currentRound = 0;

    // Round 狀態
    this.roundState = {
      bonusStage: 0,        // 0: 正常, 1: Bonus 1, 2: Bonus 2
      buttonPosition: 0,    // 按鈕位置 (Round 1)
      motionType: 'twist'   // 'twist' or 'vertical' (Round 2)
    };
  }

  start(round) {
    this.currentRound = round;
    this.roundState = {
      bonusStage: 0,
      buttonPosition: 0,
      motionType: 'twist'
    };

    // 重置該 Round 分數
    if (round === 1) {
      this.gameManager.teams.forEach(team => {
        team.round1Score = 0;
      });
      this.gameManager.players.forEach(player => {
        player.round1Score = 0;
      });
    } else if (round === 2) {
      this.gameManager.teams.forEach(team => {
        team.round2Score = 0;
      });
      this.gameManager.players.forEach(player => {
        player.round2Score = 0;
      });
    }

    // 每 200ms 更新賽道和排行榜
    this.updateInterval = setInterval(() => {
      this.broadcastUpdate();
      this.checkBonusThresholds();
      this.checkRoundEnd();
    }, 200);

    // 廣播開始
    this.gameManager.io.emit(`round${round}:start`, {
      round,
      targetScore: round === 1
        ? this.gameManager.settings.round1TargetScore
        : this.gameManager.settings.round2TargetScore
    });

    console.log(`Round ${round} started!`);
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  handleAction(socketId, data) {
    const player = this.gameManager.players.get(socketId);
    if (!player) return;

    const team = this.gameManager.teams.get(player.teamId);
    if (!team) return;

    const { settings } = this.gameManager;

    // 檢查該隊是否已達到目標分數
    const targetScore = this.currentRound === 1
      ? settings.round1TargetScore
      : settings.round2TargetScore;
    const currentTeamScore = this.currentRound === 1
      ? team.round1Score
      : team.round2Score;

    // 如果隊伍已達到目標分數，不再累積積分
    if (currentTeamScore >= targetScore) {
      return;
    }

    let increment = 0;

    if (this.currentRound === 1) {
      // Round 1: 點擊
      if (data.type === 'tap') {
        // 根據 Bonus 階段決定分數
        increment = this.roundState.bonusStage > 0 ? 2 : 1;
      }
    } else if (this.currentRound === 2) {
      // Round 2: 搖晃
      if (data.type === 'shake') {
        const { gyroZ, accelY } = data;

        if (this.roundState.bonusStage === 0) {
          // 扭轉模式 (Gyroscope.z)
          if (Math.abs(gyroZ || 0) > settings.gyroThreshold) {
            increment = 1;
          }
        } else {
          // Bonus: 也是扭轉模式，但得 2 分
          if (Math.abs(gyroZ || 0) > settings.gyroThreshold) {
            increment = 2;
          }
        }
      }
    }

    if (increment > 0) {
      // 更新個人分數
      if (this.currentRound === 1) {
        player.round1Score += increment;
      } else {
        player.round2Score += increment;
      }
      player.totalScore = player.round1Score + player.round2Score;

      // 更新隊伍分數
      if (this.currentRound === 1) {
        team.round1Score += increment;
      } else {
        team.round2Score += increment;
      }
      team.totalScore = team.round1Score + team.round2Score;

      // 回傳即時分數給玩家
      this.gameManager.io.to(socketId).emit('player:score', {
        round: this.currentRound,
        score: this.currentRound === 1 ? player.round1Score : player.round2Score,
        totalScore: player.totalScore,
        increment
      });
    }
  }

  checkBonusThresholds() {
    const { settings } = this.gameManager;
    const teams = Array.from(this.gameManager.teams.values());

    if (this.currentRound === 1) {
      const maxScore = Math.max(...teams.map(t => t.round1Score));

      // Round 1 Bonus 門檻
      if (this.roundState.bonusStage === 0 && maxScore >= settings.round1BonusThreshold1) {
        this.roundState.bonusStage = 1;
        this.roundState.buttonPosition = 1; // 往上往右
        this.broadcastBonusChange();
      } else if (this.roundState.bonusStage === 1 && maxScore >= settings.round1BonusThreshold2) {
        this.roundState.bonusStage = 2;
        this.roundState.buttonPosition = 2; // 往下往左
        this.broadcastBonusChange();
      }
    } else if (this.currentRound === 2) {
      const maxScore = Math.max(...teams.map(t => t.round2Score));

      // Round 2 Bonus 門檻
      if (this.roundState.bonusStage === 0 && maxScore >= settings.round2BonusThreshold) {
        this.roundState.bonusStage = 1;
        this.roundState.motionType = 'vertical';
        this.broadcastBonusChange();
      }
    }
  }

  broadcastBonusChange() {
    this.gameManager.io.emit('bonus:change', {
      round: this.currentRound,
      bonusStage: this.roundState.bonusStage,
      buttonPosition: this.roundState.buttonPosition,
      motionType: this.roundState.motionType
    });

    console.log(`Bonus stage changed: Round ${this.currentRound}, Stage ${this.roundState.bonusStage}`);
  }

  checkRoundEnd() {
    const { settings } = this.gameManager;
    const teams = Array.from(this.gameManager.teams.values());
    const targetScore = this.currentRound === 1
      ? settings.round1TargetScore
      : settings.round2TargetScore;

    // 檢查是否所有隊伍都達到目標分數
    const allFinished = teams.every(team => {
      const score = this.currentRound === 1 ? team.round1Score : team.round2Score;
      return score >= targetScore;
    });

    if (allFinished) {
      this.endRound();
    }
  }

  endRound() {
    this.stop();

    const { settings } = this.gameManager;
    this.gameManager.gameState.isRunning = false;

    // 計算排名
    const teams = this.gameManager.getTeamsList().sort((a, b) => {
      const scoreA = this.currentRound === 1 ? a.round1Score : a.round2Score;
      const scoreB = this.currentRound === 1 ? b.round1Score : b.round2Score;
      return scoreB - scoreA;
    });

    // 個人排行榜
    const leaderboard = this.gameManager.getLeaderboard(
      this.currentRound === 1 ? 'round1' : 'round2'
    ).slice(0, settings.leaderboardSize);

    this.gameManager.io.emit(`round${this.currentRound}:end`, {
      round: this.currentRound,
      teams,
      leaderboard,
      winner: teams[0]
    });

    console.log(`Round ${this.currentRound} ended! Winner: ${teams[0].name}`);
  }

  broadcastUpdate() {
    const { settings } = this.gameManager;
    const teams = this.gameManager.getTeamsList();
    const targetScore = this.currentRound === 1
      ? settings.round1TargetScore
      : settings.round2TargetScore;

    // 計算賽道進度（Round 1: 400格, Round 2: 250格）
    const trackDivisions = this.currentRound === 1 ? 400 : 250;
    const progressPerDivision = targetScore / trackDivisions;

    const horsePositions = teams.map(team => {
      const score = this.currentRound === 1 ? team.round1Score : team.round2Score;
      const position = Math.min(Math.floor(score / progressPerDivision), trackDivisions);
      return {
        teamId: team.id,
        color: team.color,
        score,
        position,
        progress: Math.min(score / targetScore * 100, 100)
      };
    });

    // 廣播賽道狀態
    this.gameManager.broadcastToScreens('race:update', {
      round: this.currentRound,
      horses: horsePositions,
      bonusStage: this.roundState.bonusStage,
      targetScore
    });
  }
}
