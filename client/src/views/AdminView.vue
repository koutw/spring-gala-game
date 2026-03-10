<template>
  <div class="admin-view">
    <!-- Admin Login Screen -->
    <div v-if="!gameStore.adminAuthenticated" class="admin-login-overlay">
      <div class="login-card">
        <h1>🔐 管理員登入</h1>
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label>帳號</label>
            <input v-model="loginId" class="input" placeholder="請輸入帳號" required />
          </div>
          <div class="form-group">
            <label>密碼</label>
            <input v-model="loginPassword" type="password" class="input" placeholder="請輸入密碼" required />
          </div>
          <p v-if="gameStore.adminAuthError" class="auth-error">{{ gameStore.adminAuthError }}</p>
          <button type="submit" class="btn btn-primary btn-large w-full">登入</button>
        </form>
      </div>
    </div>

    <!-- Admin Dashboard (only shown after auth) -->
    <template v-else>
      <div class="admin-header">
        <h1>🎮 遊戲管理控制台</h1>
        <div class="connection-status" :class="{ online: gameStore.connected }">
          {{ gameStore.connected ? '已連線' : '連線中...' }}
        </div>
      </div>

      <div class="admin-content">
        <!-- Game Status Panel -->
        <div class="panel status-panel">
          <h2>📊 遊戲狀態</h2>
          <div class="status-grid">
            <div class="status-item">
              <span class="status-label">當前階段</span>
              <span class="status-value">{{ phaseLabel }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">當前 Round</span>
              <span class="status-value">{{ gameStore.currentRound || '-' }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">遊戲狀態</span>
              <span class="status-value" :class="{ running: gameStore.isRunning }">
                {{ gameStore.isRunning ? '進行中' : '已停止' }}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">玩家人數</span>
              <span class="status-value">{{ gameStore.playerCount }} 人</span>
            </div>
          </div>
        </div>

        <!-- Settings Panel -->
        <div class="panel settings-panel" :class="{ locked: gameStore.isRunning }">
          <h2>
            ⚙️ 遊戲設定
            <span v-if="gameStore.isRunning" class="lock-badge">🔒 已鎖定</span>
          </h2>

          <div class="settings-grid">
            <div class="setting-item">
              <label>Round 1 時間（秒）</label>
              <input v-model.number="settings.round1Duration" type="number" min="5" max="300" step="5"
                :disabled="gameStore.isRunning" />
            </div>

            <div class="setting-item">
              <label>Round 2 時間（秒）</label>
              <input v-model.number="settings.round2Duration" type="number" min="5" max="300" step="5"
                :disabled="gameStore.isRunning" />
            </div>

            <div class="setting-item">
              <label>Round 1 目標分數（動畫用）</label>
              <input v-model.number="settings.round1TargetScore" type="number" min="100" max="100000" step="100"
                :disabled="gameStore.isRunning" />
              <span class="setting-hint">Bonus: {{ Math.round(settings.round1TargetScore * 0.5) }}, {{
                Math.round(settings.round1TargetScore * 0.75) }}</span>
            </div>

            <div class="setting-item">
              <label>Round 2 目標分數（動畫用）</label>
              <input v-model.number="settings.round2TargetScore" type="number" min="100" max="50000" step="100"
                :disabled="gameStore.isRunning" />
              <span class="setting-hint">Bonus: {{ Math.round(settings.round2TargetScore * 0.6) }}</span>
            </div>

            <div class="setting-item">
              <label>排行榜顯示人數</label>
              <input v-model.number="settings.leaderboardSize" type="number" min="5" max="50"
                :disabled="gameStore.isRunning" />
            </div>
          </div>

          <button class="btn btn-secondary" @click="saveSettings" :disabled="gameStore.isRunning">
            {{ gameStore.isRunning ? '🔒 遊戲中不可調整' : '儲存設定 💾' }}
          </button>
        </div>

        <!-- Game Controls -->
        <div class="panel control-panel">
          <h2>🎯 遊戲控制</h2>

          <div class="control-section">
            <h3>第一階段：數位賽馬</h3>

            <div class="round-controls">
              <button class="btn btn-primary btn-large" @click="startRound(1)"
                :disabled="gameStore.isRunning || gameStore.gamePhase === 'round1'">
                開始 Round 1（點擊）🐴
              </button>

              <button class="btn btn-warning btn-large" @click="startWarmup"
                :disabled="gameStore.isRunning || gameStore.gamePhase !== 'round1_result'">
                Round 2 暖身（授權感測器）📳
              </button>

              <button class="btn btn-primary btn-large" @click="startRound(2)"
                :disabled="gameStore.isRunning || !['round1_result', 'round2_warmup'].includes(gameStore.gamePhase)">
                開始 Round 2（搖晃）🔥
              </button>
            </div>
          </div>

          <div class="control-section">
            <h3>第二階段：伯樂與千里馬</h3>

            <div class="round-controls phase2-controls">
              <button class="btn btn-primary btn-large" @click="startPhase2"
                :disabled="gameStore.isRunning || !['round2_result', 'finished'].includes(gameStore.gamePhase) && gameStore.gamePhase !== 'phase2_end'">
                開始 問答遊戲 🧠
              </button>

              <button class="btn btn-secondary btn-large" @click="nextQuestion"
                :disabled="!['phase2', 'phase2_reveal'].includes(gameStore.gamePhase)">
                發送下道題目 📝
              </button>
            </div>
          </div>

          <div class="control-section">
            <h3>排行榜</h3>
            <div class="leaderboard-controls">
              <button class="btn btn-secondary" @click="showLeaderboard('round1')">
                Round 1 排行榜
              </button>
              <button class="btn btn-secondary" @click="showLeaderboard('round2')">
                Round 2 排行榜
              </button>
              <button class="btn btn-secondary" @click="showLeaderboard('total')">
                總積分排行榜
              </button>
            </div>
          </div>

          <div class="control-section">
            <h3>遊戲控制</h3>
            <div class="round-controls">
              <button class="btn btn-danger" @click="endRound(1)"
                :disabled="!gameStore.isRunning || gameStore.gamePhase !== 'round1'">
                結束 Round 1 🏁
              </button>
              <button class="btn btn-danger" @click="endRound(2)"
                :disabled="!gameStore.isRunning || gameStore.gamePhase !== 'round2'">
                結束 Round 2 🏁
              </button>
              <button class="btn btn-danger" @click="endRound('quiz')"
                :disabled="!['phase2', 'phase2_question', 'phase2_reveal'].includes(gameStore.gamePhase)">
                結束 問答遊戲 🏁
              </button>
              <button class="btn btn-danger btn-large" @click="stopGame" :disabled="!gameStore.isRunning">
                停止遊戲 ⛔
              </button>
            </div>
          </div>

          <div class="control-section reset-section">
            <h3>遊戲場次</h3>
            <div class="game-id-display">
              <span class="game-id-label">當前 ID:</span>
              <code class="game-id-value">{{ gameStore.gameId || '-' }}</code>
            </div>
            <button class="btn btn-warning btn-large" @click="resetGame" :disabled="gameStore.isRunning">
              🔄 重置遊戲（開始新場次）
            </button>
            <p class="reset-warning">⚠️ 此操作將清除所有玩家資料和分數</p>
          </div>
        </div>

        <!-- Teams Overview -->
        <div class="panel teams-panel">
          <h2>👥 隊伍狀態</h2>
          <div class="teams-list">
            <div v-for="team in gameStore.teams" :key="team.id" class="team-item"
              :style="{ '--team-color': team.color }">
              <div class="team-header">
                <span class="team-dot"></span>
                <span class="team-name">{{ team.name }}</span>
              </div>
              <div class="team-stats">
                <div class="stat">
                  <span class="stat-label">人數</span>
                  <span class="stat-value">{{ team.playerCount || 0 }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">R1 分數</span>
                  <span class="stat-value">{{ team.round1Score || 0 }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">R2 分數</span>
                  <span class="stat-value">{{ team.round2Score || 0 }}</span>
                </div>
                <div class="stat total">
                  <span class="stat-label">總分</span>
                  <span class="stat-value">{{ team.totalScore || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- QR Code Info -->
        <div class="panel qr-panel">
          <h2>📱 QR Code 連結</h2>
          <div class="qr-links">
            <div class="qr-item" v-for="team in teamsInfo" :key="team.id">
              <span class="team-dot" :style="{ background: team.color }"></span>
              <span class="team-name">{{ team.name }}</span>
              <code class="qr-url">{{ baseUrl }}/player?team={{ team.id }}</code>
            </div>
          </div>
        </div>
      </div>

      <!-- Phase 2 Question Editor (scroll down to see) -->
      <div class="admin-questions-section">
        <div class="panel questions-panel" :class="{ locked: gameStore.isRunning }">
          <h2>
            📝 第二階段題目
            <span v-if="gameStore.isRunning" class="lock-badge">🔒 已鎖定</span>
            <span class="question-count">{{ editableQuestions.length }} 題</span>
          </h2>

          <div class="questions-list">
            <div v-for="(q, idx) in editableQuestions" :key="q.id" class="question-card"
              :class="{ expanded: expandedQuestions.has(idx) }">
              <!-- Collapsed Header -->
              <div class="question-header" @click="toggleQuestion(idx)">
                <span class="question-number">#{{ idx + 1 }}</span>
                <span class="question-type-badge" :class="q.customType">{{
                  typeLabels[q.customType] || '⭐' }}</span>
                <span class="question-text-preview">{{ q.text }}</span>
                <span class="expand-icon">{{ expandedQuestions.has(idx) ? '▲' : '▼' }}</span>
              </div>

              <!-- Expanded Body -->
              <div v-if="expandedQuestions.has(idx)" class="question-body">
                <div class="q-field">
                  <label>題目文字</label>
                  <input v-model="q.text" class="input" :disabled="gameStore.isRunning" />
                </div>

                <div class="q-field">
                  <label>題目類型</label>
                  <select v-model="q.customType" class="input" :disabled="gameStore.isRunning">
                    <option value="star">⭐ 無敵星星題 (答對+1)</option>
                    <option value="coin">💰 金幣題 (前100名答對+1)</option>
                    <option value="shell">🐢 龜殼題 (答錯-1)</option>
                  </select>
                </div>

                <div class="q-field">
                  <label>選項</label>
                  <div v-for="(opt, optIdx) in q.options" :key="optIdx" class="option-row">
                    <input type="radio" :name="'correct-' + q.id" :value="optIdx" v-model="q.correctIndex"
                      :disabled="gameStore.isRunning" />
                    <input v-model="q.options[optIdx]" class="input option-input" :disabled="gameStore.isRunning"
                      :placeholder="'選項 ' + (optIdx + 1)" />
                    <button v-if="q.options.length > 2" class="btn-icon btn-remove-option"
                      @click="removeOption(idx, optIdx)" :disabled="gameStore.isRunning" title="刪除選項">✕</button>
                  </div>
                  <button v-if="q.options.length < 6" class="btn btn-sm btn-ghost" @click="addOption(idx)"
                    :disabled="gameStore.isRunning">
                    + 新增選項
                  </button>
                </div>

                <div class="q-field correct-hint">
                  ✅ 正確答案：選項 {{ q.correctIndex + 1 }}
                  ({{ q.options[q.correctIndex] || '-' }})
                </div>

                <button class="btn btn-sm btn-danger" @click="removeQuestion(idx)" :disabled="gameStore.isRunning">
                  🗑️ 刪除此題
                </button>
              </div>
            </div>
          </div>

          <div class="questions-actions">
            <button class="btn btn-ghost" @click="addQuestion" :disabled="gameStore.isRunning">
              ➕ 新增題目
            </button>
            <button class="btn btn-primary" @click="saveQuestions" :disabled="gameStore.isRunning">
              {{ gameStore.isRunning ? '🔒 遊戲中不可調整' : '儲存題目 💾' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()

// Login
const loginId = ref('')
const loginPassword = ref('')

// Settings
const settings = reactive({
  round1Duration: 30,
  round2Duration: 30,
  round1TargetScore: 40000,
  round2TargetScore: 25000,
  leaderboardSize: 20
})

// 當 gameStore.settings 更新時同步到本地 settings
watch(() => gameStore.settings, (newSettings) => {
  if (newSettings) {
    if (newSettings.round1Duration) settings.round1Duration = newSettings.round1Duration
    if (newSettings.round2Duration) settings.round2Duration = newSettings.round2Duration
    if (newSettings.round1TargetScore) settings.round1TargetScore = newSettings.round1TargetScore
    if (newSettings.round2TargetScore) settings.round2TargetScore = newSettings.round2TargetScore
    if (newSettings.leaderboardSize) settings.leaderboardSize = newSettings.leaderboardSize
  }
}, { immediate: true })

// Teams info for QR codes
const teamsInfo = [
  { id: 'blue', name: 'Team Jack', color: '#3B82F6' },
  { id: 'yellow', name: 'Team Iris', color: '#EAB308' },
  { id: 'red', name: 'Team Jason', color: '#EF4444' }
]

const baseUrl = computed(() => {
  return window.location.origin
})

const phaseLabel = computed(() => {
  const labels = {
    waiting: '等待中',
    round1: 'Round 1 進行中',
    round1_result: 'Round 1 結果',
    round2_warmup: 'Round 2 暖身中',
    round2: 'Round 2 進行中',
    round2_result: 'R2 結果',
    final_result: '總積分結果',
    phase2: '問答遊戲準備中',
    phase2_question: '作答時間',
    phase2_reveal: '解答公布',
    phase2_end: '問答結果',
    finished: '已結束'
  }
  return labels[gameStore.gamePhase] || '未知'
})

function saveSettings() {
  gameStore.updateSettings(settings)
  alert('設定已儲存！')
}

function startRound(round) {
  gameStore.startRound(round)
}

function startWarmup() {
  gameStore.startWarmup()
}

function handleLogin() {
  gameStore.adminLogin(loginId.value, loginPassword.value)
}

function stopGame() {
  gameStore.socket?.emit('admin:stopGame')
}

function endRound(round) {
  if (confirm(`確定要結束此階段了嗎？將立即進入積分畫面。`)) {
    gameStore.socket?.emit('admin:endRound', { round })
  }
}

function startPhase2() {
  gameStore.startPhase2()
}

const selectedPhase2Type = ref('star')

function nextQuestion() {
  gameStore.socket?.emit('admin:nextQuestion', {})
}

// Question editor
const expandedQuestions = ref(new Set())
const editableQuestions = ref([])

const typeLabels = {
  star: '⭐ 星星',
  coin: '💰 金幣',
  shell: '🐢 龜殼'
}

// Sync from store to local editable copy
watch(() => gameStore.phase2Questions, (newQuestions) => {
  if (newQuestions && newQuestions.length > 0) {
    editableQuestions.value = JSON.parse(JSON.stringify(newQuestions))
  }
}, { immediate: true, deep: true })

function toggleQuestion(idx) {
  const s = new Set(expandedQuestions.value)
  if (s.has(idx)) {
    s.delete(idx)
  } else {
    s.add(idx)
  }
  expandedQuestions.value = s
}

function addOption(qIdx) {
  const q = editableQuestions.value[qIdx]
  if (q.options.length < 6) {
    q.options.push(`選項${q.options.length + 1}`)
  }
}

function removeOption(qIdx, optIdx) {
  const q = editableQuestions.value[qIdx]
  if (q.options.length <= 2) return
  q.options.splice(optIdx, 1)
  // Adjust correctIndex if needed
  if (q.correctIndex >= q.options.length) {
    q.correctIndex = q.options.length - 1
  }
}

function addQuestion() {
  const maxId = editableQuestions.value.reduce((max, q) => Math.max(max, q.id || 0), 0)
  editableQuestions.value.push({
    id: maxId + 1,
    text: '新題目',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    customType: 'star'
  })
}

function removeQuestion(idx) {
  if (editableQuestions.value.length <= 1) {
    alert('至少需要一道題目')
    return
  }
  if (confirm(`確定要刪除題目 #${idx + 1} 嗎？`)) {
    editableQuestions.value.splice(idx, 1)
    expandedQuestions.value = new Set()
  }
}

function saveQuestions() {
  gameStore.updateQuestions(editableQuestions.value)
  alert('題目已儲存！')
}

function showLeaderboard(type) {
  gameStore.socket?.emit('admin:showLeaderboard', { type })
}

function resetGame() {
  if (confirm('確定要重置遊戲嗎？此操作將清除所有玩家資料和分數！')) {
    gameStore.socket?.emit('admin:resetGame')
  }
}

onMounted(() => {
  gameStore.connect()

  // 等待 socket 連線後再執行 admin 操作
  const waitForConnection = () => {
    if (gameStore.socket?.connected) {
      // 如果已認證，重新取得狀態
      if (gameStore.adminAuthenticated) {
        gameStore.joinAsAdmin()
      }
    } else {
      gameStore.socket?.once('connect', () => {
        if (gameStore.adminAuthenticated) {
          gameStore.joinAsAdmin()
        }
      })
    }
  }
  waitForConnection()
})
</script>

<style scoped>
.admin-view {
  min-height: 100vh;
  background: var(--gradient-dark);
  padding: var(--spacing-lg);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.admin-header h1 {
  font-size: 1.75rem;
}

.connection-status {
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(225, 112, 85, 0.2);
  border-radius: var(--border-radius-full);
  font-size: 0.875rem;
  color: var(--danger);
}

.connection-status.online {
  background: rgba(0, 184, 148, 0.2);
  color: var(--success);
}

.admin-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: var(--spacing-lg);
}

.panel {
  background: var(--bg-card);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel h2 {
  font-size: 1.25rem;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Status Panel */
.status-grid {
  display: grid;
  gap: var(--spacing-md);
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  color: var(--text-secondary);
}

.status-value {
  font-weight: 600;
}

.status-value.running {
  color: var(--success);
}

/* Settings Panel */
.settings-grid {
  display: grid;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.setting-item label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.setting-item input {
  padding: var(--spacing-sm);
  background: var(--bg-card-hover);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-size: 1rem;
}

.setting-item input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.setting-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.7;
}

.panel.locked {
  opacity: 0.7;
  border-color: rgba(225, 112, 85, 0.3);
}

.lock-badge {
  font-size: 0.75rem;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(225, 112, 85, 0.2);
  border-radius: var(--border-radius-full);
  margin-left: var(--spacing-sm);
  color: var(--danger);
}

/* Control Panel */
.control-section {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.control-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.control-section h3 {
  font-size: 1rem;
  margin-bottom: var(--spacing-md);
  color: var(--text-secondary);
}

.reset-section {
  border-top: 2px solid rgba(255, 193, 7, 0.3);
  padding-top: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.game-id-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.game-id-label {
  color: var(--text-secondary);
}

.game-id-value {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--border-radius-sm);
  font-family: monospace;
  color: var(--primary);
}

.reset-warning {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.7;
  margin-top: var(--spacing-sm);
}

.btn-warning {
  background: linear-gradient(135deg, #F39C12, #E67E22);
  color: white;
}

.btn-warning:hover {
  box-shadow: 0 0 20px rgba(243, 156, 18, 0.5);
}

.round-controls,
.leaderboard-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.btn-large {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: 1rem;
}

.btn-danger {
  background: linear-gradient(135deg, #E17055, #D63031);
  color: white;
}

.btn-danger:hover {
  box-shadow: 0 0 20px rgba(225, 112, 85, 0.5);
}

/* Teams Panel */
.teams-list {
  display: grid;
  gap: var(--spacing-md);
}

.team-item {
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius-md);
  border-left: 4px solid var(--team-color);
}

.team-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.team-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--team-color);
}

.team-name {
  font-weight: 600;
}

.team-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
}

.stat {
  text-align: center;
  padding: var(--spacing-xs);
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--border-radius-sm);
}

.stat.total {
  background: rgba(108, 92, 231, 0.2);
}

.stat-label {
  display: block;
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.stat-value {
  font-weight: 700;
  font-size: 0.9rem;
}

/* QR Panel */
.qr-links {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.qr-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--border-radius-sm);
}

.qr-url {
  flex: 1;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Admin Login */
.admin-login-overlay {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: var(--spacing-xl);
  background: var(--bg-card);
  border-radius: var(--border-radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.login-card h1 {
  font-size: 1.75rem;
  margin-bottom: var(--spacing-xl);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.login-form .form-group {
  text-align: left;
}

.login-form .form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.auth-error {
  color: var(--danger);
  font-size: 0.875rem;
  margin: 0;
}

/* Questions Section — separate from main grid */
.admin-questions-section {
  margin-top: var(--spacing-lg);
}

.questions-panel {
  /* no grid-column needed, it's standalone now */
}

.questions-panel h2 {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.question-count {
  font-size: 0.75rem;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(108, 92, 231, 0.2);
  border-radius: var(--border-radius-full);
  color: var(--primary);
  margin-left: auto;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.question-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--border-radius-md);
  transition: border-color 0.2s;
}

.question-card.expanded {
  border-color: rgba(108, 92, 231, 0.4);
}

.question-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.question-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.question-number {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-secondary);
  min-width: 2rem;
}

.question-type-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: var(--border-radius-full);
  white-space: nowrap;
}

.question-type-badge.star {
  background: rgba(234, 179, 8, 0.2);
  color: #EAB308;
}

.question-type-badge.coin {
  background: rgba(0, 184, 148, 0.2);
  color: #00B894;
}

.question-type-badge.shell {
  background: rgba(225, 112, 85, 0.2);
  color: #E17055;
}

.question-text-preview {
  flex: 1;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expand-icon {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-left: auto;
}

.question-body {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.q-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.q-field label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.q-field .input {
  padding: var(--spacing-sm);
  background: var(--bg-card-hover);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.q-field select.input {
  cursor: pointer;
}

.option-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.option-row input[type="radio"] {
  accent-color: var(--primary);
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.option-input {
  flex: 1;
}

.btn-icon {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 4px 8px;
  border-radius: var(--border-radius-sm);
  transition: all 0.15s;
}

.btn-icon:hover {
  color: var(--danger);
  background: rgba(225, 112, 85, 0.15);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 0.8rem;
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  color: var(--text-secondary);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.correct-hint {
  font-size: 0.85rem;
  color: var(--success);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(0, 184, 148, 0.1);
  border-radius: var(--border-radius-sm);
}

.questions-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}
</style>
