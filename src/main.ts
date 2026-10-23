import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { initAuth, token } from './auth'
import { identifyFromToken, initAnalytics } from './analytics'
import { startHemarcio } from './hemarcio'
import './style.css'

initAnalytics(router)

initAuth().finally(() => {
  identifyFromToken(token.value)
  createApp(App).use(router).mount('#app')
  startHemarcio(router)
})
