import { defineStore } from 'pinia'
import { io } from 'socket.io-client'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  // Socket connection
  const socket = ref(null)
  const connected = ref(false)

  // Player data
  const player = ref(null)
  const team = ref(null)

  // Game state
  const gamePhase = ref('waiting') // waiting, round1, round1_result, round2_warmup, round2, round2_result, finished
  const isRunning = ref(false)
  const currentRound = ref(0)
  const settings = ref({})
  const gameId = ref(null)  // 遊戲場次識別碼

  // Score data
  const score = ref(0)
  const totalScore = ref(0)
  const leaderboard = ref([])

  // Round state
  const bonusStage = ref(0)
  const buttonPosition = ref(0)    // Round 1 按鈕位置
  const motionType = ref('twist')  // Round 2 搖晃類型

  // Teams and players
  const teams = ref([])
  const playerCount = ref(0)

  // Session storage key
  const SESSION_KEY = 'spring-gala-session'

  // Connect to server
  function connect() {
    const serverUrl = import.meta.env.PROD
      ? window.location.origin
      : 'http://localhost:3000'

    socket.value = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,  // 無限重連
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    // Connection events
    socket.value.on('connect', () => {
      connected.value = true
      console.log('Connected to game server')

      // 嘗試自動重連已有的 session
      tryAutoReconnect()
    })

    socket.value.on('disconnect', () => {
      connected.value = false
      console.log('Disconnected from game server')
    })

    // Player events
    socket.value.on('player:joined', (data) => {
      player.value = data.player
      team.value = data.team
      score.value = data.player.round1Score || 0
      totalScore.value = data.player.totalScore || 0
      gameId.value = data.gameState.gameId
      updateGameState(data.gameState)

      // 儲存 sessionToken 到 localStorage（安全機制）
      if (data.sessionToken) {
        saveSession(data.sessionToken)
      }

      if (data.isReconnect) {
        console.log('Session restored! Score:', data.player.round1Score, data.player.round2Score)
      }
    })

    // 遊戲重置事件（新場次開始）
    socket.value.on('game:reset', (data) => {
      console.log('Game reset! New ID:', data.gameId)
      gameId.value = data.gameId
      player.value = null
      team.value = null
      score.value = 0
      totalScore.value = 0
      gamePhase.value = 'waiting'
      clearSession()
    })

    // 被踢出事件（同 employeeId 在其他裝置登入）
    socket.value.on('player:kicked', (data) => {
      console.log('Kicked:', data.reason)
      player.value = null
      team.value = null
      clearSession()
      alert(data.reason || '您已被踢出遊戲')
    })

    socket.value.on('players:count', (data) => {
      playerCount.value = data.total
      teams.value = data.teams
    })


    // Screen init (big screen receives full state)
    socket.value.on('screen:init', (data) => {
      if (data.settings) {
        settings.value = data.settings
      }
      if (data.teams) {
        teams.value = data.teams
      }
      if (data.gameState) {
        updateGameState(data.gameState)
      }
      console.log('Screen initialized with settings:', data.settings)
    })

    // Settings update (for screens when admin changes settings)
    socket.value.on('settings:update', (newSettings) => {
      settings.value = newSettings
      console.log('Settings updated:', newSettings)
    })

    // Admin init - sync settings from server
    socket.value.on('admin:init', (data) => {
      if (data.settings) {
        settings.value = data.settings
      }
      if (data.teams) {
        teams.value = data.teams
      }
      if (data.gameState) {
        updateGameState(data.gameState)
      }
      console.log('Admin initialized with settings:', data.settings)
    })

    // Game events
    socket.value.on('game:start', (data) => {
      gamePhase.value = data.phase
      currentRound.value = data.round || 0
      isRunning.value = true
      score.value = 0
      bonusStage.value = 0
      buttonPosition.value = 0
      motionType.value = 'twist'
    })

    socket.value.on('game:stop', () => {
      isRunning.value = false
    })

    // Round 1 events
    socket.value.on('round1:start', (data) => {
      gamePhase.value = 'round1'
      currentRound.value = 1
      isRunning.value = true
      score.value = 0
      bonusStage.value = 0
      buttonPosition.value = 0
    })

    socket.value.on('round1:end', (data) => {
      gamePhase.value = 'round1_result'
      isRunning.value = false
      leaderboard.value = data.leaderboard
      teams.value = data.teams
    })

    socket.value.on('round2:warmup', () => {
      gamePhase.value = 'round2_warmup'
    })

    // Round 2 events
    socket.value.on('round2:start', (data) => {
      gamePhase.value = 'round2'
      currentRound.value = 2
      isRunning.value = true
      score.value = 0
      bonusStage.value = 0
      motionType.value = 'twist'
    })

    socket.value.on('round2:end', (data) => {
      gamePhase.value = 'round2_result'
      isRunning.value = false
      leaderboard.value = data.leaderboard
      teams.value = data.teams
    })

    // Player score update
    socket.value.on('player:score', (data) => {
      score.value = data.score
      totalScore.value = data.totalScore
    })

    // Bonus change
    socket.value.on('bonus:change', (data) => {
      bonusStage.value = data.bonusStage
      buttonPosition.value = data.buttonPosition
      motionType.value = data.motionType
    })

    // Leaderboard
    socket.value.on('leaderboard:show', (data) => {
      leaderboard.value = data.leaderboard
      teams.value = data.teams
    })

    // Race update (for screens)
    socket.value.on('race:update', (data) => {
      // Update target score in settings
      if (data.targetScore) {
        if (data.round === 1) {
          settings.value = { ...settings.value, round1TargetScore: data.targetScore }
        } else if (data.round === 2) {
          settings.value = { ...settings.value, round2TargetScore: data.targetScore }
        }
      }

      // Update team scores from race data
      if (data.horses && teams.value) {
        data.horses.forEach(horse => {
          const team = teams.value.find(t => t.id === horse.teamId)
          if (team) {
            if (data.round === 1) {
              team.round1Score = horse.score
            } else if (data.round === 2) {
              team.round2Score = horse.score
            }
            team.totalScore = (team.round1Score || 0) + (team.round2Score || 0)
          }
        })
        // Trigger reactivity
        teams.value = [...teams.value]
      }
      bonusStage.value = data.bonusStage || 0
    })
  }

  function updateGameState(state) {
    gamePhase.value = state.phase
    isRunning.value = state.isRunning
    currentRound.value = state.currentRound || 0
    playerCount.value = state.playerCount
    settings.value = state.settings
  }

  // Player actions
  function joinGame(employeeId, teamId, sessionGameId = null) {
    socket.value?.emit('player:join', {
      employeeId,
      teamId
    })
  }

  function sendTap() {
    socket.value?.emit('player:action', { type: 'tap' })
  }

  function sendShake(gyroZ, accelY) {
    socket.value?.emit('player:action', { type: 'shake', gyroZ, accelY })
  }

  // Screen actions
  function joinAsScreen() {
    socket.value?.emit('screen:join')
  }

  // Admin actions
  function joinAsAdmin() {
    socket.value?.emit('admin:join')
  }

  function startRound(round) {
    socket.value?.emit('admin:startRound', { round })
  }

  function startWarmup() {
    socket.value?.emit('admin:startWarmup')
  }

  function updateSettings(newSettings) {
    socket.value?.emit('admin:updateSettings', newSettings)
  }

  // Session 管理函數 - 只存 sessionToken（安全機制）
  function saveSession(sessionToken) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        sessionToken,
        savedAt: Date.now()
      }))
    } catch (e) {
      console.warn('Failed to save session:', e)
    }
  }

  function getSession() {
    try {
      const data = localStorage.getItem(SESSION_KEY)
      if (!data) return null

      const session = JSON.parse(data)
      // Session 有效期 30 分鐘
      if (Date.now() - session.savedAt > 30 * 60 * 1000) {
        clearSession()
        return null
      }
      return session
    } catch (e) {
      return null
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch (e) {
      console.warn('Failed to clear session:', e)
    }
  }

  function tryAutoReconnect() {
    // 如果已經有 player 資料，不需要重連
    if (player.value) return

    const session = getSession()
    if (session && session.sessionToken) {
      console.log('Attempting auto-reconnect with sessionToken')
      // 傳送 sessionToken 供後端驗證
      socket.value?.emit('player:join', { sessionToken: session.sessionToken })
    }
  }

  return {
    // State
    socket,
    connected,
    player,
    team,
    gamePhase,
    isRunning,
    currentRound,
    settings,
    score,
    totalScore,
    leaderboard,
    bonusStage,
    buttonPosition,
    motionType,
    teams,
    playerCount,

    // Actions
    connect,
    joinGame,
    sendTap,
    sendShake,
    joinAsScreen,
    joinAsAdmin,
    startRound,
    startWarmup,
    updateSettings,
    clearSession
  }
})
