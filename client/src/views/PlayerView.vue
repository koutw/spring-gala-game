<template>
  <div class="player-view no-select">
    <!-- Join Screen -->
    <div v-if="!gameStore.player" class="join-screen">
      <div class="join-card card-glass animate-fadeIn">
        <div class="join-header">
          <div class="game-icon">🏇</div>
          <h1>加入遊戲</h1>
        </div>

        <form @submit.prevent="joinGame" class="join-form">
          <div class="form-group">
            <label>暱稱</label>
            <input v-model="nickname" class="input" placeholder="輸入你的暱稱" maxlength="20" required />
          </div>

          <div class="form-group">
            <label>選擇隊伍</label>
            <div class="team-grid">
              <button v-for="team in teams" :key="team.id" type="button" class="team-btn"
                :class="{ selected: selectedTeam === team.id }" :style="{ '--team-color': team.color }"
                @click="selectedTeam = team.id">
                <span class="team-color-dot" :style="{ background: team.color }"></span>
                {{ team.name }}
              </button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-large w-full">
            加入遊戲 🎮
          </button>
        </form>

        <p class="player-count">
          <span class="status-dot online"></span>
          目前 {{ gameStore.playerCount }} 人在線
        </p>
      </div>
    </div>

    <!-- Game Screen -->
    <div v-else class="game-screen">
      <!-- Waiting State -->
      <div v-if="gameStore.gamePhase === 'waiting'" class="waiting-screen">
        <div class="waiting-content animate-fadeIn">
          <div class="waiting-icon animate-bounce">⏳</div>
          <h2>等待遊戲開始</h2>
          <p class="team-info">
            <span class="team-dot" :style="{ background: gameStore.team?.color }"></span>
            {{ gameStore.team?.name }} · {{ gameStore.player?.nickname }}
          </p>
          <div class="waiting-hint">
            <p>遊戲即將開始，請注意大螢幕！</p>
          </div>
        </div>
      </div>

      <!-- Phase 1: Horse Racing -->
      <div v-else-if="gameStore.gamePhase === 'phase1'" class="phase1-screen">
        <div class="phase1-header">
          <div class="timer" :class="{ warning: gameStore.remainingTime <= 5 }">
            {{ gameStore.remainingTime }}s
          </div>
          <div class="score-display">{{ gameStore.score }}</div>
          <div class="rank-display">
            第 <span class="rank-number">{{ gameStore.rank }}</span> 名
          </div>
        </div>

        <div class="tap-area" @click="handleTap" @touchstart.prevent="handleTap">
          <div class="tap-button btn-game">
            <span class="tap-icon">👆</span>
            <span class="tap-text">瘋狂點擊!</span>
          </div>
          <p class="tap-hint">快速點擊或搖晃手機累積分數！</p>
        </div>

        <div class="phase1-footer">
          <div class="team-info">
            <span class="team-dot" :style="{ background: gameStore.team?.color }"></span>
            {{ gameStore.team?.name }}
          </div>
        </div>
      </div>

      <!-- Phase 1 Result -->
      <div v-else-if="gameStore.gamePhase === 'phase1_result'" class="result-screen">
        <div class="result-content animate-scaleIn">
          <div class="result-icon">🏁</div>
          <h1>賽馬結束！</h1>

          <div class="your-result">
            <p>你的分數</p>
            <div class="score-display">{{ gameStore.score }}</div>
            <p class="rank-info">第 <span class="rank-highlight">{{ gameStore.rank }}</span> 名</p>
          </div>

          <div class="top-players">
            <h3>🏆 前三名</h3>
            <div v-for="(player, index) in gameStore.leaderboard?.slice(0, 3)" :key="player.id" class="top-player-item">
              <span class="rank-badge" :class="['gold', 'silver', 'bronze'][index]">{{ index + 1 }}</span>
              <span class="player-name">{{ player.nickname }}</span>
              <span class="player-score">{{ player.score }}</span>
            </div>
          </div>

          <p class="waiting-next">等待主持人進入下一階段...</p>
        </div>
      </div>

      <!-- Phase 2: Quiz -->
      <div v-else-if="gameStore.gamePhase === 'phase2'" class="phase2-screen">
        <div v-if="gameStore.currentQuestion" class="question-container animate-fadeIn">
          <div class="question-header">
            <span class="question-number">
              Q{{ gameStore.currentQuestion.questionNumber }}
            </span>
            <span v-if="gameStore.currentQuestion.type === 'star'" class="question-type star">
              ⭐ 無敵星星
            </span>
            <span v-else-if="gameStore.currentQuestion.type === 'banana'" class="question-type banana">
              🍌 香蕉皮
            </span>
          </div>

          <h2 class="question-text">{{ gameStore.currentQuestion.text }}</h2>

          <div class="options-list">
            <div v-for="(option, index) in gameStore.currentQuestion.options" :key="index" class="quiz-option" :class="{
              selected: gameStore.selectedAnswer === index,
              correct: gameStore.questionResult && gameStore.currentQuestion.correctIndex === index,
              wrong: gameStore.questionResult && gameStore.selectedAnswer === index && !gameStore.questionResult.correct
            }" @click="selectAnswer(index)">
              <span class="quiz-option-label">{{ optionLabels[index] }}</span>
              <span class="quiz-option-text">{{ option }}</span>
              <span v-if="gameStore.questionResult && gameStore.currentQuestion.correctIndex === index"
                class="correct-icon">✓</span>
            </div>
          </div>

          <div v-if="gameStore.answered" class="answered-status">
            <span class="check-icon">✓</span> 已作答
          </div>
        </div>

        <div v-else class="waiting-question animate-fadeIn">
          <div class="waiting-icon">📝</div>
          <h2>準備答題</h2>
          <p>等待下一題...</p>
        </div>
      </div>

      <!-- Finished -->
      <div v-else-if="gameStore.gamePhase === 'finished'" class="finished-screen">
        <div class="finished-content animate-scaleIn">
          <div class="trophy-icon">🏆</div>
          <h1>遊戲結束!</h1>
          <p>感謝參與</p>

          <div class="final-rankings">
            <div v-for="(team, index) in gameStore.teams?.slice(0, 3)" :key="team.id" class="ranking-item">
              <span class="rank-badge" :class="['gold', 'silver', 'bronze'][index]">
                {{ index + 1 }}
              </span>
              <span class="team-name">{{ team.name }}</span>
              <span class="team-score">{{ team.horsePower }} HP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()

