<template>
  <div class="big-screen" ref="screenContainer">
    <!-- Waiting Screen -->
    <div v-if="gameStore.gamePhase === 'waiting'" class="waiting-overlay waiting-bg">
      <div class="waiting-content">
        <div class="qr-section">
          <div v-for="team in teamsInfo" :key="team.id" class="qr-card" :style="{ '--team-color': team.color }">
            <div class="qr-wrapper">
              <QRCodeVue3 :value="getTeamUrl(team.id)" :size="180" :margin="2"
                :dotsOptions="{ color: team.color, type: 'rounded' }" :cornersSquareOptions="{ color: team.color }"
                :cornersDotOptions="{ color: team.color }" :backgroundOptions="{ color: '#ffffff' }" />
            </div>
            <div class="qr-team-info">
              <span class="team-dot"></span>
              <span class="team-name">{{ team.name }}</span>
            </div>
            <div class="team-count">{{ getTeamCount(team.id) }} 人</div>
          </div>
        </div>

        <div class="player-count-big">
          <span class="count-number">{{ gameStore.playerCount }}</span>
          <span class="count-label">位玩家已加入</span>
        </div>
      </div>
    </div>

    <!-- Round 1: Tap Race -->
    <div v-else-if="['round1', 'round1_countdown'].includes(gameStore.gamePhase)" class="race-overlay">
      <div class="race-header">
        <div class="round-badge">Round 1 - 點擊賽馬</div>
        <div class="race-timer">
          ⏱️ <span class="timer-value" :class="{ 'timer-warning': gameStore.roundTimeLeft <= 5 }">{{
            gameStore.roundTimeLeft }}</span>s
        </div>
        <div class="bonus-display" v-if="currentBonusStage > 0">
          🔥 BONUS x2
        </div>
      </div>

      <!-- Race Track -->
      <div class="race-track">
        <div class="track-bg">
          <div class="finish-line"></div>
        </div>

        <div v-for="horse in horses" :key="horse.id" class="horse-lane" :style="{ '--lane-index': horse.laneIndex }">
          <div class="lane-label">
            <span class="team-dot" :style="{ background: horse.color }"></span>
            {{ horse.name }}
          </div>
          <div class="horse-track-bar">
            <div class="horse-progress" :class="{ leading: horse.isLeading, finished: horse.isFinished }" :style="{
              width: horse.progress + '%',
              background: horse.color
            }">
              <img src="../assets/running_horse.png" class="horse-emoji" alt="horse" />
              <span v-if="horse.isFinished" class="finish-celebration">🎉</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Round 1 Result -->
    <div v-else-if="gameStore.gamePhase === 'round1_result'" class="result-overlay">
      <div class="result-content">
        <h1>🏁 Round 1 完成！</h1>

        <div class="team-results">
          <div v-for="(team, index) in sortedTeams" :key="team.id" class="team-result-card"
            :class="{ winner: index === 0 }" :style="{ '--team-color': team.color }">
            <div class="result-rank">{{ getRankEmoji(index) }}</div>
            <div class="team-info">
              <span class="team-name">{{ team.name }}</span>
              <span class="team-score">{{ team.round1Score }} 分</span>
            </div>
          </div>
        </div>

        <div class="leaderboard-section">
          <h2>🏆 個人積分榜</h2>
          <div class="leaderboard-grid">
            <div v-for="(player, index) in gameStore.leaderboard?.slice(0, 20)" :key="player.id"
              class="leaderboard-item" :class="getRankClass(index)">
              <span class="rank">{{ index + 1 }}</span>
              <span class="player-id">{{ player.employeeId }}</span>
              <span class="player-score">{{ player.score }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Round 2 Warmup -->
    <div v-else-if="gameStore.gamePhase === 'round2_warmup'" class="warmup-overlay">
      <div class="warmup-content">
        <div class="warmup-icon">📱</div>
        <h1>Round 2 即將開始</h1>
        <p class="warmup-hint">請開啟手機感應器權限</p>
      </div>
    </div>

    <!-- Round 2: Shake Race -->
    <div v-else-if="['round2', 'round2_countdown'].includes(gameStore.gamePhase)" class="race-overlay">
      <div class="race-header">
        <div class="round-badge">Round 2 - 搖晃賽馬</div>
        <div class="race-timer">
          ⏱️ <span class="timer-value" :class="{ 'timer-warning': gameStore.roundTimeLeft <= 5 }">{{
            gameStore.roundTimeLeft }}</span>s
        </div>
        <div class="motion-hint">
          {{ currentMotionType === 'twist' ? '🔄 搖晃手機' : '⬆️ 上下搖晃' }}
        </div>
        <div class="bonus-display" v-if="currentBonusStage > 0">
          🔥 BONUS x2
        </div>
      </div>

      <!-- Race Track -->
      <div class="race-track">
        <div class="track-bg">
          <div class="finish-line"></div>
        </div>

        <div v-for="horse in horsesRound2" :key="horse.id" class="horse-lane"
          :style="{ '--lane-index': horse.laneIndex }">
          <div class="lane-label">
            <span class="team-dot" :style="{ background: horse.color }"></span>
            {{ horse.name }}
          </div>
          <div class="horse-track-bar">
            <div class="horse-progress" :class="{ leading: horse.isLeading, finished: horse.isFinished }" :style="{
              width: horse.progress + '%',
              background: horse.color
            }">
              <img src="../assets/running_horse.png" class="horse-emoji" alt="horse" />
              <span v-if="horse.isFinished" class="finish-celebration">🎉</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 2: Quiz Game Overlay -->
    <div v-else-if="['phase2', 'phase2_question', 'phase2_reveal'].includes(gameStore.gamePhase)" class="quiz-overlay">
      <div class="quiz-content">
        <h1 class="phase-title">第二階段：伯樂與千里馬</h1>

        <div v-if="gameStore.phase2Question" class="question-container">
          <div class="q-type-badge" v-if="questionTypeName">
            {{ questionTypeName }}
          </div>
          <h2 class="question-text">
            <span class="q-number">Q{{ gameStore.phase2Question.questionNumber + 1 }}</span>
            {{ gameStore.phase2Question.text }}
          </h2>

          <div class="options-grid">
            <div v-for="(opt, idx) in gameStore.phase2Question.options" :key="idx" class="option-card" :class="{
              'correct': gameStore.gamePhase === 'phase2_reveal' && gameStore.phase2Result?.correctIndex === idx,
              'wrong': gameStore.gamePhase === 'phase2_reveal' && gameStore.phase2Result?.correctIndex !== idx
            }">

              <div class="option-content">
                <span class="option-label">{{ ['A', 'B', 'C', 'D'][idx] }}</span>
                <span class="option-text">{{ opt }}</span>
              </div>

              <!-- 5秒後顯示的長條圖與人數 -->
              <div class="stat-bar-container" :class="{ 'show': showQuizStats }">
                <div class="stat-bar-bg">
                  <div class="stat-bar-fill" :style="{ width: getOptionPercentage(idx) + '%' }"></div>
                  <span class="stat-count">{{ getOptionCount(idx) }} 人</span>
                </div>
              </div>
            </div>
          </div>

          <div class="quiz-footer">
            <div class="timer" v-if="gameStore.gamePhase === 'phase2_question'">
              ⏱️ 剩餘時間：<span class="time-value">{{ timeLeft }}</span> s
            </div>
            <div class="answer-count">
              👥 實時作答人數：{{ gameStore.phase2Stats?.answered || 0 }} / {{ gameStore.playerCount || 0 }}
            </div>
          </div>
        </div>

        <div v-else class="waiting-quiz">
          <h2>準備進入下一題...</h2>
        </div>
      </div>
    </div>

    <!-- Phase 2 Complete Rankings (Individual) -->
    <div v-else-if="gameStore.gamePhase === 'phase2_end'" class="result-overlay final phase2-final">
      <div class="result-content">
        <h1>🏆 問答遊戲 英雄榜</h1>

        <div class="leaderboard-section">
          <h2>個人總積分前 20 名</h2>
          <div class="leaderboard-grid phase2-grid">
            <div v-for="(player, index) in gameStore.phase2Rankings?.slice(0, 20)" :key="index"
              class="leaderboard-item phase2-item" :class="getRankClass(index)">
              <span class="rank">{{ index + 1 }}</span>
              <span class="player-id">{{ player.employeeId }}</span>
              <span class="player-score">{{ player.score }} 分</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Round 2 Result (same layout as Round 1) -->
    <div v-else-if="gameStore.gamePhase === 'round2_result'" class="result-overlay">
      <div class="result-content">
        <h1>🏁 Round 2 完成！</h1>

        <div class="team-results">
          <div v-for="(team, index) in sortedRound2Teams" :key="team.id" class="team-result-card"
            :class="{ winner: index === 0 }" :style="{ '--team-color': team.color }">
            <div class="result-rank">{{ getRankEmoji(index) }}</div>
            <div class="team-info">
              <span class="team-name">{{ team.name }}</span>
              <span class="team-score">{{ team.round2Score }} 分</span>
            </div>
          </div>
        </div>

        <div class="leaderboard-section">
          <h2>🏆 Round 2 排行榜</h2>
          <div class="leaderboard-grid">
            <div v-for="(player, index) in gameStore.leaderboard?.slice(0, 20)" :key="player.id"
              class="leaderboard-item" :class="getRankClass(index)">
              <span class="rank">{{ index + 1 }}</span>
              <span class="player-id">{{ player.employeeId }}</span>
              <span class="player-score">{{ player.score }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Final Result (total scores with podium background) -->
    <div v-else-if="gameStore.gamePhase === 'final_result'" class="final-result-podium">
      <!-- Background image fills the entire screen -->
      <img src="../assets/leaderboard_bg.png" class="podium-bg-img" alt="leaderboard background" />

      <!-- Horse images placed at exact podium positions (based on 1920x1080 reference) -->
      <!-- 1st place: center (x=505, y=590) -->
      <div v-if="sortedTotalTeams[0]" class="podium-horse-slot" :style="{
        left: ((515 - 170) / 1920 * 100) + '%',
        top: ((520 - 384) / 1080 * 100) + '%'
      }">
        <div class="podium-team-name" :style="{ color: sortedTotalTeams[0].color }">
          {{ sortedTotalTeams[0].name }}
        </div>
        <img src="../assets/podium_horse.png" class="podium-horse-img" alt="1st place horse" />
      </div>

      <!-- 2nd place: left (x=227, y=701) -->
      <div v-if="sortedTotalTeams[1]" class="podium-horse-slot" :style="{
        left: ((217 - 170) / 1920 * 100) + '%',
        top: ((631 - 384) / 1080 * 100) + '%'
      }">
        <div class="podium-team-name" :style="{ color: sortedTotalTeams[1].color }">
          {{ sortedTotalTeams[1].name }}
        </div>
        <img src="../assets/podium_horse.png" class="podium-horse-img" alt="2nd place horse" />
      </div>

      <!-- 3rd place: right (x=780, y=800) -->
      <div v-if="sortedTotalTeams[2]" class="podium-horse-slot" :style="{
        left: ((790 - 170) / 1920 * 100) + '%',
        top: ((730 - 384) / 1080 * 100) + '%'
      }">
        <div class="podium-team-name" :style="{ color: sortedTotalTeams[2].color }">
          {{ sortedTotalTeams[2].name }}
        </div>
        <img src="../assets/podium_horse.png" class="podium-horse-img" alt="3rd place horse" />
      </div>

      <!-- Personal Leaderboard: anchored at (1060, 60) on 1920x1080 grid -->
      <div class="podium-leaderboard" :style="{
        left: (1060 / 1920 * 100) + '%',
        top: (60 / 1080 * 100) + '%'
      }">
        <div class="podium-lb-title">🏆 個人總積分榜</div>
        <div v-for="(player, index) in gameStore.leaderboard?.slice(0, 20)" :key="player.id" class="podium-lb-row"
          :class="getRankClass(index)">
          <span class="podium-lb-rank">{{ index + 1 }}</span>
          <span class="podium-lb-name">{{ player.employeeId }}</span>
          <span class="podium-lb-score">{{ player.score }}</span>
        </div>
      </div>
    </div>

    <!-- 倒數覆蓋層 -->
    <transition name="countdown-fade">
      <div v-if="gameStore.countdownValue !== null" class="countdown-overlay">
        <div class="countdown-content">
          <div class="countdown-label">倒數</div>
          <div class="countdown-number" :key="gameStore.countdownValue">
            {{ gameStore.countdownValue }}
          </div>
          <div class="countdown-label">開始</div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from '../stores/game'
