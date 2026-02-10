<template>
  <div class="player-view no-select" :class="teamClass">
    <!-- Team color gradient borders with breathing effect -->
    <div class="team-border top" :style="teamBorderStyle"></div>
    <div class="team-border bottom" :style="teamBorderStyle"></div>

    <!-- Join Screen -->
    <div v-if="!gameStore.player" class="join-screen">
      <div class="join-card card-glass" v-animate="'fadeIn'">
        <div class="join-header">
          <div class="game-icon">🏇</div>
          <h1>加入遊戲</h1>
        </div>

        <form @submit.prevent="joinGame" class="join-form">
          <div class="form-group">
            <label>員工編號</label>
            <input v-model="employeeId" class="input" placeholder="輸入你的員工編號" maxlength="20" required />
          </div>

          <!-- Team display (from QR code) -->
          <div class="team-preview" v-if="urlTeamId">
            <span class="team-dot" :style="{ background: getTeamColor(urlTeamId) }"></span>
            <span class="team-name">{{ getTeamName(urlTeamId) }}</span>
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
        <div class="waiting-content" v-animate="'fadeIn'">
          <div class="waiting-icon" ref="waitingIconRef">⏳</div>
          <h2>等待遊戲開始</h2>
          <p class="team-info">
            <span class="team-dot" :style="{ background: gameStore.team?.color }"></span>
            {{ gameStore.team?.name }} · {{ gameStore.player?.employeeId }}
          </p>
          <div class="waiting-hint">
            <p>遊戲即將開始，請注意大螢幕！</p>
          </div>
        </div>
      </div>

      <!-- Round 1: Tap Mode -->
      <div v-else-if="gameStore.gamePhase === 'round1'" class="round1-screen">
        <div class="round-header">
          <div class="round-badge">Round 1</div>
          <div class="score-display" ref="scoreDisplayRef">
            {{ gameStore.score }}
            <span class="score-label">分</span>
          </div>
          <div class="bonus-indicator" v-if="gameStore.bonusStage > 0">
            🔥 BONUS x2
          </div>
        </div>

        <div class="tap-area">
          <div class="tap-button btn-game" ref="tapButtonRef" :class="buttonPositionClass" @click="handleTap"
            @touchstart.prevent="handleTap">
            <span class="tap-icon">👆</span>
            <span class="tap-text">{{ gameStore.bonusStage > 0 ? '加倍得分!' : '瘋狂點擊!' }}</span>
          </div>
        </div>

        <div class="round-footer">
          <div class="team-info">
            <span class="team-dot" :style="{ background: gameStore.team?.color }"></span>
            {{ gameStore.team?.name }}
          </div>
        </div>
      </div>

      <!-- Round 1 Result -->
      <div v-else-if="gameStore.gamePhase === 'round1_result'" class="result-screen">
        <div class="result-content" v-animate="'scaleIn'">
          <div class="result-icon">🏁</div>
          <h1>Round 1 結束！</h1>

          <div class="your-result">
            <p>你的分數</p>
            <div class="score-display">{{ gameStore.score }}</div>
          </div>

          <div class="top-players">
            <h3>🏆 個人積分榜</h3>
            <div v-for="(player, index) in gameStore.leaderboard?.slice(0, 5)" :key="player.id" class="top-player-item">
              <span class="rank-badge" :class="getRankClass(index)">{{ index + 1 }}</span>
              <span class="player-name">{{ player.employeeId }}</span>
              <span class="player-score">{{ player.score }}</span>
            </div>
          </div>

          <p class="waiting-next">等待 Round 2 開始...</p>
        </div>
      </div>

      <!-- Round 2 Warmup: Motion Permission -->
      <div v-else-if="gameStore.gamePhase === 'round2_warmup'" class="warmup-screen">
        <div class="warmup-content" v-animate="'fadeIn'">
          <div class="warmup-icon">📱</div>
          <h1>Round 2 準備</h1>
          <p class="warmup-desc">下一回合需要搖晃手機得分</p>

          <!-- Permission not granted yet -->
          <div v-if="!motionPermissionGranted" class="permission-section">
            <button class="btn btn-primary btn-large" @click="requestMotionPermission"
              :disabled="permissionStatus === 'requesting'">
              {{ permissionStatus === 'requesting' ? '授權中...' : '點此授權搖晃功能 📳' }}
            </button>
            <p class="permission-hint" v-if="permissionStatus === 'denied'">
              ⚠️ 授權被拒絕，請在設定中允許動態感測器權限
            </p>
            <p class="permission-hint" v-else>
              iOS 用戶需點擊上方按鈕授權
            </p>
          </div>

          <!-- Permission granted - show shake test -->
          <div v-else class="shake-test-section">
            <div class="permission-success">✅ 已授權！試試搖晃手機</div>
            <div class="shake-test" :class="{ active: testShakeActive }" ref="shakeTestRef">
              <div class="phone-icon">📱</div>
              <div class="test-count">{{ testShakeCount }}</div>
              <div class="test-label">次</div>
            </div>
            <p class="test-hint">看到數字增加就表示感測器正常運作！</p>
          </div>

          <div class="team-info">
            <span class="team-dot" :style="{ background: gameStore.team?.color }"></span>
            {{ gameStore.team?.name }}
          </div>
        </div>
      </div>

      <!-- Round 2: Shake Mode -->
      <div v-else-if="gameStore.gamePhase === 'round2'" class="round2-screen">
        <div class="round-header">
          <div class="round-badge">Round 2</div>
          <div class="score-display" ref="scoreDisplayRef">
            {{ gameStore.score }}
            <span class="score-label">分</span>
          </div>
          <div class="bonus-indicator" v-if="gameStore.bonusStage > 0">
            🔥 BONUS x2
          </div>
        </div>

        <div class="shake-area">
          <div class="twist-animation">
            <div class="twist-phone">📱</div>
          </div>
          <div class="shake-text">
            {{ gameStore.bonusStage > 0 ? '🔥 BONUS x2 - 繼續搖晃!' : '搖晃手機得分！' }}
          </div>
        </div>

        <div class="round-footer">
          <div class="team-info">
            <span class="team-dot" :style="{ background: gameStore.team?.color }"></span>
            {{ gameStore.team?.name }}
          </div>
        </div>
      </div>

      <!-- Round 2 Result / Final Result -->
      <div v-else-if="gameStore.gamePhase === 'round2_result'" class="result-screen">
        <div class="result-content" v-animate="'scaleIn'">
          <div class="result-icon">🏆</div>
          <h1>最終積分榜</h1>

          <div class="your-result">
            <p>你的總分</p>
            <div class="score-display">{{ gameStore.totalScore }}</div>
          </div>

          <div class="top-players">
            <h3>🏆 前 20 名</h3>
            <div v-for="(player, index) in gameStore.leaderboard?.slice(0, 10)" :key="player.id"
              class="top-player-item">
              <span class="rank-badge" :class="getRankClass(index)">{{ index + 1 }}</span>
              <span class="player-name">{{ player.employeeId }}</span>
              <span class="player-score">{{ player.score }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore } from '../stores/game'
