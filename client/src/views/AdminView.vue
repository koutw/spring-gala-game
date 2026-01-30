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
      
      <!-- Game Controls -->
      <div class="panel control-panel">
        <h2>🎯 遊戲控制</h2>
        
        <div class="control-section">
          <h3>第一階段：數位賽馬</h3>
          <div class="control-row">
            <label>
              遊戲時間（秒）
              <input v-model.number="phase1Duration" type="number" min="10" max="120" />
            </label>
            <label>
              勝出人數
              <input v-model.number="phase1Winners" type="number" min="1" max="50" />
            </label>
          </div>
          <button 
            class="btn btn-primary" 
            @click="startPhase1"
            :disabled="gameStore.isRunning"
          >
            開始賽馬 🏇
          </button>
        </div>
        
        <div class="control-section">
          <h3>第二階段：問答遊戲</h3>
          <div class="control-row">
            <label>
              每題時間（秒）
              <input v-model.number="phase2TimePerQuestion" type="number" min="5" max="60" />
            </label>
          </div>
          <button 
            class="btn btn-secondary" 
            @click="startPhase2"
            :disabled="gameStore.isRunning"
          >
            開始問答 📝
          </button>
        </div>
        
        <div class="control-section">
          <button 
            class="btn btn-danger" 
            @click="stopGame"
            :disabled="!gameStore.isRunning"
          >
            停止遊戲 ⛔
          </button>
        </div>
      </div>
      
      <!-- Question Manager -->
      <div class="panel question-panel">
        <h2>📝 題目管理</h2>
        
        <div class="question-form">
          <div class="form-group">
            <label>題目</label>
            <input v-model="newQuestion.text" class="input" placeholder="輸入題目內容" />
          </div>
          
          <div class="form-group">
            <label>選項</label>
            <div class="options-inputs">
              <input 
                v-for="(_, index) in newQuestion.options" 
                :key="index"
                v-model="newQuestion.options[index]"
                class="input"
                :placeholder="'選項 ' + optionLabels[index]"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>正確答案</label>
              <select v-model.number="newQuestion.correctIndex" class="input">
                <option v-for="(label, index) in optionLabels" :key="index" :value="index">
                  {{ label }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label>題目類型</label>
              <select v-model="newQuestion.type" class="input">
                <option value="normal">一般題</option>
                <option value="star">⭐ 無敵星星</option>
                <option value="banana">🍌 香蕉皮</option>
              </select>
            </div>
          </div>
          
          <button class="btn btn-primary" @click="sendQuestion">
            發送題目 📤
          </button>
        </div>
        
        <div class="question-presets">
          <h3>預設題目</h3>
          <div class="preset-list">
            <div 
              v-for="(q, index) in presetQuestions" 
              :key="index"
              class="preset-item"
            >
              <span class="preset-text">{{ q.text }}</span>
              <button class="btn btn-sm" @click="usePreset(q)">使用</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Teams Overview -->
      <div class="panel teams-panel">
        <h2>👥 隊伍狀態</h2>
        <div class="teams-list">
          <div 
            v-for="team in gameStore.teams" 
            :key="team.id"
            class="team-item"
            :style="{ '--team-color': team.color }"
          >
            <div class="team-header">
              <span class="team-dot"></span>
              <span class="team-name">{{ team.name }}</span>
            </div>
            <div class="team-stats-row">
              <span>{{ team.playerCount || 0 }} 人</span>
              <span class="horse-power">{{ team.horsePower }} HP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
const optionLabels = ['A', 'B', 'C', 'D']

// Phase 1 settings
const phase1Duration = ref(30)
const phase1Winners = ref(10)

// Phase 2 settings
const phase2TimePerQuestion = ref(15)

// New question form
const newQuestion = ref({
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  type: 'normal'
})

// Preset questions
const presetQuestions = ref([
  { text: '公司成立於哪一年？', options: ['2015', '2018', '2020', '2022'], correctIndex: 1, type: 'normal' },
  { text: '我們的吉祥物叫什麼名字？', options: ['小明', '旺財', '阿福', '小黑'], correctIndex: 0, type: 'star' },
  { text: '辦公室在幾樓？', options: ['3樓', '5樓', '7樓', '10樓'], correctIndex: 2, type: 'banana' }
])

const phaseLabel = computed(() => {
  const labels = {
    waiting: '等待中',
    phase1: '第一階段',
    phase2: '第二階段',
    finished: '已結束'
  }
  return labels[gameStore.gamePhase] || '未知'
})

async function startPhase1() {
  try {
    await fetch('/api/admin/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'phase1',
        settings: {
          phase1Duration: phase1Duration.value,
          phase1Winners: phase1Winners.value
        }
      })
    })
  } catch (e) {
    console.error('Failed to start phase 1:', e)
  }
}

async function startPhase2() {
  try {
    await fetch('/api/admin/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'phase2',
        settings: {
          phase2TimePerQuestion: phase2TimePerQuestion.value
        }
      })
    })
  } catch (e) {
    console.error('Failed to start phase 2:', e)
  }
}

async function stopGame() {
  try {
    await fetch('/api/admin/game/stop', { method: 'POST' })
  } catch (e) {
    console.error('Failed to stop game:', e)
  }
}

async function sendQuestion() {
  if (!newQuestion.value.text || newQuestion.value.options.some(o => !o)) {
    alert('請填寫完整的題目和選項')
    return
  }
  
  try {
    await fetch('/api/admin/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: newQuestion.value })
    })
    
    // Reset form
    newQuestion.value = {
      text: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      type: 'normal'
    }
  } catch (e) {
    console.error('Failed to send question:', e)
  }
}

function usePreset(q) {
  newQuestion.value = { ...q, options: [...q.options] }
}

onMounted(() => {
  gameStore.joinAsAdmin()
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

.control-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.control-row label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.control-row input {
  padding: var(--spacing-sm);
  background: var(--bg-card-hover);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-size: 1rem;
}

.btn-danger {
  background: linear-gradient(135deg, #E17055, #D63031);
  color: white;
}

.btn-danger:hover {
  box-shadow: 0 0 20px rgba(225, 112, 85, 0.5);
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: 0.75rem;
}

/* Question Panel */
.question-form {
  margin-bottom: var(--spacing-xl);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.options-inputs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
}

.form-row .form-group {
  flex: 1;
}

.form-row select {
  width: 100%;
}

.question-presets h3 {
  font-size: 1rem;
  margin-bottom: var(--spacing-md);
  color: var(--text-secondary);
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius-sm);
}

.preset-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
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
  margin-bottom: var(--spacing-sm);
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

.team-stats-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.horse-power {
  color: var(--accent-alt);
  font-weight: 600;
}
</style>