import QRCodeVue3 from 'qrcode.vue'

const gameStore = useGameStore()
const screenContainer = ref(null)

// Teams info
const teamsInfo = [
  { id: 'blue', name: 'Team Jack', color: '#3B82F6' },
  { id: 'yellow', name: 'Team Iris', color: '#EAB308' },
  { id: 'red', name: 'Team Jason', color: '#EF4444' }
]

// Generate QR code URL for each team
function getTeamUrl(teamId) {
  const baseUrl = window.location.origin
  return `${baseUrl}/player?team=${teamId}`
}

// Current bonus state
const currentBonusStage = computed(() => gameStore.bonusStage)
const currentMotionType = computed(() => gameStore.motionType)

// Round 1 horses (from teams data)
const horses = computed(() => {
  const targetScore = gameStore.settings?.round1TargetScore || 40000
  const teamsData = gameStore.teams || []
  const maxScore = Math.max(...teamsData.map(t => t.round1Score || 0), 0)

  return teamsData.map((team, index) => {
    const score = team.round1Score || 0
    return {
      id: team.id,
      name: team.name,
      color: team.color,
      score,
      progress: Math.min(score / targetScore * 100, 100),
      laneIndex: index,
      isLeading: score > 0 && score === maxScore,
      isFinished: score >= targetScore
    }
  })
})

