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
            <input v-model="employeeId" ref="employeeIdInput" class="input" placeholder="輸入你的員工編號" maxlength="20"
              autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" required />
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
          <div class="timer-display">
            ⏱️ {{ gameStore.roundTimeLeft }}s
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

      <!-- Round 2 Result -->
      <div v-else-if="gameStore.gamePhase === 'round2_result'" class="result-screen">
        <div class="result-content" v-animate="'scaleIn'">
          <div class="result-icon">🏁</div>
          <h1>Round 2 結束！</h1>

          <div class="your-result">
            <p>你的 Round 2 分數</p>
            <div class="score-display">{{ gameStore.player?.round2Score ?? gameStore.score }}</div>
          </div>

          <div class="top-players">
            <h3>🏆 Round 2 個人排行榜</h3>
            <div v-for="(player, index) in gameStore.leaderboard?.slice(0, 5)" :key="player.id" class="top-player-item">
              <span class="rank-badge" :class="getRankClass(index)">{{ index + 1 }}</span>
              <span class="player-name">{{ player.employeeId }}</span>
              <span class="player-score">{{ player.score }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Final Result (total score) -->
      <div v-else-if="gameStore.gamePhase === 'final_result'" class="result-screen">
        <div class="result-content" v-animate="'scaleIn'">
          <div class="result-icon">🏆</div>
          <h1>最終結果！</h1>

          <div class="your-result">
            <p>你的總積分</p>
            <div class="score-display">{{ gameStore.player?.totalScore ?? gameStore.totalScore }}</div>
          </div>

          <div class="top-players">
            <h3>🏆 個人總積分榜</h3>
            <div v-for="(player, index) in gameStore.leaderboard?.slice(0, 5)" :key="player.id" class="top-player-item">
              <span class="rank-badge" :class="getRankClass(index)">{{ index + 1 }}</span>
              <span class="player-name">{{ player.employeeId }}</span>
              <span class="player-score">{{ player.score }}</span>
            </div>
          </div>
        </div>
      </div>


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
          <div class="timer-display">
            ⏱️ {{ gameStore.roundTimeLeft }}s
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

      <!-- Phase 2: Quiz Mode -->
      <div v-else-if="['phase2', 'phase2_question', 'phase2_reveal'].includes(gameStore.gamePhase)" class="quiz-screen">
        <div class="round-header">
          <div class="round-badge phase2-badge">第二階段 問答</div>
          <div class="score-display">
            {{ gameStore.score }}
            <span class="score-label">分</span>
          </div>
        </div>

        <div v-if="gameStore.gamePhase === 'phase2'" class="waiting-quiz">
          <div class="quiz-icon">🧠</div>
          <h2>準備聽題...</h2>
          <p>請注意大螢幕題目！</p>
        </div>

        <div v-else-if="gameStore.phase2Question" class="quiz-area">
          <h3 class="q-number">Q{{ gameStore.phase2Question.questionNumber + 1 }}</h3>

          <div class="options-list">
            <button v-for="(opt, idx) in gameStore.phase2Question.options" :key="idx" class="option-btn" :class="{
              'selected': myAnswer === idx,
              'correct': gameStore.gamePhase === 'phase2_reveal' && gameStore.phase2Result?.correctIndex === idx,
              'wrong': gameStore.gamePhase === 'phase2_reveal' && myAnswer === idx && !gameStore.phase2Result?.correct
            }" @click="submitAnswer(idx)" :disabled="gameStore.gamePhase !== 'phase2_question'">
              <span class="opt-label">{{ ['A', 'B', 'C', 'D'][idx] }}</span>
              <span class="opt-text">{{ opt }}</span>
            </button>
          </div>

          <div class="quiz-status" v-if="gameStore.gamePhase === 'phase2_reveal' && gameStore.phase2Result">
            <div class="status-msg"
              :class="gameStore.phase2Result?.scoreChange > 0 ? 'msg-correct' : (gameStore.phase2Result?.scoreChange < 0 ? 'msg-wrong' : '')">

              <template v-if="gameStore.phase2Result?.scoreChange > 0">
                🎉 答對了！+{{ gameStore.phase2Result?.scoreChange }}分
                <div v-if="gameStore.phase2Result?.wasInTop100" class="sub-msg">恭喜進入前 100 名！💰</div>
              </template>

              <template v-else-if="gameStore.phase2Result?.scoreChange < 0">
                <template v-if="gameStore.phase2Result?.yourAnswer === null">
                  ⏰ 未作答！{{ gameStore.phase2Result?.scoreChange }}分 🐢
                </template>
                <template v-else>
                  ❌ 答錯了！{{ gameStore.phase2Result?.scoreChange }}分 🐢
                </template>
              </template>

              <template v-else>
                <span v-if="gameStore.phase2Result?.correct">
                  ✅ 答對了！(金幣題：未在百名內，無加分)
                </span>
                <span v-else-if="gameStore.phase2Result?.yourAnswer === null">
                  ⏰ 未作答 (未扣分)
                </span>
                <span v-else>
                  ❌ 答錯了！(未扣分)
                </span>
              </template>
            </div>
          </div>
        </div>

        <div class="round-footer">
          <div class="team-info">
            <span class="team-dot" :style="{ background: gameStore.team?.color }"></span>
            {{ gameStore.team?.name }}
          </div>
        </div>
      </div>

      <!-- Phase 2 Final Result -->
      <div v-else-if="gameStore.gamePhase === 'phase2_end'" class="result-screen">
        <div class="result-content" v-animate="'scaleIn'">
          <div class="result-icon">🏆</div>
          <h1>問答結束！</h1>

          <div class="your-result">
            <p>你的問答總分</p>
            <div class="score-display">{{ gameStore.score }}</div>
          </div>

          <p class="waiting-next">請看大螢幕公布排行榜！</p>
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
const employeeIdInput = ref(null)

