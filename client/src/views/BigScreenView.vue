<template>
  <div class="big-screen" ref="screenContainer">
    <!-- Waiting Screen -->
    <div v-if="gameStore.gamePhase === 'waiting'" class="waiting-overlay">
      <div class="waiting-content">
        <h1 class="event-title text-glow">🎉 春酒互動遊戲 🎉</h1>
        <p class="event-subtitle">掃描 QR Code 加入遊戲</p>
        
        <div class="qr-container">
          <div class="qr-placeholder">
            <span>📱</span>
            <p>{{ playerUrl }}</p>
          </div>
        </div>
        
        <div class="player-counter">
          <span class="counter-number">{{ gameStore.playerCount }}</span>
          <span class="counter-label">位玩家已加入</span>
        </div>
        
        <div class="team-stats">
          <div 
            v-for="team in gameStore.teams" 
            :key="team.id" 
            class="team-stat"
            :style="{ '--team-color': team.color }"
          >
            <span class="team-dot"></span>
            <span class="team-name">{{ team.name }}</span>
            <span class="team-count">{{ team.playerCount || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Phase 1: Horse Racing -->
    <div v-else-if="gameStore.gamePhase === 'phase1'" class="phase1-overlay">
      <!-- PixiJS Canvas Container -->
      <div ref="pixiContainer" class="pixi-container"></div>
      
      <!-- Overlay UI -->
      <div class="race-ui">
        <div class="race-header">
          <h1 class="race-title">🏇 數位賽馬大賽</h1>
          <div class="countdown" :class="{ warning: gameStore.remainingTime <= 5 }">
            {{ gameStore.remainingTime }}
          </div>
        </div>
        
        <div class="leaderboard-panel">
          <h2>🏆 即時排行榜</h2>
          <div class="leaderboard-list">
            <div 
              v-for="(player, index) in gameStore.leaderboard?.slice(0, 10)" 
              :key="player.id"
              class="leaderboard-item"
              :class="{ 
                'top-1': index === 0, 
                'top-2': index === 1, 
                'top-3': index === 2 
              }"
            >
              <span class="rank-badge" :class="getRankClass(index)">{{ index + 1 }}</span>
              <span class="player-name">{{ player.nickname }}</span>
              <span class="player-score">{{ player.score }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Phase 2: Quiz Game -->
    <div v-else-if="gameStore.gamePhase === 'phase2'" class="phase2-overlay">
      <!-- Question Display -->
      <div v-if="gameStore.currentQuestion" class="question-display">
        <div class="question-header-big">
          <span class="question-number-big">Q{{ gameStore.currentQuestion.questionNumber }}</span>
          <span 
            v-if="gameStore.currentQuestion.type === 'star'" 
            class="question-badge star"
          >
            ⭐ 無敵星星 - 答錯免扣分
          </span>
          <span 
            v-else-if="gameStore.currentQuestion.type === 'banana'" 
            class="question-badge banana"
          >
            🍌 香蕉皮 - 答錯加倍扣分
          </span>
        </div>
        
        <h1 class="question-text-big">{{ gameStore.currentQuestion.text }}</h1>
        
        <div class="options-grid-big">
          <div 
            v-for="(option, index) in gameStore.currentQuestion.options" 
            :key="index"
            class="option-card-big"
            :class="{
              correct: gameStore.currentQuestion.correctIndex === index,
              revealed: gameStore.currentQuestion.correctIndex !== undefined
            }"
          >
            <span class="option-label-big">{{ optionLabels[index] }}</span>
            <span class="option-text-big">{{ option }}</span>
          </div>
        </div>
      </div>
      
      <!-- Team Horse Power -->
      <div class="team-power-panel">
        <h2>🐴 隊伍馬力值</h2>
        <div class="power-bars">
          <div 
            v-for="team in sortedTeams" 
            :key="team.id" 
            class="power-bar-item"
          >
            <div class="power-bar-label">
              <span class="team-dot" :style="{ background: team.color }"></span>
              <span>{{ team.name }}</span>
            </div>
            <div class="power-bar">
              <div 
                class="power-bar-fill" 
                :style="{ 
                  width: `${Math.min(team.horsePower, 200)}%`,
                  background: team.color 
                }"
              ></div>
            </div>
            <span class="power-value">{{ team.horsePower }} HP</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Finished Screen -->
    <div v-else-if="gameStore.gamePhase === 'finished'" class="finished-overlay">
      <div class="finished-content-big animate-scaleIn">
        <div class="confetti">🎊</div>
        <h1 class="winner-title">🏆 遊戲結束 🏆</h1>
        
        <div class="final-podium">
          <div class="podium-item second" v-if="gameStore.teams?.[1]">
            <div class="podium-rank">🥈</div>
            <div class="podium-team">{{ gameStore.teams[1].name }}</div>
            <div class="podium-score">{{ gameStore.teams[1].horsePower }} HP</div>
            <div class="podium-stand"></div>
          </div>
          
          <div class="podium-item first" v-if="gameStore.teams?.[0]">
            <div class="podium-rank">🥇</div>
            <div class="podium-team">{{ gameStore.teams[0].name }}</div>
            <div class="podium-score">{{ gameStore.teams[0].horsePower }} HP</div>
            <div class="podium-stand"></div>
          </div>
          
          <div class="podium-item third" v-if="gameStore.teams?.[2]">
            <div class="podium-rank">🥉</div>
            <div class="podium-team">{{ gameStore.teams[2].name }}</div>
            <div class="podium-score">{{ gameStore.teams[2].horsePower }} HP</div>
            <div class="podium-stand"></div>
          </div>
        </div>
        
        <p class="thanks-message">感謝所有玩家的參與！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from '../stores/game'
