import { defineStore } from 'pinia'
import { io } from 'socket.io-client'
import { ref, computed } from 'vue'

export const useGameStore = defineStore('game', () => {
  // Socket connection
  const socket = ref(null)
  const connected = ref(false)

  // Player data
  const player = ref(null)
  const team = ref(null)

  // Game state
  const gamePhase = ref('waiting') // waiting, phase1, phase2, finished
  const isRunning = ref(false)
  const settings = ref({})

  // Phase 1 data
  const score = ref(0)
  const rank = ref(0)
  const leaderboard = ref([])
  const remainingTime = ref(0)

  // Phase 2 data
  const currentQuestion = ref(null)
  const selectedAnswer = ref(null)
  const answered = ref(false)
  const questionResult = ref(null)
  const teams = ref([])

  // Player count
  const playerCount = ref(0)

  // Connect to server
  function connect() {
    const serverUrl = import.meta.env.PROD
      ? window.location.origin
      : 'http://localhost:3000'

    socket.value = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    })

    // Connection events
    socket.value.on('connect', () => {
      connected.value = true
      console.log('Connected to game server')
    })

    socket.value.on('disconnect', () => {
      connected.value = false
      console.log('Disconnected from game server')
    })

    // Player events
    socket.value.on('player:joined', (data) => {
      player.value = data.player
      team.value = data.team
      updateGameState(data.gameState)
    })

    socket.value.on('players:count', (data) => {
      playerCount.value = data.total
      teams.value = data.teams
    })

    // Game events
    socket.value.on('game:start', (data) => {
      gamePhase.value = data.phase
      isRunning.value = true
      settings.value = data.settings
      score.value = 0
      rank.value = 0
    })

    socket.value.on('game:stop', () => {
      isRunning.value = false
    })

    // Phase 1 events
    socket.value.on('phase1:start', (data) => {
      gamePhase.value = 'phase1'
      isRunning.value = true
      remainingTime.value = data.duration
    })

    socket.value.on('phase1:score', (data) => {
      score.value = data.score
    })

    socket.value.on('phase1:rank', (data) => {
      rank.value = data.rank
      score.value = data.score
      remainingTime.value = data.remaining
    })

    socket.value.on('phase1:leaderboard', (data) => {
      leaderboard.value = data.leaderboard
      remainingTime.value = data.remaining
    })

    socket.value.on('phase1:end', (data) => {
      gamePhase.value = 'phase1_result'
      isRunning.value = false
      leaderboard.value = data.leaderboard
      remainingTime.value = 0
    })

    // Phase 2 events
    socket.value.on('phase2:start', (data) => {
      gamePhase.value = 'phase2'
      isRunning.value = true
      teams.value = data.teams
    })

    socket.value.on('phase2:question', (data) => {
      currentQuestion.value = data
      selectedAnswer.value = null
      answered.value = false
      questionResult.value = null
    })

    socket.value.on('phase2:answered', () => {
      answered.value = true
    })

    socket.value.on('phase2:result', (data) => {
      questionResult.value = data
    })

    socket.value.on('phase2:reveal', (data) => {
      teams.value = data.teams
      if (currentQuestion.value) {
        currentQuestion.value.correctIndex = data.correctIndex
      }
    })

    socket.value.on('phase2:end', (data) => {
      gamePhase.value = 'finished'
      isRunning.value = false
      teams.value = data.rankings
    })
  }

  function updateGameState(state) {
    gamePhase.value = state.phase
    isRunning.value = state.isRunning
    playerCount.value = state.playerCount
    settings.value = state.settings
  }

  // Player actions
  function joinGame(nickname, teamId) {
    socket.value?.emit('player:join', { nickname, teamId })
  }

  function sendAction(type, intensity = 1) {
    socket.value?.emit('player:action', { type, intensity })
  }

  function sendAnswer(answerIndex) {
    if (!answered.value) {
      selectedAnswer.value = answerIndex
      socket.value?.emit('player:answer', { answerIndex })
    }
  }

  // Screen actions
  function joinAsScreen() {
    socket.value?.emit('screen:join')
  }

  // Admin actions
  function joinAsAdmin() {
    socket.value?.emit('admin:join')
  }

  return {
    // State
    socket,
    connected,
    player,
    team,
    gamePhase,
    isRunning,
    settings,
    score,
    rank,
    leaderboard,
    remainingTime,
    currentQuestion,
    selectedAnswer,
    answered,
    questionResult,
    teams,
    playerCount,

    // Actions
    connect,
    joinGame,
    sendAction,
    sendAnswer,
    joinAsScreen,
    joinAsAdmin
  }
})