// Round 2 horses
const horsesRound2 = computed(() => {
  const targetScore = gameStore.settings?.round2TargetScore || 25000
  const teamsData = gameStore.teams || []
  const maxScore = Math.max(...teamsData.map(t => t.round2Score || 0), 0)

  return teamsData.map((team, index) => {
    const score = team.round2Score || 0
    return {
      id: team.id,
      name: team.name,
      color: team.color,
      score,
      progress: Math.min(score / targetScore * 100, 100),
      laneIndex: index,
      isLeading: score > 0 && score === maxScore,
      isFinished: score >= targetScore
    }
  })
})

// Sorted by round1 score
const sortedTeams = computed(() => {
  return [...(gameStore.teams || [])].sort((a, b) => (b.round1Score || 0) - (a.round1Score || 0))
})

// Sorted by total score
const sortedTotalTeams = computed(() => {
  return [...(gameStore.teams || [])].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
})

// Sorted by round2 score
const sortedRound2Teams = computed(() => {
  return [...(gameStore.teams || [])].sort((a, b) => (b.round2Score || 0) - (a.round2Score || 0))
})

function getTeamCount(teamId) {
  const team = gameStore.teams?.find(t => t.id === teamId)
  return team?.playerCount || 0
}

function getRankEmoji(index) {
  const emojis = ['🥇', '🥈', '🥉']
  return emojis[index] || `${index + 1}`
}