import * as PIXI from 'pixi.js'
import gsap from 'gsap'

const gameStore = useGameStore()
const screenContainer = ref(null)
const pixiContainer = ref(null)
const optionLabels = ['A', 'B', 'C', 'D']

// PixiJS app
let pixiApp = null
let horses = []

const playerUrl = computed(() => {
  return window.location.origin + '/player'
})

const sortedTeams = computed(() => {
  return [...(gameStore.teams || [])].sort((a, b) => b.horsePower - a.horsePower)
})

function getRankClass(index) {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return ''
}

// Initialize PixiJS for horse racing
function initPixi() {
  if (!pixiContainer.value || pixiApp) return
  
  pixiApp = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a472a,
    antialias: true
  })
  
  pixiContainer.value.appendChild(pixiApp.view)
  
  // Create race track
  createRaceTrack()
  
  // Create horses for top players
  createHorses()
}

function createRaceTrack() {
  const track = new PIXI.Graphics()
  
  // Draw track lanes
  const laneHeight = 60
  const numLanes = 10
  const startY = (pixiApp.screen.height - (laneHeight * numLanes)) / 2
  
  for (let i = 0; i < numLanes; i++) {
    // Lane background
    track.beginFill(i % 2 === 0 ? 0x2d5a3f : 0x1a472a)
    track.drawRect(0, startY + i * laneHeight, pixiApp.screen.width, laneHeight)
    track.endFill()
    
    // Lane divider
    track.lineStyle(2, 0xffffff, 0.3)
    track.moveTo(0, startY + i * laneHeight)
    track.lineTo(pixiApp.screen.width, startY + i * laneHeight)
  }
  
  // Start line
  track.lineStyle(4, 0xffffff, 0.8)
  track.moveTo(100, startY)
  track.lineTo(100, startY + numLanes * laneHeight)
  
  // Finish line
  track.moveTo(pixiApp.screen.width - 100, startY)
  track.lineTo(pixiApp.screen.width - 100, startY + numLanes * laneHeight)
  
  pixiApp.stage.addChild(track)
}

function createHorses() {
  const laneHeight = 60
  const numLanes = 10
  const startY = (pixiApp.screen.height - (laneHeight * numLanes)) / 2
  
  horses = []
  
  for (let i = 0; i < numLanes; i++) {
    const horse = new PIXI.Text('🐎', {
      fontSize: 40
    })
    
    horse.x = 120
    horse.y = startY + i * laneHeight + laneHeight / 2 - 20
    horse.laneIndex = i
    
    pixiApp.stage.addChild(horse)
    horses.push(horse)
  }
}

function updateHorsePositions() {
  const leaderboard = gameStore.leaderboard || []
  const trackWidth = pixiApp.screen.width - 250
  const maxScore = leaderboard[0]?.score || 1
  
  leaderboard.slice(0, 10).forEach((player, index) => {
    if (horses[index]) {
      const progress = Math.min(player.score / maxScore, 1)
      const targetX = 120 + progress * trackWidth
      
      gsap.to(horses[index], {
        x: targetX,
        duration: 0.3,
        ease: 'power2.out'
      })
    }
  })
}

function destroyPixi() {
  if (pixiApp) {
    pixiApp.destroy(true)
    pixiApp = null
    horses = []
  }
}

// Watch for leaderboard updates
watch(() => gameStore.leaderboard, () => {
  if (pixiApp && gameStore.gamePhase === 'phase1') {
    updateHorsePositions()
  }
}, { deep: true })

// Watch for phase changes
watch(() => gameStore.gamePhase, (newPhase) => {
  if (newPhase === 'phase1') {
    setTimeout(initPixi, 100)
  } else {
    destroyPixi()
  }
})

onMounted(() => {
  gameStore.joinAsScreen()
  
  if (gameStore.gamePhase === 'phase1') {
    initPixi()
  }
})

onUnmounted(() => {
  destroyPixi()
})
</script>

<style scoped>
.big-screen {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--gradient-dark);
  position: relative;
}

/* Waiting Screen */
.waiting-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: 
    radial-gradient(circle at 20% 80%, rgba(108, 92, 231, 0.4) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(0, 206, 201, 0.4) 0%, transparent 50%),
    var(--gradient-dark);
}

.waiting-content {
  text-align: center;
}

.event-title {
  font-size: 5rem;
  font-weight: 900;
  color: white;
  margin-bottom: var(--spacing-md);
}

.event-subtitle {
  font-size: 2rem;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-2xl);
}

.qr-container {
  margin-bottom: var(--spacing-2xl);
}

