<template>
  <div class="horse-race-3d" ref="containerRef"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const containerRef = ref(null)

let scene, camera, renderer, animationId
let horses = []
let hurdles = []
let track
const clock = new THREE.Clock()

// Configuration
const TRACK_LENGTH = 40
const TRACK_WIDTH = 8
const HURDLE_POSITIONS = [12, 26] // Position along track

function init() {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)
  scene.fog = new THREE.Fog(0x1a1a2e, 15, 50)

  // Camera - positioned to see the track from side/above
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(-8, 6, 12)
  camera.lookAt(5, 0, 0)

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  containerRef.value.appendChild(renderer.domElement)

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 20, 10)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  // Create track
  createTrack()

  // Create hurdles
  createHurdles()

  // Create horses
  createHorses()

  // Start animation
  animate()
}

function createTrack() {
  // Track base (green grass)
  const trackGeometry = new THREE.PlaneGeometry(TRACK_LENGTH, TRACK_WIDTH)
  const trackMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d5a3f,
    roughness: 0.8
  })
  track = new THREE.Mesh(trackGeometry, trackMaterial)
  track.rotation.x = -Math.PI / 2
  track.position.set(TRACK_LENGTH / 2 - 5, 0, 0)
  track.receiveShadow = true
  scene.add(track)

  // Lane lines
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true })

  for (let i = -1; i <= 1; i += 2) {
    const lineGeometry = new THREE.PlaneGeometry(TRACK_LENGTH, 0.05)
    const line = new THREE.Mesh(lineGeometry, lineMaterial)
    line.rotation.x = -Math.PI / 2
    line.position.set(TRACK_LENGTH / 2 - 5, 0.01, i * TRACK_WIDTH / 3)
    scene.add(line)
  }

  // Track stripes (moving texture simulation via multiple small planes)
  for (let i = 0; i < 20; i++) {
    const stripeGeometry = new THREE.PlaneGeometry(0.1, TRACK_WIDTH * 0.9)
    const stripeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.1,
      transparent: true
    })
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial)
    stripe.rotation.x = -Math.PI / 2
    stripe.position.set(i * 2, 0.01, 0)
    stripe.userData.initialX = i * 2
    scene.add(stripe)
  }
}

function createHurdles() {
  HURDLE_POSITIONS.forEach((pos, index) => {
    const hurdleGroup = new THREE.Group()

    // Horizontal bar across the track
    const barGeometry = new THREE.CylinderGeometry(0.08, 0.08, TRACK_WIDTH * 0.9, 8)
    const barMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })
    const bar = new THREE.Mesh(barGeometry, barMaterial)
    bar.rotation.x = Math.PI / 2
    bar.position.set(0, 0.8, 0)
    bar.castShadow = true
    hurdleGroup.add(bar)

    // Posts on each end
    const postGeometry = new THREE.BoxGeometry(0.15, 1, 0.15)
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 })

    const leftPost = new THREE.Mesh(postGeometry, postMaterial)
    leftPost.position.set(0, 0.5, -TRACK_WIDTH * 0.45)
    leftPost.castShadow = true
    hurdleGroup.add(leftPost)

    const rightPost = new THREE.Mesh(postGeometry, postMaterial)
    rightPost.position.set(0, 0.5, TRACK_WIDTH * 0.45)
    rightPost.castShadow = true
    hurdleGroup.add(rightPost)

    // Label (using sprite for 2D text in 3D space)
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(index === 0 ? 'IBM' : '2026 Spring Gala', 128, 40)

    const texture = new THREE.CanvasTexture(canvas)
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(3, 0.75, 1)
    sprite.position.set(0, 1.5, 0)
    hurdleGroup.add(sprite)

    hurdleGroup.position.set(pos, 0, 0)
    hurdleGroup.userData.initialX = pos
    scene.add(hurdleGroup)
    hurdles.push(hurdleGroup)
  })
}

function createHorses() {
  const lanePositions = [-2, 0, 2] // Z positions for 3 lanes
  const colors = [0xff6b6b, 0x4ecdc4, 0xffd93d]

  lanePositions.forEach((zPos, index) => {
    const horseGroup = new THREE.Group()

    // Horse body (simplified geometry)
    const bodyGeometry = new THREE.BoxGeometry(1.2, 0.6, 0.5)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: colors[index] })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.set(0, 0.5, 0)
    body.castShadow = true
    horseGroup.add(body)

    // Horse head
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.35)
    const head = new THREE.Mesh(headGeometry, bodyMaterial)
    head.position.set(0.7, 0.7, 0)
    head.castShadow = true
    horseGroup.add(head)

    // Legs (4 cylinders)
    const legGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6)
    const legMaterial = new THREE.MeshStandardMaterial({ color: colors[index] })

    const legPositions = [
      [0.4, 0.2, 0.15], [0.4, 0.2, -0.15],
      [-0.4, 0.2, 0.15], [-0.4, 0.2, -0.15]
    ]

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.set(...pos)
      leg.castShadow = true
      horseGroup.add(leg)
    })

    // Rider (simple figure)
    const riderGeometry = new THREE.CapsuleGeometry(0.15, 0.3, 4, 8)
    const riderMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const rider = new THREE.Mesh(riderGeometry, riderMaterial)
    rider.position.set(0, 1, 0)
    rider.castShadow = true
    horseGroup.add(rider)

    // Position horse
    horseGroup.position.set(3, 0, zPos)
    horseGroup.userData.laneZ = zPos
    horseGroup.userData.phase = index * 0.3 // Offset for gallop animation

    scene.add(horseGroup)
    horses.push(horseGroup)
  })
}

function animate() {
  animationId = requestAnimationFrame(animate)

  const elapsedTime = clock.getElapsedTime()
  const speed = 5 // Track movement speed

  // Move track stripes (treadmill effect)
  scene.children.forEach(child => {
    if (child.userData.initialX !== undefined && child.geometry?.type === 'PlaneGeometry') {
      child.position.x = ((child.userData.initialX - elapsedTime * speed) % 40 + 40) % 40 - 5
    }
  })

  // Move hurdles from right to left
  hurdles.forEach(hurdle => {
    hurdle.position.x = ((hurdle.userData.initialX - elapsedTime * speed) % (TRACK_LENGTH + 20) + TRACK_LENGTH + 20) % (TRACK_LENGTH + 20) - 10
  })

  // Animate horses (galloping motion)
  horses.forEach((horse, index) => {
    const phase = elapsedTime * 15 + horse.userData.phase

    // Gallop bobbing
    horse.position.y = Math.abs(Math.sin(phase)) * 0.15

    // Check if hurdle is near and jump
    hurdles.forEach(hurdle => {
      const distance = hurdle.position.x - horse.position.x
      if (distance > -1 && distance < 2) {
        // Jump!
        horse.position.y = Math.sin((2 - distance) * Math.PI / 3) * 0.8
      }
    })
  })

  renderer.render(scene, camera)
}

function handleResize() {
  if (!containerRef.value || !camera || !renderer) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

onMounted(() => {
  init()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) {
    renderer.dispose()
    containerRef.value?.removeChild(renderer.domElement)
  }
})
</script>

<style scoped>
.horse-race-3d {
  width: 360px;
  height: 160px;
  margin: 0 auto var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
}

@media (max-width: 400px) {
  .horse-race-3d {
    width: 300px;
    height: 140px;
  }
}
</style>
