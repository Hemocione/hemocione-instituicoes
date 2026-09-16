<script setup lang="ts">
import { activeInstitution, activeInstitutionId } from '../institution'
import { logout, redirectToLogin } from '../auth'
import OrgSwitcher from './OrgSwitcher.vue'

function handleLogout() {
  logout()
  redirectToLogin()
}
</script>

<template>
  <aside class="sidebar" aria-label="Navegação principal">
    <div class="sidebar-brand" aria-label="Hemocione instituições">
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

    <div class="sidebar-org">
      <OrgSwitcher />
    </div>

    <nav class="sidebar-nav">
      <RouterLink to="/">Dashboard</RouterLink>
      <RouterLink
        v-if="activeInstitution()?.role === 'admin' && activeInstitutionId"
        :to="`/${activeInstitutionId}/membros`"
      >
        Membros
      </RouterLink>
      <RouterLink v-if="activeInstitutionId" :to="`/${activeInstitutionId}/certificacao`">
        Certificação
      </RouterLink>
    </nav>

    <div class="sidebar-footer">
      <button type="button" class="btn btn-secondary" data-testid="logout-button" @click="handleLogout">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <path d="m16 17 5-5-5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M21 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Sair
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--hemo-space-4);
  height: 100vh;
  padding: var(--hemo-space-4);
  background: rgba(255, 255, 255, 0.94);
  border-right: 1px solid var(--hemo-color-black-15);
  box-shadow: 1px 0 8px rgba(37, 40, 43, 0.04);
}
.sidebar-brand {
  display: inline-flex;
  align-items: center;
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
  flex-direction: column;
  line-height: 1.2;
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
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--hemo-space-1);
}
.sidebar-nav a {
  display: flex;
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
.sidebar-nav a:hover {
  background: var(--hemo-color-black-5);
  color: var(--hemo-color-black-100);
}
.sidebar-nav a.router-link-active {
  background: rgba(187, 10, 8, 0.08);
  color: var(--hemo-color-primary);
  font-weight: 600;
}
.sidebar-footer {
  margin-top: auto;
}
@media (max-width: 768px) {
  .sidebar {
    height: auto;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    border-right: none;
    border-bottom: 1px solid var(--hemo-color-black-15);
  }
  .sidebar-nav {
    order: 3;
    flex-basis: 100%;
    flex-direction: row;
    overflow-x: auto;
  }
  .sidebar-footer {
    margin-top: 0;
    margin-left: auto;
  }
}
</style>