.qr-placeholder {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl);
  background: white;
  border-radius: var(--border-radius-lg);
  color: #333;
}

.qr-placeholder span {
  font-size: 8rem;
}

.qr-placeholder p {
  font-size: 1rem;
  margin-top: var(--spacing-md);
  color: var(--primary);
}

.player-counter {
  margin-bottom: var(--spacing-2xl);
}

.counter-number {
  font-size: 8rem;
  font-weight: 900;
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.counter-label {
  display: block;
  font-size: 1.5rem;
  color: var(--text-secondary);
}

.team-stats {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
  flex-wrap: wrap;
}

.team-stat {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-card);
  border-radius: var(--border-radius-full);
}

.team-stat .team-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--team-color);
}

.team-stat .team-name {
  font-weight: 500;
}

.team-stat .team-count {
  font-weight: 700;
  color: var(--accent-alt);
}

/* Phase 1 Overlay */
.phase1-overlay {
  width: 100%;
  height: 100%;
  position: relative;
}

.pixi-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.race-ui {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
}

.race-header {
  position: absolute;
  top: var(--spacing-xl);
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

.race-title {
  font-size: 3rem;
  color: white;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  margin-bottom: var(--spacing-md);
}

.leaderboard-panel {
  position: absolute;
  top: var(--spacing-xl);
  right: var(--spacing-xl);
  width: 350px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  pointer-events: auto;
}

.leaderboard-panel h2 {
  font-size: 1.5rem;
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius-md);
}

.leaderboard-item.top-1 {
  background: rgba(249, 202, 36, 0.2);
  border: 1px solid rgba(249, 202, 36, 0.5);
}

.leaderboard-item.top-2 {
  background: rgba(192, 192, 192, 0.2);
  border: 1px solid rgba(192, 192, 192, 0.5);
}

.leaderboard-item.top-3 {
  background: rgba(205, 127, 50, 0.2);
  border: 1px solid rgba(205, 127, 50, 0.5);
}

.player-name {
  flex: 1;
  font-weight: 500;
}

.player-score {
  font-weight: 700;
  color: var(--accent-alt);
}

/* Phase 2 Overlay */
.phase2-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-2xl);
}

.question-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.question-header-big {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.question-number-big {
  font-size: 3rem;
  font-weight: 900;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.question-badge {
  font-size: 1.5rem;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--border-radius-full);
}

.question-badge.star {
  background: linear-gradient(135deg, #F9CA24, #F0932B);
  color: #000;
}

.question-badge.banana {
  background: linear-gradient(135deg, #FDCB6E, #E17055);
  color: #fff;
}

.question-text-big {
  font-size: 4rem;
  text-align: center;
  max-width: 80%;
  margin-bottom: var(--spacing-2xl);
  line-height: 1.3;
}

.options-grid-big {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
  width: 80%;
  max-width: 1200px;
}

.option-card-big {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl);
  background: var(--bg-card);
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-lg);
  transition: all var(--transition-normal);
}

.option-card-big.revealed.correct {
  background: rgba(0, 184, 148, 0.3);
  border-color: var(--success);
  transform: scale(1.05);
}

.option-label-big {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-primary);
  border-radius: 50%;
  font-size: 1.5rem;
  font-weight: 700;
  flex-shrink: 0;
}

.option-text-big {
  font-size: 1.75rem;
  font-weight: 500;
}

/* Team Power Panel */
.team-power-panel {
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-top: var(--spacing-xl);
}

.team-power-panel h2 {
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.power-bars {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.power-bar-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.power-bar-label {
  width: 150px;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.power-bar-label .team-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.power-bar {
  flex: 1;
  height: 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-full);
  overflow: hidden;
}

.power-bar-fill {
  height: 100%;
  border-radius: var(--border-radius-full);
  transition: width 0.5s ease;
}

.power-value {
  width: 100px;
  text-align: right;
  font-weight: 700;
  color: var(--accent-alt);
}

/* Finished Overlay */
.finished-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: 
    radial-gradient(circle at 50% 50%, rgba(249, 202, 36, 0.2) 0%, transparent 60%),
    var(--gradient-dark);
}

.finished-content-big {
  text-align: center;
}

.confetti {
  font-size: 8rem;
  margin-bottom: var(--spacing-lg);
  animation: bounce 1s ease infinite;
}

.winner-title {
  font-size: 5rem;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--spacing-2xl);
}

.final-podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-2xl);
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.podium-rank {
  font-size: 5rem;
  margin-bottom: var(--spacing-md);
}

.podium-team {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
}

.podium-score {
  font-size: 1.5rem;
  color: var(--accent-alt);
  margin-bottom: var(--spacing-md);
}

.podium-stand {
  width: 200px;
  background: var(--gradient-primary);
  border-radius: var(--border-radius-md) var(--border-radius-md) 0 0;
}

.podium-item.first .podium-stand {
  height: 150px;
}

.podium-item.second .podium-stand {
  height: 100px;
}

.podium-item.third .podium-stand {
  height: 60px;
}

.thanks-message {
  font-size: 2rem;
  color: var(--text-secondary);
}
</style>