function getRankClass(index) {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return ''
}

// Phase 2 Quiz state
const showQuizStats = ref(false)
const timeLeft = ref(0)
let timerInterval = null
let statsTimeout = null

const questionTypeName = computed(() => {
  const t = gameStore.phase2Question?.customType || 'star'
  if (t === 'coin') return '💰 金幣題 (前100名答對+1)'
  if (t === 'shell') return '🐢 龜殼題 (答錯-1)'
  return '⭐ 無敵星星題 (答對+1)'
})

watch(() => gameStore.phase2Question, (newQ) => {
  if (newQ) {
    showQuizStats.value = false
    timeLeft.value = newQ.timeLimit || 15

    clearInterval(timerInterval)
    clearTimeout(statsTimeout)

    // Countdown
    timerInterval = setInterval(() => {
      if (timeLeft.value > 0) timeLeft.value--
    }, 1000)

    // Show stats after 5 seconds
    statsTimeout = setTimeout(() => {
      showQuizStats.value = true
    }, 5000)
  }
})

function getOptionCount(idx) {
  return gameStore.phase2Stats?.distribution?.[idx] || 0
}

function getOptionPercentage(idx) {
  const count = getOptionCount(idx)
  const total = gameStore.playerCount || 1
  return total > 0 ? (count / total) * 100 : 0
}

onMounted(() => {
  gameStore.connect()
  gameStore.joinAsScreen()
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (statsTimeout) clearTimeout(statsTimeout)
})
</script>

<style scoped>
.big-screen {
  width: 100vw;
  height: 100vh;
  background: var(--gradient-dark);
  overflow: hidden;
}

