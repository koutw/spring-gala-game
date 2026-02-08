<template>
  <div class="admin-view">
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
            <label>Round 1 總分</label>
            <input v-model.number="settings.round1TargetScore" type="number" min="10000" max="100000" step="5000"
              :disabled="gameStore.isRunning" />
            <span class="setting-hint">Bonus: {{ Math.round(settings.round1TargetScore * 0.5) }}, {{
              Math.round(settings.round1TargetScore * 0.75) }}</span>
          </div>

          <div class="setting-item">
            <label>Round 2 總分</label>
            <input v-model.number="settings.round2TargetScore" type="number" min="5000" max="50000" step="2500"
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
              開始 Round 1（點擊）🏇
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
          <h3>排行榜</h3>
          <div class="leaderboard-controls">
            <button class="btn btn-secondary" @click="showLeaderboard('round1')">
              Round 1 排行榜
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
          <div v-for="team in gameStore.teams" :key="team.id" class="team-item" :style="{ '--team-color': team.color }">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()

// Settings
const settings = reactive({
  round1TargetScore: 40000,
  round2TargetScore: 25000,
  leaderboardSize: 20
})

// Teams info for QR codes
const teamsInfo = [
  { id: 'blue', name: '藍隊', color: '#3B82F6' },
  { id: 'yellow', name: '黃隊', color: '#EAB308' },
  { id: 'red', name: '紅隊', color: '#EF4444' }
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
    round2_result: '最終結果',
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

function stopGame() {
  gameStore.socket?.emit('game:stop')
}

function endRound(round) {
  if (confirm(`確定要結束 Round ${round} 嗎？將立即進入積分畫面。`)) {
    gameStore.socket?.emit('admin:endRound', { round })
  }
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
  gameStore.joinAsAdmin()

  // Load settings from server if available
  if (gameStore.settings) {
    Object.assign(settings, gameStore.settings)
  }
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
</style>