// Motion sensors
let lastShakeTime = 0
let gyroscope = null
let accelerometer = null
let wakeLock = null

// Motion permission state (for iOS)
const motionPermissionGranted = ref(false)
const permissionStatus = ref('idle') // idle, requesting, granted, denied
const testShakeCount = ref(0)
const testShakeActive = ref(false)

// Quiz State
const myAnswer = ref(null)

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
  const normalizedId = employeeId.value.trim().toUpperCase()
  gameStore.joinGame(normalizedId, teamId)

  // Disable and blur input immediately after join to remove it from iOS undo tracking
  if (employeeIdInput.value) {
    employeeIdInput.value.blur()
    employeeIdInput.value.disabled = true
    employeeIdInput.value.value = ''
  }

  // Clear document-level undo history
  clearUndoHistory()
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

function submitAnswer(idx) {
  if (gameStore.gamePhase !== 'phase2_question') return
  myAnswer.value = idx
  gameStore.sendAnswer(idx)
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

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      console.log('Wake Lock acquired')

      wakeLock.addEventListener('release', () => {
        console.log('Wake Lock released')
      })
    } catch (err) {
      console.error(`Wake Lock error: ${err.name}, ${err.message}`)
    }
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release()
    wakeLock = null
  }
}

async function handleVisibilityChange() {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    await requestWakeLock()
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

  // Prevent iOS "Shake to Undo" dialog via beforeinput interception
  document.addEventListener('beforeinput', handleBeforeInput, { capture: true })

  // Handle screen sleep prevention
  document.addEventListener('visibilitychange', handleVisibilityChange)
  // Request wake lock if player is already logged in (e.g. on refresh)
  if (gameStore.player) {
    requestWakeLock()
  }

  // Waiting icon animation
  if (waitingIconRef.value) {
    animations.bounce(waitingIconRef.value)
  }
})

onUnmounted(() => {
  cleanupMotionSensors()
  document.removeEventListener('beforeinput', handleBeforeInput, { capture: true })
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  releaseWakeLock()
})

