/**
 * QuizGame - 第二階段：伯樂與千里馬問答遊戲
 * 團隊答題積分賽，答對加馬力，答錯減馬力
 */
export class QuizGame {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.currentQuestion = null;
    this.currentQuestionIndex = 0;
    this.questionTimer = null;
    this.answers = new Map(); // socketId -> answer
    this.questions = [];
    this.timePerQuestion = 15; // seconds

    // Load defaults so admin can see/edit them before game starts
    this.loadDefaultQuestions();
  }

  start() {
    this.currentQuestionIndex = 0;
    this.timePerQuestion = this.gameManager.settings.phase2TimePerQuestion || 15;
    this.currentQuestion = null;
    this.answers.clear();

    // Reset team horse power
    this.gameManager.teams.forEach(team => {
      team.horsePower = 100;
    });

    // Reset all player quizScores for a fresh Phase 2
    this.gameManager.playersByEmployeeId.forEach(player => {
      player.quizScore = 0;
    });

    // Load default questions if none provided
    if (this.questions.length === 0) {
      this.loadDefaultQuestions();
    }

    this.gameManager.io.emit('phase2:start', {
      totalQuestions: this.questions.length,
      timePerQuestion: this.timePerQuestion,
      teams: this.gameManager.getTeamsList()
    });

    console.log(`Quiz Game started! ${this.questions.length} questions`);
  }

  stop() {
    this.cleanup();
  }

  cleanup() {
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }
  }

  loadDefaultQuestions() {
    // Phase 2: 伯樂與千里馬問答遊戲預設題目
    this.questions = [
      {
        id: 1,
        text: '請問 IBM的LOGO總共由幾條橫槓組成?',
        options: ['7', '8', '9', '10'],
        correctIndex: 1,
        customType: 'star'
      },
      {
        id: 2,
        text: '請問IBM台灣的中文全名是?',
        options: ['國際商業機器股份有限公司', '台灣IBM公司', '台灣IBM股份有限公司', '台灣國際商業機器股份有限公司'],
        correctIndex: 3,
        customType: 'star'
      },
      {
        id: 3,
        text: '請問公司總機電話的最後四位數字相加總和是多少?',
        options: ['56', '14', '32', '27'],
        correctIndex: 1,
        customType: 'star'
      },
      {
        id: 4,
        text: '請問距離IBM台灣所在的國泰金融中心(CFC)最近的捷運站是?',
        options: ['永春站', '象山站', '市政府站', '台北101/世貿站'],
        correctIndex: 1,
        customType: 'star'
      },
      {
        id: 5,
        text: '以下哪個出生年分今年可以免費做健康檢查？',
        options: ['1983', '1998', '1982', '1997'],
        correctIndex: 0,
        customType: 'star'
      },
      {
        id: 6,
        text: '請某位老闆分享 4 件事情，判斷哪一件是假的 e.g. Han哥：',
        options: ['我會開船', '我會開飛機', '我會騎腳踏車', '我會騎獨輪車'],
        correctIndex: 0,
        customType: 'star'
      },
      {
        id: 7,
        text: '童年照片連連看：投影出 4 張小朋友的黑白或幼年時期照片，其中只有一張是某位老闆小時候，請大家從五官特徵猜猜看這是誰?',
        options: ['KT', 'Han哥', 'Nelson', 'Jack'],
        correctIndex: 0,
        customType: 'star'
      },
      {
        id: 8,
        text: '老闆提供其他國家IBM照片(大樓外觀或辦公室), 猜在哪一個國家',
        options: ['美國洛杉磯', '日本', '德國', '以色列'],
        correctIndex: 0,
        customType: 'coin'
      },
      {
        id: 9,
        text: '猜哪一個圖片是Lin Han的眼睛',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        customType: 'coin'
      },
      {
        id: 10,
        text: '以下哪一個老闆的手最大',
        options: ['KT', 'Han哥', 'Nelson', 'Jack'],
        correctIndex: 0,
        customType: 'shell'
      },
      {
        id: 11,
        text: '選4位老闆參與，大家猜誰喝到的是100%檸檬原汁',
        options: ['KT', 'Han哥', 'Nelson', 'Jack'],
        correctIndex: 0,
        customType: 'shell'
      },
      {
        id: 12,
        text: '老闆隨便用捲尺拉一個長度出來，大家猜是幾公分',
        options: ['選項A', '選項B', '選項C', '選項D'],
        correctIndex: 0,
        customType: 'star'
      },
      {
        id: 13,
        text: '主持人和老闆閒聊，老闆用變聲器回答，讓大家猜他是誰?(也可用預錄的方式)',
        options: ['KT', 'Han哥', 'Nelson', 'Jack'],
        correctIndex: 0,
        customType: 'star'
      }
    ];

    // 新增：目前題目的自訂類型 (由 Admin 傳入)
    this.currentCustomType = null;
  }

  // 取得目前題目列表（供 Admin 同步）
  getQuestions() {
    return this.questions.map(q => ({
      id: q.id,
      text: q.text,
      options: [...q.options],
      correctIndex: q.correctIndex,
      customType: q.customType || 'star'
    }));
  }

  // Admin 編輯後更新題目列表
  setQuestions(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      return { success: false, message: '題目列表不可為空' };
    }

    this.questions = questions.map((q, idx) => ({
      id: q.id || idx + 1,
      text: q.text || `題目 ${idx + 1}`,
      options: Array.isArray(q.options) ? q.options.slice(0, 6) : ['A', 'B', 'C', 'D'],
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      customType: ['star', 'coin', 'shell'].includes(q.customType) ? q.customType : 'star'
    }));

    console.log(`Questions updated: ${this.questions.length} questions`);
    return { success: true };
  }

  sendQuestion(questionData = null, customType = null) {
    // Clear previous timer to prevent stale reveal
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }

    this.answers.clear();

    // Use provided question or get next from queue
    if (questionData) {
      this.currentQuestion = questionData;
    } else if (this.currentQuestionIndex < this.questions.length) {
      this.currentQuestion = this.questions[this.currentQuestionIndex];
      this.currentQuestionIndex++;
    } else {
      this.end();
      return;
    }

    // Use explicit override > question's own customType > 'star'
    this.currentCustomType = customType || this.currentQuestion.customType || 'star';

    // questionNumber: display-friendly (0-indexed for client to show as Q1, Q2...)
    const displayQuestionNumber = this.currentQuestionIndex - 1;

    const questionForClients = {
      id: this.currentQuestion.id,
      text: this.currentQuestion.text,
      options: this.currentQuestion.options,
      type: this.currentQuestion.type,
      questionNumber: displayQuestionNumber >= 0 ? displayQuestionNumber : 0,
      totalQuestions: this.questions.length,
      timeLimit: this.timePerQuestion,
      customType: this.currentCustomType
    };

    // Broadcast question
    this.gameManager.io.emit('phase2:question', questionForClients);

    // Start timer
    this.questionTimer = setTimeout(() => {
      this.revealAnswer();
    }, this.timePerQuestion * 1000);

    console.log(`Question ${this.currentQuestionIndex}: ${this.currentQuestion.text}`);
  }

  handleAnswer(socketId, data) {
    const { answerIndex } = data;

    if (!this.currentQuestion) {
      return; // No active question
    }

    const player = this.gameManager.players.get(socketId);
    if (!player) return;

    this.answers.set(socketId, {
      answerIndex,
      timestamp: Date.now(),
      playerId: socketId,
      teamId: player.teamId
    });

    // Notify player that answer was received
    this.gameManager.io.to(socketId).emit('phase2:answered', {
      answerIndex
    });

    // Calculate distribution
    const distribution = Array(this.currentQuestion.options.length).fill(0);
    this.answers.forEach(ans => {
      if (ans.answerIndex >= 0 && ans.answerIndex < distribution.length) {
        distribution[ans.answerIndex]++;
      }
    });

    // Update answer count for screens
    this.gameManager.broadcastToScreens('phase2:answerCount', {
      answered: this.answers.size,
      total: this.gameManager.players.size,
      distribution
    });
  }

  revealAnswer() {
    if (!this.currentQuestion) return;

    const correctIndex = this.currentQuestion.correctIndex;
    const questionType = this.currentCustomType || 'star';

    // 處理計分邏輯
    // A. 無敵星星題 (star): 答對 +1 分
    // B. 金幣題 (coin): 搶答，前 100 名答對 +1 分
    // C. 龜殼題 (shell): 答錯或未作答 -1 分，且允許負分

    // Sort answers by timestamp for coin (fastest first)
    const sortedAnswers = Array.from(this.answers.values()).sort((a, b) => a.timestamp - b.timestamp);
    let correctCount = 0;

    // 記錄有作答的玩家
    const answeredPlayers = new Set();

    sortedAnswers.forEach((answer) => {
      answeredPlayers.add(answer.playerId);
      const player = this.gameManager.players.get(answer.playerId);
      if (!player) return;

      const isCorrect = answer.answerIndex === correctIndex;
      let scoreChange = 0;

      if (questionType === 'star') {
        if (isCorrect) scoreChange = 1;
      } else if (questionType === 'coin') {
        if (isCorrect) {
          correctCount++;
          if (correctCount <= 100) {
            scoreChange = 1;
          }
        }
      } else if (questionType === 'shell') {
        if (!isCorrect) {
          scoreChange = -1;
        }
      }

      // 確保 player score 屬性存在
      if (player.quizScore === undefined) player.quizScore = 0;
      player.quizScore += scoreChange;

      // 發送個人結果與分數更新
      this.gameManager.io.to(answer.playerId).emit('phase2:result', {
        correct: isCorrect,
        correctIndex,
        yourAnswer: answer.answerIndex,
        scoreChange,
        newScore: player.quizScore,
        wasInTop100: questionType === 'coin' && isCorrect && correctCount <= 100
      });

      // Update score display (Phase 2 只顯示問答分數)
      this.gameManager.io.to(answer.playerId).emit('player:score', {
        score: player.quizScore,
        totalScore: player.quizScore
      });
    });

    // 處理未作答的玩家 (僅在龜殼題時扣分)
    if (questionType === 'shell') {
      this.gameManager.players.forEach((player, socketId) => {
        if (!answeredPlayers.has(socketId) && player.teamId) { // Only process active players in a team
          // 確保 player quizScore 屬性存在
          if (player.quizScore === undefined) player.quizScore = 0;

          player.quizScore -= 1; // 龜殼題未作答扣 1 分

          this.gameManager.io.to(socketId).emit('phase2:result', {
            correct: false,
            correctIndex,
            yourAnswer: null, // 未作答
            scoreChange: -1,
            newScore: player.quizScore,
            wasInTop100: false
          });

          this.gameManager.io.to(socketId).emit('player:score', {
            score: player.quizScore,
            totalScore: player.quizScore
          });
        }
      });
    }

    // Broadcast reveal
    this.gameManager.io.emit('phase2:reveal', {
      correctIndex,
      teams: this.gameManager.getTeamsList(),
      questionType: questionType
    });

    this.currentQuestion = null;

    console.log(`Answer revealed! Type: ${questionType}`);
  }

  // Admin can trigger next question
  nextQuestion() {
    this.sendQuestion();
  }

  end() {
    this.cleanup();
    this.gameManager.gameState.isRunning = false;

    // Get final rankings based on individual player's total scores
    // Phase 2 排行榜只計算問答分數
    const topPlayers = Array.from(this.gameManager.playersByEmployeeId.values())
      .map(p => ({
        id: p.id,
        employeeId: p.employeeId,
        score: p.quizScore || 0,
        teamId: p.teamId
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Top 20

    this.gameManager.io.emit('phase2:end', {
      rankings: topPlayers
    });

    console.log(`Quiz Game ended!`);
  }
}
