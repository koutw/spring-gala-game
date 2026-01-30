import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/player',
    name: 'Player',
    component: () => import('../views/PlayerView.vue')
  },
  {
    path: '/screen',
    name: 'Screen',
    component: () => import('../views/BigScreenView.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/AdminView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
