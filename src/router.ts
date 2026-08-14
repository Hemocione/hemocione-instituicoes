import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
import RequestDetail from './views/RequestDetail.vue'
import Events from './views/Events.vue'
import { isAuthenticated, redirectToLogin } from './auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/pedidos/:id', name: 'request-detail', component: RequestDetail },
    { path: '/eventos', name: 'events', component: Events },
  ],
})

router.beforeEach(() => {
  if (!isAuthenticated()) {
    redirectToLogin()
    return false
  }
  return true
})