import { animations, gsap } from '../utils/animations'

const route = useRoute()
const gameStore = useGameStore()

// Form data
const employeeId = ref('')
const urlTeamId = ref('')

// Refs
const waitingIconRef = ref(null)
const scoreDisplayRef = ref(null)
const tapButtonRef = ref(null)
const shakeVisualRef = ref(null)
const shakeTestRef = ref(null)

// Motion sensors
let lastShakeTime = 0
let gyroscope = null
let accelerometer = null

// Motion permission state (for iOS)
const motionPermissionGranted = ref(false)
const permissionStatus = ref('idle') // idle, requesting, granted, denied
const testShakeCount = ref(0)
const testShakeActive = ref(false)

// Team info
const teamColors = {
  blue: '#3B82F6',
  yellow: '#EAB308',
  red: '#EF4444'
}

const teamNames = {
  blue: '藍隊',
  yellow: '黃隊',
  red: '紅隊'
}

// Computed
const teamClass = computed(() => {
  const teamId = gameStore.team?.id || urlTeamId.value
  return teamId ? `team-${teamId}` : ''
})

const teamBorderStyle = computed(() => {
  const teamId = gameStore.team?.id || urlTeamId.value
  const color = teamColors[teamId] || '#6C5CE7'
  return {
    '--team-color': color,
    background: `linear-gradient(${teamId === 'yellow' ? '180deg' : '180deg'}, ${color}80 0%, transparent 100%)`
  }
})

