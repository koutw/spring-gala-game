<template>
  <div id="app-container">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useGameStore } from './stores/game'

const gameStore = useGameStore()

onMounted(() => {
  // 預先建立 Socket 連線（各 View 也會呼叫 connect，但有防重複機制）
  gameStore.connect()
})
</script>

<style scoped>
#app-container {
  width: 100%;
  height: 100vh;
  overflow: auto;
}
</style>