// Join form
const nickname = ref('')
const selectedTeam = ref('')
const optionLabels = ['A', 'B', 'C', 'D']

// Teams from store or defaults
const teams = ref([
  { id: 'team1', name: '研發部', color: '#FF6B6B' },
  { id: 'team2', name: '設計部', color: '#4ECDC4' },
  { id: 'team3', name: '行銷部', color: '#45B7D1' },
  { id: 'team4', name: '業務部', color: '#96CEB4' },
  { id: 'team5', name: '人資部', color: '#FFEAA7' },
  { id: 'team6', name: '財務部', color: '#DDA0DD' }
])

// Device motion for shake detection
let lastAcceleration = { x: 0, y: 0, z: 0 }
const shakeThreshold = 15

function joinGame() {
  gameStore.joinGame(nickname.value, selectedTeam.value)
}

function handleTap() {
  if (gameStore.gamePhase === 'phase1' && gameStore.isRunning) {
    gameStore.sendAction('tap', 1)
  }
}

function handleShake(event) {
  if (gameStore.gamePhase !== 'phase1' || !gameStore.isRunning) return

  const acceleration = event.accelerationIncludingGravity
  if (!acceleration) return

  const deltaX = Math.abs(acceleration.x - lastAcceleration.x)
  const deltaY = Math.abs(acceleration.y - lastAcceleration.y)
  const deltaZ = Math.abs(acceleration.z - lastAcceleration.z)

  if (deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold) {
    const intensity = Math.max(deltaX, deltaY, deltaZ) / shakeThreshold
    gameStore.sendAction('shake', intensity)
  }

  lastAcceleration = { x: acceleration.x, y: acceleration.y, z: acceleration.z }
}

function selectAnswer(index) {
  if (!gameStore.answered) {
    gameStore.sendAnswer(index)
  }
}

onMounted(() => {
  // Request device motion permission (iOS 13+)
  if (typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function') {
    // iOS 13+ requires permission
    document.addEventListener('click', async () => {
      try {
        const permission = await DeviceMotionEvent.requestPermission()
        if (permission === 'granted') {
          window.addEventListener('devicemotion', handleShake)
        }
      } catch (e) {
        console.log('Device motion permission denied')
      }
    }, { once: true })
  } else {
    // Android or older iOS
    window.addEventListener('devicemotion', handleShake)
  }
})

onUnmounted(() => {
  window.removeEventListener('devicemotion', handleShake)
})
</script>

<style scoped>
.player-view {
  min-height: 100vh;
  min-height: 100dvh;
  /* Dynamic viewport height for mobile */
  background: var(--gradient-dark);
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

/* Join Screen */
.join-screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  padding-top: env(safe-area-inset-top, var(--spacing-lg));
  padding-bottom: env(safe-area-inset-bottom, var(--spacing-lg));
}

.join-card {
  width: 100%;
  max-width: 400px;
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-lg);
}

.join-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.game-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
}

.join-header h1 {
  font-size: 1.75rem;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.team-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--bg-card);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.team-btn:hover {
  border-color: var(--team-color);
}

.team-btn.selected {
  border-color: var(--team-color);
  background: rgba(255, 255, 255, 0.1);
}