const buttonPositionClass = computed(() => {
  const pos = gameStore.buttonPosition
  if (pos === 1) return 'position-top-right'
  if (pos === 2) return 'position-bottom-left'
  return ''
})

// Methods
function getTeamColor(teamId) {
  return teamColors[teamId] || '#6C5CE7'
}

function getTeamName(teamId) {
  return teamNames[teamId] || '未知隊伍'
}

function getRankClass(index) {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return ''
}

function joinGame() {
  const teamId = urlTeamId.value || 'blue'
  gameStore.joinGame(employeeId.value, teamId)
}

function handleTap() {
  gameStore.sendTap()

  // Visual feedback
  if (tapButtonRef.value) {
    gsap.to(tapButtonRef.value, {
      scale: 0.95,
      duration: 0.05,
      yoyo: true,
      repeat: 1
    })
  }

  // Score animation
  if (scoreDisplayRef.value) {
    animations.scoreUp(scoreDisplayRef.value)
  }
}

// Motion detection for Round 2
function setupMotionSensors() {
  if ('Gyroscope' in window) {
    try {
      gyroscope = new Gyroscope({ frequency: 30 })
      gyroscope.addEventListener('reading', () => {
        if (gameStore.gamePhase === 'round2' && gameStore.isRunning) {
          const now = Date.now()
          if (now - lastShakeTime > 100) { // Debounce
            gameStore.sendShake(gyroscope.z, 0)
            lastShakeTime = now
            animateShake()
          }
        }
      })
      gyroscope.start()
    } catch (e) {
      console.log('Gyroscope not available')
    }
  }

  if ('Accelerometer' in window) {
    try {
      accelerometer = new Accelerometer({ frequency: 30 })
      accelerometer.addEventListener('reading', () => {
        if (gameStore.gamePhase === 'round2' && gameStore.isRunning) {
          const now = Date.now()
          if (now - lastShakeTime > 100) {
            gameStore.sendShake(0, accelerometer.y)
            lastShakeTime = now
            animateShake()
          }
        }
      })
      accelerometer.start()
    } catch (e) {
      console.log('Accelerometer not available')
    }
  }

  // Fallback: DeviceMotion API
  window.addEventListener('devicemotion', handleDeviceMotion)
}

function handleDeviceMotion(event) {
  const now = Date.now()
  if (now - lastShakeTime < 100) return

  const { rotationRate, accelerationIncludingGravity } = event
  const gyroZ = rotationRate?.gamma || 0
  const accelY = accelerationIncludingGravity?.y || 0

  const isShaking = Math.abs(gyroZ) > 50 || Math.abs(accelY) > 15

  // Warmup mode - just test sensors
  if (gameStore.gamePhase === 'round2_warmup' && isShaking) {
    testShakeCount.value++
    testShakeActive.value = true
    lastShakeTime = now

    // Animate test shake
    if (shakeTestRef.value) {
      gsap.to(shakeTestRef.value, {
        rotation: 10,
        duration: 0.1,
        yoyo: true,
        repeat: 1
      })
    }

    setTimeout(() => { testShakeActive.value = false }, 200)
    return
  }

  // Round 2 game mode
  if (gameStore.gamePhase === 'round2' && gameStore.isRunning && isShaking) {
    gameStore.sendShake(gyroZ / 50, accelY)
    lastShakeTime = now
    animateShake()
  }
}

