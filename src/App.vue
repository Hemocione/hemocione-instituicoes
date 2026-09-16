<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { logout, redirectToLogin } from './auth'
import OrgSwitcher from './components/OrgSwitcher.vue'
import { activeInstitution, activeInstitutionId } from './institution'

const route = useRoute()
const isPublicRoute = computed(() => route.meta.public === true)

function handleLogout() {
  logout()
  redirectToLogin()
}
</script>

<template>
  <header v-if="!isPublicRoute" class="topbar">
    <div class="topbar-inner">
      <div class="brand" aria-label="Hemocione instituições">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 21s-6-4.35-6-9.5a6 6 0 0 1 12 0C18 16.65 12 21 12 21Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span class="brand-text">
          <strong>hemocione</strong>
          <span>instituições</span>
        </span>
      </div>
      <nav class="nav" aria-label="Navegação principal">
        <template v-if="false">
          <RouterLink to="/">Dashboard</RouterLink>
          <RouterLink to="/eventos">Meus eventos</RouterLink>
        </template>
        <RouterLink
          v-if="activeInstitution()?.role === 'admin' && activeInstitutionId"
          :to="`/${activeInstitutionId}/membros`"
          data-testid="nav-members-link"
        >
          Membros
        </RouterLink>
      </nav>
      <div class="topbar-actions">
        <OrgSwitcher />
        <button type="button" class="btn btn-secondary" data-testid="logout-button" @click="handleLogout">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path d="m16 17 5-5-5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M21 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Sair
        </button>
      </div>
    </div>
  </header>
  <router-view />
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid var(--hemo-color-black-15);
  box-shadow: 0 1px 8px rgba(37, 40, 43, 0.04);
  backdrop-filter: blur(12px);
}
.topbar-inner {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: var(--hemo-page-max-width);
  min-height: var(--hemo-navbar-height);
  gap: var(--hemo-space-6);
  margin: 0 auto;
  padding: var(--hemo-space-2) var(--hemo-space-4);
}
.brand {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--hemo-space-2);
  color: var(--hemo-color-black-100);
}
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--hemo-radius-sm);
  background: var(--hemo-color-primary);
  color: var(--hemo-color-white);
  box-shadow: 0 3px 8px rgba(187, 10, 8, 0.2);
}
.brand-mark svg {
  width: 18px;
  height: 18px;
}
.brand-text {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  white-space: nowrap;
}
.brand-text strong {
  color: var(--hemo-color-primary);
  font-size: 15px;
  font-weight: 700;
}
.brand-text span {
  color: var(--hemo-color-black-80);
  font-size: 13px;
  font-weight: 500;
}
.nav {
  display: flex;
  align-items: center;
  gap: var(--hemo-space-1);
  flex: 1;
  min-width: 0;
}
.nav a {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 7px var(--hemo-space-3);
  border-radius: var(--hemo-radius);
  color: var(--hemo-color-black-80);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.nav a:hover {
  background: var(--hemo-color-black-5);
  color: var(--hemo-color-black-100);
}
.nav a.router-link-active {
  background: rgba(187, 10, 8, 0.08);
  color: var(--hemo-color-primary);
  font-weight: 600;
}
.topbar-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--hemo-space-2);
  margin-left: auto;
}
@media (max-width: 640px) {
  .topbar-inner {
    flex-wrap: wrap;
    gap: var(--hemo-space-2) var(--hemo-space-3);
    padding: var(--hemo-space-2) var(--hemo-space-3);
  }
  .topbar-actions {
    margin-left: auto;
  }
  .nav {
    order: 3;
    flex-basis: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
  }
  .nav a {
    flex: 0 0 auto;
  }
}
</style>