/* Waiting Screen */
.waiting-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.waiting-bg {
  background-image: url('../assets/game_bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.waiting-content {
  text-align: center;
}

.event-title {
  font-size: 5rem;
  font-weight: 900;
  margin-bottom: var(--spacing-md);
  background: linear-gradient(135deg, #fff, #a0a0a0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.event-subtitle {
  font-size: 2rem;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
}

.scan-hint {
  font-size: 1.5rem;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xl);
}

/* QR Code Section */
.qr-section {
  display: flex;
  justify-content: center;
  gap: var(--spacing-2xl);
  margin-bottom: var(--spacing-xl);
  margin-top: 15vh;
}

.qr-card {
  padding: var(--spacing-lg);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius-lg);
  border: 3px solid var(--team-color);
  text-align: center;
}

.qr-wrapper {
  padding: var(--spacing-md);
  background: white;
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-md);
}

.qr-team-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.qr-card .team-name {
  font-size: 1.5rem;
  font-weight: 700;
}

.qr-card .team-count {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--team-color);
}

.teams-preview {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-2xl);
}

.team-preview-card {
  padding: var(--spacing-lg) var(--spacing-xl);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius-lg);
  border: 2px solid var(--team-color);
  min-width: 200px;
}

.team-preview-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.team-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--team-color);
}

.team-preview-card .team-name {
  font-size: 1.5rem;
  font-weight: 700;
}

.team-count {
  font-size: 2rem;
  font-weight: 900;
  color: var(--team-color);
}

.player-count-big {
  margin-top: var(--spacing-xl);
}

.count-number {
  font-size: 6rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.count-label {
  display: block;
  font-size: 1.5rem;
  color: var(--text-secondary);
}

/* Race Overlay */
.race-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-xl);
}

.race-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.round-badge {
  font-size: 2rem;
  font-weight: 900;
  padding: var(--spacing-md) var(--spacing-xl);
  background: linear-gradient(135deg, #6C5CE7, #a29bfe);
  border-radius: var(--border-radius-full);
}

.motion-hint {
  font-size: 1.5rem;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-full);
}

.bonus-display {
  font-size: 1.5rem;
  font-weight: 700;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-radius: var(--border-radius-full);
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}

.race-timer {
  font-size: 2rem;
  font-weight: 900;
  padding: var(--spacing-sm) var(--spacing-xl);
  background: rgba(0, 0, 0, 0.4);
  border-radius: var(--border-radius-full);
  min-width: 120px;
  text-align: center;
}

.timer-value {
  font-variant-numeric: tabular-nums;
}

.timer-value.timer-warning {
  color: #ff6b6b;
  animation: pulse 0.5s ease-in-out infinite;
}

/* Race Track */
.race-track {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3.5rem;
  position: relative;
}

.track-bg {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--border-radius-lg);
}

.finish-line {
  position: absolute;
  right: 5%;
  top: 0;
  bottom: 0;
  width: 4px;
  background: repeating-linear-gradient(to bottom,
      white 0px,
      white 10px,
      black 10px,
      black 20px);
}

.horse-lane {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: 2.5rem var(--spacing-lg) 0.5rem;
  position: relative;
  z-index: 1;
}

.lane-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 120px;
  font-size: 1.25rem;
  font-weight: 700;
}

.horse-track-bar {
  flex: 1;
  height: 100px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: var(--border-radius-full);
  overflow: visible;
  position: relative;
}

.horse-progress {
  height: 100%;
  border-radius: var(--border-radius-full);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  transition: width 0.3s ease-out;
  min-width: 80px;
  position: relative;
  overflow: visible;
}

/* Leading team pulse effect */
.horse-progress.leading {
  animation: leading-pulse 1s ease-in-out infinite;
  box-shadow: 0 0 20px currentColor;
}

@keyframes leading-pulse {

  0%,
  100% {
    opacity: 1;
    transform: scaleY(1);
  }

  50% {
    opacity: 0.85;
    transform: scaleY(1.05);
  }
}

/* Finished team celebration */
.horse-progress.finished {
  animation: finish-glow 0.5s ease-out forwards;
  box-shadow: 0 0 30px currentColor, 0 0 60px currentColor;
}

@keyframes finish-glow {
  0% {
    box-shadow: 0 0 20px currentColor;
  }

  50% {
    box-shadow: 0 0 50px currentColor, 0 0 100px currentColor;
  }

  100% {
    box-shadow: 0 0 30px currentColor, 0 0 60px currentColor;
  }
}

.finish-celebration {
  font-size: 2rem;
  animation: celebration-bounce 0.5s ease-out infinite;
  margin-left: var(--spacing-sm);
}