// iOS DeviceMotion permission request
async function requestMotionPermission() {
  permissionStatus.value = 'requesting'

  // iOS 13+ requires explicit permission request
  if (typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const response = await DeviceMotionEvent.requestPermission()
      if (response === 'granted') {
        permissionStatus.value = 'granted'
        motionPermissionGranted.value = true
        // Re-setup sensors after permission granted
        window.addEventListener('devicemotion', handleDeviceMotion)
      } else {
        permissionStatus.value = 'denied'
      }
    } catch (e) {
      console.error('Motion permission request failed:', e)
      permissionStatus.value = 'denied'
    }
  } else {
    // Non-iOS or older versions - no permission needed
    motionPermissionGranted.value = true
    permissionStatus.value = 'granted'
  }
}

function animateShake() {
  if (shakeVisualRef.value) {
    gsap.to(shakeVisualRef.value, {
      rotation: 15,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    })
  }
  if (scoreDisplayRef.value) {
    animations.scoreUp(scoreDisplayRef.value)
  }
}

function cleanupMotionSensors() {
  if (gyroscope) gyroscope.stop()
  if (accelerometer) accelerometer.stop()
  window.removeEventListener('devicemotion', handleDeviceMotion)
}

// Parse team from URL
onMounted(() => {
  // Get team from URL query (from QR code)
  const teamParam = route.query.team
  if (teamParam && ['blue', 'yellow', 'red'].includes(teamParam)) {
    urlTeamId.value = teamParam
  }

  gameStore.connect()
  setupMotionSensors()

  // Check if device needs permission request (iOS 13+)
  if (typeof DeviceMotionEvent === 'undefined' ||
    typeof DeviceMotionEvent.requestPermission !== 'function') {
    // Non-iOS or older iOS - no permission needed
    motionPermissionGranted.value = true
    permissionStatus.value = 'granted'
  }

  // Waiting icon animation
  if (waitingIconRef.value) {
    animations.bounce(waitingIconRef.value)
  }
})

onUnmounted(() => {
  cleanupMotionSensors()
})

// Watch for bonus changes
watch(() => gameStore.bonusStage, (newStage) => {
  if (newStage > 0 && tapButtonRef.value) {
    // Animate button movement
    gsap.to(tapButtonRef.value, {
      scale: 1.1,
      duration: 0.2,
      yoyo: true,
      repeat: 1
    })
  }
})
</script>

<style scoped>
.player-view {
  min-height: 100dvh;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
}

/* Team color gradient borders */
.team-border {
  position: fixed;
  left: 0;
  right: 0;
  height: 120px;
  z-index: 1;
  pointer-events: none;
  animation: breathe 2s ease-in-out infinite;
}

.team-border.top {
  top: 0;
}

.team-border.bottom {
  bottom: 0;
  transform: rotate(180deg);
}

@keyframes breathe {

  0%,
  100% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }
}

/* Join Screen */
.join-screen {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  padding-top: calc(var(--spacing-lg) + env(safe-area-inset-top));
  padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom));
}

.join-card {
  width: 100%;
  max-width: 400px;
  padding: var(--spacing-xl);
  text-align: center;
}

.join-header {
  margin-bottom: var(--spacing-lg);
}

.game-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-sm);
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-group {
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 600;
}

.team-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-md);
  font-weight: 600;
}

.team-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
}

.player-count {
  margin-top: var(--spacing-md);
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
}

/* Game Screen */
.game-screen {
  min-height: 100dvh;
}

/* Waiting Screen */
.waiting-screen {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-lg);
}

.waiting-content {
  max-width: 300px;
}

.waiting-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
}

.team-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  font-weight: 600;
}

/* Round 1 Screen */
.round1-screen,
.round2-screen {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-lg);
  padding-top: calc(var(--spacing-lg) + env(safe-area-inset-top) + 100px);
  padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom) + 100px);
}

