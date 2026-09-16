import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
import RequestDetail from './views/RequestDetail.vue'
import InterestCampaign from './views/InterestCampaign.vue'
import CertificationPage from './views/CertificationPage.vue'
import Members from './views/Members.vue'
import AcceptInvite from './views/AcceptInvite.vue'
import CreateInstitution from './views/CreateInstitution.vue'
import { isAuthenticated, redirectToLogin } from './auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/instituicoes/nova', name: 'create-institution', component: CreateInstitution },
    { path: '/pedidos/:id', name: 'request-detail', component: RequestDetail },
    { path: '/eventos', redirect: '/' },
    { path: '/:institutionId/certificacao', name: 'certification', component: CertificationPage },
    { path: '/:institutionId/membros', name: 'members', component: Members },
    { path: '/interesse/:campaignId', name: 'interest-campaign', component: InterestCampaign, meta: { public: true } },
    { path: '/invites/:token', name: 'accept-invite', component: AcceptInvite, meta: { public: true } },
  ],
})

router.beforeEach((to) => {
  if (to.meta.public) return true

  if (!isAuthenticated()) {
    redirectToLogin()
    return false
  }
  return true
})
