<template>
  <div class="home-view">
    <!-- Background particles -->
    <div class="particles-bg"></div>
    
    <!-- Main Content -->
    <div class="home-content animate-fadeIn">
      <!-- Logo & Title -->
      <div class="logo-section">
        <div class="logo-icon">🎉</div>
        <h1 class="title text-gradient">春酒互動遊戲</h1>
        <p class="subtitle">準備好一起嗨翻全場了嗎？</p>
      </div>
      
      <!-- Role Selection -->
      <div class="role-cards">
        <router-link to="/player" class="role-card player-card">
          <div class="role-icon">📱</div>
          <h2>玩家入口</h2>
          <p>用手機加入遊戲</p>
        </router-link>
        
        <router-link to="/screen" class="role-card screen-card">
          <div class="role-icon">📺</div>
          <h2>大螢幕</h2>
          <p>投影畫面</p>
        </router-link>
        
        <router-link to="/admin" class="role-card admin-card">
          <div class="role-icon">⚙️</div>
          <h2>管理員</h2>
          <p>控制遊戲</p>
        </router-link>
      </div>
      
      <!-- Status -->
      <div class="status-bar" v-if="gameStore.connected">
        <span class="status-dot online"></span>
        <span>已連線 · {{ gameStore.playerCount }} 位玩家在線</span>
      </div>
      <div class="status-bar" v-else>
        <span class="status-dot offline"></span>
        <span>連線中...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  position: relative;
  overflow: hidden;
}

.particles-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(circle at 20% 80%, rgba(108, 92, 231, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(0, 206, 201, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(253, 121, 168, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.home-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 800px;
  width: 100%;
}

.logo-section {
  margin-bottom: var(--spacing-2xl);
}

.logo-icon {
  font-size: 5rem;
  margin-bottom: var(--spacing-md);
  animation: bounce 2s ease infinite;
}

.title {
  font-size: 3rem;
  font-weight: 900;
  margin-bottom: var(--spacing-sm);
}

.subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
}

.role-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-2xl);
}

.role-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl);
  background: var(--bg-card);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-lg);
  text-decoration: none;
  color: var(--text-primary);
  transition: all var(--transition-normal);
}

.role-card:hover {
  transform: translateY(-8px);
  border-color: var(--primary);
  box-shadow: var(--shadow-glow);
}

.role-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
}

.role-card h2 {
  font-size: 1.25rem;
  margin-bottom: var(--spacing-xs);
}

.role-card p {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.player-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 30px rgba(253, 121, 168, 0.5);
}

.screen-card:hover {
  border-color: var(--secondary);
  box-shadow: 0 0 30px rgba(0, 206, 201, 0.5);
}

.admin-card:hover {
  border-color: var(--accent-alt);
  box-shadow: 0 0 30px rgba(253, 203, 110, 0.5);
}

.status-bar {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-card);
  border-radius: var(--border-radius-full);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: var(--success);
  box-shadow: 0 0 10px var(--success);
}

.status-dot.offline {
  background: var(--warning);
  animation: pulse 1s ease infinite;
}

@media (max-width: 768px) {
  .title {
    font-size: 2rem;
  }
  
  .logo-icon {
    font-size: 4rem;
  }
  
  .role-cards {
    grid-template-columns: 1fr;
  }
}
</style>
