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
  // Connect to game server on app mount
  gameStore.connect()
})
</script>

<style scoped>
#app-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