@keyframes celebration-bounce {

  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  50% {
    transform: translateY(-10px) scale(1.2);
  }
}

.horse-emoji {
  height: 90px;
  width: auto;
  display: inline-block;
  position: absolute;
  right: -1rem;
  bottom: 50%;
  transform: translateY(35%);
  filter: drop-shadow(0 -4px 8px rgba(0, 0, 0, 0.5));
  z-index: 10;
}

/* Warmup Overlay */
.warmup-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.warmup-content {
  text-align: center;
}

.warmup-icon {
  font-size: 6rem;
  animation: twist-rotate 1s ease-in-out infinite;
  margin-bottom: var(--spacing-xl);
}

@keyframes twist-rotate {

  0%,
  100% {
    transform: rotate(-20deg);
  }

  50% {
    transform: rotate(20deg);
  }
}

.warmup-content h1 {
  font-size: 3rem;
  margin-bottom: var(--spacing-lg);
}

.warmup-hint {
  font-size: 1.5rem;
  color: var(--text-secondary);
}

/* Result Overlay */
.result-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: var(--spacing-xl);
}

.result-content {
  max-width: 1200px;
  width: 100%;
  text-align: center;
}

.result-content h1 {
  font-size: 3rem;
  margin-bottom: var(--spacing-xl);
}

.team-results {
  display: flex;
  justify-content: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-2xl);
}

.team-result-card {
  padding: var(--spacing-lg) var(--spacing-xl);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius-lg);
  border: 2px solid var(--team-color);
  min-width: 200px;
}

.team-result-card.winner {
  transform: scale(1.1);
  background: rgba(255, 215, 0, 0.1);
}

.result-rank {
  font-size: 3rem;
  margin-bottom: var(--spacing-sm);
}

.team-info .team-name {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
}

.team-info .team-score {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--team-color);
}

/* Leaderboard */
.leaderboard-section {
  margin-top: var(--spacing-xl);
}

.leaderboard-section h2 {
  font-size: 2.25rem;
  margin-bottom: var(--spacing-xl);
}

.leaderboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  max-width: 1200px;
  margin: 0 auto;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius-md);
  font-size: 1.4rem;
}

.leaderboard-item.gold {
  background: rgba(255, 215, 0, 0.2);
}

.leaderboard-item.silver {
  background: rgba(192, 192, 192, 0.2);
}

.leaderboard-item.bronze {
  background: rgba(205, 127, 50, 0.2);
}

.leaderboard-item .rank {
  min-width: 36px;
  font-weight: 700;
  font-size: 1.5rem;
}

.leaderboard-item .player-id {
  flex: 1;
  text-align: left;
}

.leaderboard-item .player-score {
  font-weight: 700;
  color: var(--primary);
}

/* Podium */
.podium {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-2xl);
}

.podium-place {
  text-align: center;
  min-width: 150px;
}

.podium-emoji {
  font-size: 4rem;
  margin-bottom: var(--spacing-sm);
}

.podium-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
}

.podium-score {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--primary);
  margin-bottom: var(--spacing-sm);
}

/* Phase 2 Quiz */
.quiz-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
}

.quiz-content {
  max-width: 1200px;
  width: 100%;
  text-align: center;
}

.phase-title {
  font-size: 2.5rem;
  margin-bottom: var(--spacing-md);
  color: var(--text-secondary);
}

.q-type-badge {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-lg);
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--border-radius-full);
  font-size: 1.5rem;
  font-weight: bold;
  color: #FACC15;
  margin-bottom: var(--spacing-lg);
}

/* Phase 2 Individual Leaderboard Adjustments */
.phase2-final .result-content {
  max-width: 1200px;
}

.phase2-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.phase2-item {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: 1.4rem;
}

.phase2-item .rank {
  font-size: 1.25rem;
  width: 40px;
  height: 40px;
}

.question-text {
  font-size: 3rem;
  font-weight: 900;
  margin-bottom: var(--spacing-2xl);
  line-height: 1.3;
}

.q-number {
  color: var(--primary);
  margin-right: var(--spacing-sm);
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-2xl);
}

.option-card {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  text-align: left;
  overflow: hidden;
  transition: all 0.3s ease;
  min-height: 140px;
}

.option-card.correct {
  background: rgba(0, 184, 148, 0.2);
  border-color: var(--success);
  box-shadow: 0 0 30px rgba(0, 184, 148, 0.3);
}

