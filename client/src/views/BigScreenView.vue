<template>
  <div class="big-screen" ref="screenContainer">
    <!-- Waiting Screen -->
    <div v-if="gameStore.gamePhase === 'waiting'" class="waiting-overlay">
      <div class="waiting-content">
        <h1 class="event-title">🏇 2026 Spring Gala</h1>
        <h2 class="event-subtitle">數位賽馬大賽</h2>

        <p class="scan-hint">📱 掃描 QR Code 加入隊伍</p>

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
    <div v-else-if="gameStore.gamePhase === 'round1'" class="race-overlay">
      <div class="race-header">
        <div class="round-badge">Round 1 - 點擊賽馬</div>
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
              <span class="horse-emoji">🏇</span>
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

    <!-- Round 2: Shake Race -->
    <div v-else-if="gameStore.gamePhase === 'round2'" class="race-overlay">
      <div class="race-header">
        <div class="round-badge">Round 2 - 搖晃賽馬</div>
        <div class="motion-hint">
          {{ currentMotionType === 'twist' ? '🔄 扭轉手機' : '⬆️ 上下搖晃' }}
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
              <span class="horse-emoji">🏇</span>
              <span v-if="horse.isFinished" class="finish-celebration">🎉</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Round 2 / Final Result -->
    <div v-else-if="gameStore.gamePhase === 'round2_result'" class="result-overlay final">
      <div class="result-content">
        <h1>🏆 最終結果</h1>

        <!-- Podium -->
        <div class="podium">
          <div class="podium-place second" v-if="sortedTotalTeams[1]">
            <div class="podium-emoji">🥈</div>
            <div class="podium-name">{{ sortedTotalTeams[1].name }}</div>
            <div class="podium-score"></div>
            <div class="podium-stand"></div>
          </div>
          <div class="podium-place first" v-if="sortedTotalTeams[0]">
            <div class="podium-emoji">🥇</div>
            <div class="podium-name">{{ sortedTotalTeams[0].name }}</div>
            <div class="podium-score"></div>
            <div class="podium-stand"></div>
          </div>
          <div class="podium-place third" v-if="sortedTotalTeams[2]">
            <div class="podium-emoji">🥉</div>
            <div class="podium-name">{{ sortedTotalTeams[2].name }}</div>
            <div class="podium-score"></div>
            <div class="podium-stand"></div>
          </div>
        </div>

        <div class="leaderboard-section">
          <h2>🏆 個人總積分榜</h2>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useGameStore } from '../stores/game'
import QRCodeVue3 from 'qrcode.vue'

const gameStore = useGameStore()
const screenContainer = ref(null)

// Teams info
const teamsInfo = [
  { id: 'blue', name: '藍隊', color: '#3B82F6' },
  { id: 'yellow', name: '黃隊', color: '#EAB308' },
  { id: 'red', name: '紅隊', color: '#EF4444' }
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

onMounted(() => {
  gameStore.connect()
  gameStore.joinAsScreen()
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

/* Race Track */
.race-track {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-xl);
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
  padding: var(--spacing-md) var(--spacing-lg);
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
  height: 60px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-full);
  overflow: hidden;
  position: relative;
}

.horse-progress {
  height: 100%;
  border-radius: var(--border-radius-full);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: var(--spacing-sm);
  transition: width 0.3s ease-out;
  min-width: 60px;
  position: relative;
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
  font-size: 2.5rem;
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
  font-size: 1.5rem;
  margin-bottom: var(--spacing-lg);
}

.leaderboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
  max-width: 1000px;
  margin: 0 auto;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius-sm);
  font-size: 0.9rem;
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
  min-width: 24px;
  font-weight: 700;
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

.podium-stand {
  width: 100%;
  background: linear-gradient(135deg, #444, #222);
  border-radius: var(--border-radius-md) var(--border-radius-md) 0 0;
}

.podium-place.first .podium-stand {
  height: 120px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
}

.podium-place.second .podium-stand {
  height: 80px;
  background: linear-gradient(135deg, #C0C0C0, #A0A0A0);
}

.podium-place.third .podium-stand {
  height: 50px;
  background: linear-gradient(135deg, #CD7F32, #A0522D);
}
</style>
