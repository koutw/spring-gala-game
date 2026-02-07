import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { vAnimate } from './utils/animations'
import './styles/main.css'

const app = createApp(App)

// 註冊 GSAP 動畫指令
app.directive('animate', vAnimate)

app.use(createPinia())
app.use(router)

app.mount('#app')