.option-card.wrong {
  opacity: 0.5;
}

.option-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.option-label {
  font-size: 2rem;
  font-weight: 900;
  color: var(--primary);
  background: rgba(255, 255, 255, 0.1);
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-sm);
  flex-shrink: 0;
}

.option-text {
  font-size: 2rem;
  font-weight: 700;
}

.stat-bar-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
}

.stat-bar-container.show {
  opacity: 1;
}

.stat-bar-bg {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 20px;
  background: rgba(0, 0, 0, 0.3);
}

.stat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-count {
  position: absolute;
  right: var(--spacing-xl);
  top: -60px;
  font-size: 3rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.quiz-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--border-radius-lg);
}

.timer {
  font-size: 2rem;
  font-weight: 700;
}

.time-value {
  color: var(--warning);
  font-size: 2.5rem;
}

.answer-count {
  font-size: 2rem;
  font-weight: 700;
}

.waiting-quiz h2 {
  font-size: 3rem;
  color: var(--text-secondary);
  animation: pulse 2s infinite ease-in-out;
}

/* ========== 倒數覆蓋層 ========== */
.countdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.2) 40%, transparent 70%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  mask-image: radial-gradient(ellipse at center, black 0%, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 0%, black 30%, transparent 70%);
}

.countdown-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.countdown-label {
  font-size: 4.5rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, #fff 0%, #a0a0ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  line-height: 1;
}

.countdown-number {
  font-size: 22rem;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #6C5CE7, #fd79a8, #fdcb6e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 60px rgba(108, 92, 231, 0.8));
  animation: countdown-pop 1s ease-out;
}

@keyframes countdown-pop {
  0% {
    transform: scale(1.6);
    opacity: 0;
  }

  40% {
    transform: scale(0.95);
    opacity: 1;
  }

  70% {
    transform: scale(1.05);
  }

  100% {
    transform: scale(1);
  }
}

/* Fade transition */
.countdown-fade-enter-active,
.countdown-fade-leave-active {
  transition: opacity 0.4s ease;
}

.countdown-fade-enter-from,
.countdown-fade-leave-to {
  opacity: 0;
}

/* Final Result Podium with Background Image */
.final-result-podium {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.podium-bg-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.podium-horse-slot {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
  /* Width matches horse image width as % of 1920 */
  width: calc(340 / 1920 * 100%);
}

.podium-horse-img {
  width: 100%;
  height: auto;
  display: block;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
}

.podium-team-name {
  font-size: clamp(1.8rem, 3vw, 3.2rem);
  font-weight: 900;
  text-align: center;
  margin-bottom: 0.3em;
  text-shadow:
    0 0 8px rgba(0, 0, 0, 0.9),
    0 2px 4px rgba(0, 0, 0, 0.8),
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000;
  white-space: nowrap;
  letter-spacing: 0.03em;
}

/* Podium leaderboard panel */
.podium-leaderboard {
  position: absolute;
  z-index: 3;
  width: calc(860 / 1920 * 100%);
  /* fills from x=1060 to right edge ~1920 with some padding */
  background: rgba(0, 0, 0, 0.55);
  border-radius: 12px;
  padding: clamp(6px, 1vw, 14px) clamp(8px, 1.2vw, 18px);
  backdrop-filter: blur(6px);
}

.podium-lb-title {
  font-size: clamp(1.5rem, 2.6vw, 2.8rem);
  font-weight: 900;
  text-align: center;
  margin-bottom: 0.4em;
  color: #FFD700;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  letter-spacing: 0.05em;
}

.podium-lb-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.18em 0.4em;
  border-radius: 6px;
  font-size: clamp(1.3rem, 2.1vw, 2.2rem);
  font-weight: 600;
  color: #fff;
}

.podium-lb-row.gold {
  background: rgba(255, 215, 0, 0.25);
}

.podium-lb-row.silver {
  background: rgba(192, 192, 192, 0.2);
}

.podium-lb-row.bronze {
  background: rgba(205, 127, 50, 0.2);
}

.podium-lb-rank {
  min-width: 1.6em;
  font-weight: 800;
  text-align: right;
  color: #ddd;
}

.podium-lb-name {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.podium-lb-score {
  font-weight: 800;
  color: #FFD700;
  min-width: 2.5em;
  text-align: right;
}
</style>