.round-header {
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.round-badge {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-md);
  background: linear-gradient(135deg, #6C5CE7, #a29bfe);
  border-radius: var(--border-radius-full);
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: var(--spacing-sm);
}

.score-display {
  font-size: 4rem;
  font-weight: 900;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.7);
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--border-radius-lg);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
}

.score-label {
  font-size: 1.5rem;
}

.bonus-indicator {
  margin-top: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-radius: var(--border-radius-full);
  display: inline-block;
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

/* Tap Area */
.tap-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tap-button {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6C5CE7, #a29bfe);
  box-shadow: 0 10px 40px rgba(108, 92, 231, 0.4);
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.tap-button:active {
  transform: scale(0.95);
}

.tap-button.position-top-right {
  transform: translate(80px, -120px);
}

.tap-button.position-bottom-left {
  transform: translate(-80px, 120px);
}

.tap-icon {
  font-size: 3rem;
}

.tap-text {
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: var(--spacing-xs);
}

/* Shake Area */
.shake-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
}

.twist-animation {
  position: relative;
  margin-bottom: var(--spacing-xl);
}

.twist-phone {
  font-size: 6rem;
  animation: twist-rotate 1s ease-in-out infinite;
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

.twist-arrows {
  font-size: 2.5rem;
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0.6;
}

.shake-text {
  font-size: 1.5rem;
  font-weight: 700;
}

.shake-visual {
  padding: var(--spacing-xl);
}

.phone-icon {
  font-size: 6rem;
}

.round-footer {
  margin-top: auto;
}

/* Result Screen */
.result-screen {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  padding-top: calc(var(--spacing-lg) + env(safe-area-inset-top));
  padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom));
  overflow-y: auto;
}

.result-content {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.result-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
}

.your-result {
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-lg);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-lg);
}

.top-players {
  margin-top: var(--spacing-lg);
  text-align: left;
}

.top-player-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-xs);
}

.rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.2);
}

.rank-badge.gold {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
}

.rank-badge.silver {
  background: linear-gradient(135deg, #C0C0C0, #A0A0A0);
  color: #000;
}

.rank-badge.bronze {
  background: linear-gradient(135deg, #CD7F32, #A0522D);
  color: #fff;
}

.player-name {
  flex: 1;
  font-weight: 600;
}

.player-score {
  font-weight: 700;
  color: var(--primary);
}

.waiting-next {
  margin-top: var(--spacing-lg);
  opacity: 0.7;
}

/* Responsive */
@media (max-width: 380px) {
  .tap-button {
    width: 150px;
    height: 150px;
  }

  .score-display {
    font-size: 3rem;
  }
}

/* Warmup Screen */
.warmup-screen {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-lg);
}

.warmup-content {
  max-width: 350px;
}

.warmup-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
  animation: twist-rotate-player 1s ease-in-out infinite;
}

@keyframes twist-rotate-player {

  0%,
  100% {
    transform: rotate(-20deg);
  }

  50% {
    transform: rotate(20deg);
  }
}

.warmup-desc {
  opacity: 0.8;
  margin-bottom: var(--spacing-lg);
}

.permission-section {
  margin: var(--spacing-xl) 0;
}

.permission-section .btn {
  width: 100%;
  padding: var(--spacing-lg);
  font-size: 1.1rem;
}

.permission-hint {
  margin-top: var(--spacing-md);
  font-size: 0.85rem;
  opacity: 0.7;
}

.shake-test-section {
  margin: var(--spacing-xl) 0;
}

.permission-success {
  color: var(--success);
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
}

.shake-test {
  padding: var(--spacing-xl);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-lg);
  transition: transform 0.1s, background 0.2s;
}

.shake-test.active {
  background: rgba(108, 92, 231, 0.3);
}

.shake-test .phone-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-sm);
}

.test-count {
  font-size: 3rem;
  font-weight: 900;
  color: var(--primary);
}

.test-label {
  font-size: 1rem;
  opacity: 0.7;
}

.test-hint {
  margin-top: var(--spacing-md);
  font-size: 0.85rem;
  opacity: 0.7;
}
</style>