.team-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.player-count {
  text-align: center;
  margin-top: var(--spacing-lg);
  color: var(--text-secondary);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.online {
  background: var(--success);
  box-shadow: 0 0 8px var(--success);
}

/* Game Screen */
.game-screen {
  min-height: 100vh;
  min-height: 100dvh;
}

/* Waiting Screen */
.waiting-screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-lg);
  padding-top: env(safe-area-inset-top, var(--spacing-lg));
  padding-bottom: env(safe-area-inset-bottom, var(--spacing-lg));
}

.waiting-icon {
  font-size: 5rem;
  margin-bottom: var(--spacing-lg);
}

.waiting-content h2 {
  font-size: 1.5rem;
  margin-bottom: var(--spacing-md);
}

.team-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  color: var(--text-secondary);
}

.team-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.waiting-hint {
  margin-top: var(--spacing-xl);
  padding: var(--spacing-md);
  background: var(--bg-card);
  border-radius: var(--border-radius-md);
}

.waiting-hint p {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* Phase 1 Screen */
.phase1-screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-lg);
  padding-top: env(safe-area-inset-top, var(--spacing-lg));
  padding-bottom: env(safe-area-inset-bottom, var(--spacing-lg));
}

.phase1-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.timer {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.timer.warning {
  color: var(--danger);
  animation: pulse 0.5s ease infinite;
}

.rank-display {
  color: var(--text-secondary);
  font-size: 1rem;
  margin-top: var(--spacing-md);
}

.rank-number {
  color: var(--accent-alt);
  font-weight: 700;
  font-size: 1.5rem;
}

.tap-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.tap-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tap-icon {
  font-size: 3rem;
}

.tap-text {
  font-size: 1.25rem;
  font-weight: 700;
}

.tap-hint {
  margin-top: var(--spacing-lg);
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.phase1-footer {
  padding: var(--spacing-md);
}

/* Phase 2 Screen */
.phase2-screen {
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--spacing-lg);
  padding-top: env(safe-area-inset-top, var(--spacing-lg));
  padding-bottom: env(safe-area-inset-bottom, var(--spacing-lg));
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.question-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.question-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.question-number {
  background: var(--gradient-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-full);
  font-weight: 700;
}

.question-type {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--border-radius-full);
  font-size: 0.875rem;
}

.question-type.star {
  background: linear-gradient(135deg, #F9CA24, #F0932B);
  color: #000;
}

.question-type.banana {
  background: linear-gradient(135deg, #FDCB6E, #E17055);
  color: #fff;
}

.question-text {
  font-size: 1.25rem;
  line-height: 1.4;
  margin-bottom: var(--spacing-lg);
  word-break: break-word;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.quiz-option-text {
  flex: 1;
}

.correct-icon {
  color: var(--success);
  font-size: 1.25rem;
  font-weight: 700;
}

.answered-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-xl);
  padding: var(--spacing-md);
  background: rgba(0, 184, 148, 0.2);
  border-radius: var(--border-radius-md);
  color: var(--success);
  font-weight: 600;
}

.check-icon {
  font-size: 1.25rem;
}

.waiting-question {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* Finished Screen */
.finished-screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  padding-top: env(safe-area-inset-top, var(--spacing-lg));
  padding-bottom: env(safe-area-inset-bottom, var(--spacing-lg));
  overflow-y: auto;
}

.finished-content {
  text-align: center;
}

.trophy-icon {
  font-size: 6rem;
  margin-bottom: var(--spacing-lg);
}

.finished-content h1 {
  font-size: 2rem;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--spacing-sm);
}

.final-rankings {
  margin-top: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-card);
  border-radius: var(--border-radius-md);
}

.team-name {
  flex: 1;
  font-weight: 600;
}

.team-score {
  color: var(--accent-alt);
  font-weight: 700;
}

/* Phase 1 Result Screen */
.result-screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  padding-top: env(safe-area-inset-top, var(--spacing-lg));
  padding-bottom: env(safe-area-inset-bottom, var(--spacing-lg));
  overflow-y: auto;
}

.result-content {
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.result-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-lg);
}

.result-content h1 {
  font-size: 1.75rem;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--spacing-xl);
}

.your-result {
  background: var(--bg-card);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.your-result p {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.rank-info {
  margin-top: var(--spacing-md);
}

.rank-highlight {
  color: var(--accent-alt);
  font-size: 1.5rem;
  font-weight: 700;
}

.top-players {
  margin-bottom: var(--spacing-xl);
}

.top-players h3 {
  margin-bottom: var(--spacing-md);
  color: var(--text-secondary);
}

.top-player-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-card);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-sm);
}

.top-player-item .player-name {
  flex: 1;
  text-align: left;
}

.top-player-item .player-score {
  color: var(--accent-alt);
  font-weight: 600;
}

.waiting-next {
  color: var(--text-muted);
  font-size: 0.875rem;
  animation: pulse 2s ease infinite;
}
</style>
