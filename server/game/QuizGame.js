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
  }

  start() {
    this.currentQuestionIndex = 0;
    this.timePerQuestion = this.gameManager.gameState.settings.phase2TimePerQuestion;

    // Reset team horse power
    this.gameManager.teams.forEach(team => {
      team.horsePower = 100;
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
    // Default questions for testing
    this.questions = [
      {
        id: 1,
        text: '公司成立於哪一年？',
        options: ['2015', '2018', '2020', '2022'],
        correctIndex: 1,
        type: 'normal', // normal, star (無敵星星), banana (香蕉皮)
        points: { correct: 10, wrong: -5 }
      },
      {
        id: 2,
        text: '我們的吉祥物叫什麼名字？',
        options: ['小明', '旺財', '阿福', '小黑'],
        correctIndex: 0,
        type: 'star',
        points: { correct: 20, wrong: 0 } // Star: no penalty
      },
      {
        id: 3,
        text: '辦公室在幾樓？',
        options: ['3樓', '5樓', '7樓', '10樓'],
        correctIndex: 2,
        type: 'banana',
        points: { correct: 10, wrong: -15 } // Banana: higher penalty
      }
      // Add more questions as needed
    ];
  }

  sendQuestion(questionData = null) {
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

    const questionForClients = {
      id: this.currentQuestion.id,
      text: this.currentQuestion.text,
      options: this.currentQuestion.options,
      type: this.currentQuestion.type,
      questionNumber: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      timeLimit: this.timePerQuestion
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

    if (!this.currentQuestion || this.answers.has(socketId)) {
      return; // No active question or already answered
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

    // Update answer count for screens
    this.gameManager.broadcastToScreens('phase2:answerCount', {
      answered: this.answers.size,
      total: this.gameManager.players.size
    });
  }

  revealAnswer() {
    if (!this.currentQuestion) return;

    const correctIndex = this.currentQuestion.correctIndex;
    const points = this.currentQuestion.points;

    // Calculate team results
    const teamResults = new Map();
    this.gameManager.teams.forEach((team, teamId) => {
      teamResults.set(teamId, { correct: 0, wrong: 0, total: 0 });
    });

    // Process all answers
    this.answers.forEach((answer, socketId) => {
      const player = this.gameManager.players.get(socketId);
      if (!player) return;

      const isCorrect = answer.answerIndex === correctIndex;
      const teamResult = teamResults.get(player.teamId);

      if (teamResult) {
        teamResult.total++;
        if (isCorrect) {
          teamResult.correct++;
        } else {
          teamResult.wrong++;
        }
      }

      // Notify player of result
      this.gameManager.io.to(socketId).emit('phase2:result', {
        correct: isCorrect,
        correctIndex,
        yourAnswer: answer.answerIndex
      });
    });

    // Update team horse power
    teamResults.forEach((result, teamId) => {
      const team = this.gameManager.teams.get(teamId);
      if (!team) return;

      // Calculate score change based on majority vote
      const totalAnswered = result.correct + result.wrong;
      if (totalAnswered > 0) {
        const correctRate = result.correct / totalAnswered;

        if (correctRate > 0.5) {
          // Majority correct - add points
          team.horsePower += points.correct;
        } else {
          // Majority wrong - subtract points
          team.horsePower += points.wrong;
        }

        // Ensure minimum 0
        team.horsePower = Math.max(0, team.horsePower);
      }
    });

    // Broadcast reveal
    this.gameManager.io.emit('phase2:reveal', {
      correctIndex,
      teams: this.gameManager.getTeamsList(),
      questionType: this.currentQuestion.type
    });

    this.currentQuestion = null;

    console.log('Answer revealed! Team standings:',
      Array.from(this.gameManager.teams.values())
        .map(t => `${t.name}: ${t.horsePower}`)
        .join(', ')
    );
  }

  // Admin can trigger next question
  nextQuestion() {
    this.sendQuestion();
  }

  end() {
    this.cleanup();
    this.gameManager.gameState.isRunning = false;

    // Get final rankings
    const teams = this.gameManager.getTeamsList()
      .sort((a, b) => b.horsePower - a.horsePower);

    const winner = teams[0];

    this.gameManager.io.emit('phase2:end', {
      winner,
      rankings: teams
    });

    console.log(`Quiz Game ended! Winner: ${winner.name} with ${winner.horsePower} horse power!`);
  }
}