function handleBeforeInput(e) {
  if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
    e.preventDefault()
    e.stopPropagation()
    return false
  }
}

// Clear document-level undo history to prevent iOS Shake to Undo dialog.
// Strategy: "insert then immediately undo" on a hidden <input> element.
// This leaves the undo stack with 0 undoable items: the undo cancels the insert,
// so iOS shake-to-undo finds nothing and won't show the dialog.
function clearUndoHistory() {
  // Step 1: Blur any focused element
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur()
  }

  // Step 2: Disable + clear all inputs so iOS stops tracking them
  document.querySelectorAll('input, textarea').forEach(el => {
    el.blur()
    el.disabled = true
    el.value = ''
  })

  // Step 3: insert-then-undo trick resets iOS undo stack to 0 items.
  // Using a real <input type="text"> for better iOS WKWebView compatibility.
  const dummy = document.createElement('input')
  dummy.type = 'text'
  dummy.setAttribute('autocomplete', 'off')
  dummy.setAttribute('autocorrect', 'off')
  dummy.setAttribute('autocapitalize', 'off')
  dummy.setAttribute('spellcheck', 'false')
  dummy.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;'
  document.body.appendChild(dummy)
  dummy.focus()
  try {
    document.execCommand('insertText', false, ' ')
    document.execCommand('undo') // undo cancels the insert → net 0 undoable items
  } catch (e) { /* ignore */ }
  dummy.blur()
  document.body.removeChild(dummy)
}

// Watch for phase changes to ensure input is blurred and undo history is cleared
watch(() => gameStore.gamePhase, (newPhase) => {
  if (newPhase === 'round2_warmup' || newPhase === 'round2') {
    // Force blur any active element to prevent shake-to-undo
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur()
    }
    // Clear immediately, then retry with delays to ensure iOS processes the blur
    clearUndoHistory()
    setTimeout(() => clearUndoHistory(), 300)
    setTimeout(() => clearUndoHistory(), 1500)
  }

  // Reset myAnswer when a new question starts
  if (newPhase === 'phase2_question') {
    myAnswer.value = null
  }
})

// Request wake lock when player joins
watch(() => gameStore.player, (newPlayer) => {
  if (newPlayer) {
    requestWakeLock()
  } else {
    releaseWakeLock()
  }
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

.timer-display {
  margin-top: var(--spacing-sm);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-secondary);
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

/* Phase 2 Quiz Screen */
.quiz-screen {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-lg);
  padding-top: calc(var(--spacing-lg) + env(safe-area-inset-top) + 100px);
  padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom) + 100px);
}

.phase2-badge {
  background: linear-gradient(135deg, #FF9F43, #FF6B6B);
}

.waiting-quiz {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.quiz-icon {
  font-size: 5rem;
  margin-bottom: var(--spacing-md);
  animation: pulse 2s infinite ease-in-out;
}

.quiz-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.q-number {
  font-size: 2rem;
  font-weight: 900;
  text-align: center;
  color: var(--primary);
  margin-bottom: var(--spacing-xl);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.option-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--border-radius-lg);
  color: #fff;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.option-btn:not(:disabled):active {
  transform: scale(0.98);
}

.option-btn.selected {
  background: rgba(108, 92, 231, 0.3);
  border-color: var(--primary);
}

.option-btn.correct {
  background: rgba(0, 184, 148, 0.3);
  border-color: var(--success);
}

.option-btn.wrong {
  background: rgba(225, 112, 85, 0.3);
  border-color: var(--danger);
}

.opt-label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--border-radius-sm);
  font-weight: 900;
  color: var(--primary);
}

.quiz-status {
  text-align: center;
  margin-top: var(--spacing-xl);
  font-size: 1.5rem;
  font-weight: 900;
}

.sub-msg {
  font-size: 1.1rem;
  color: #FFD700;
  margin-top: var(--spacing-xs);
}

.msg-correct {
  color: var(--success);
}

.msg-wrong {
  color: var(--danger);
}
</style>
