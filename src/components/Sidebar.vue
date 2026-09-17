<script setup lang="ts">
import { ref, watch } from 'vue'
import { activeInstitution, activeInstitutionId } from '../institution'
import { logout, redirectToLogin } from '../auth'
import OrgSwitcher from './OrgSwitcher.vue'

const props = withDefaults(
  defineProps<{
    open?: boolean
  }>(),
  { open: true }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const sidebarOpen = ref(props.open)

watch(
  () => props.open,
  (value) => {
    sidebarOpen.value = value
  }
)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
  emit('update:open', sidebarOpen.value)
}

function handleLogout() {
  logout()
  redirectToLogin()
}
</script>

<template>
  <aside
    class="sidebar"
    :class="{ 'sidebar--collapsed': !sidebarOpen }"
    style="position: fixed"
    aria-label="Navegação principal"
  >
    <div class="sidebar-header">
      <div class="sidebar-brand" aria-label="Instituição ativa">
        <OrgSwitcher :collapsed="!sidebarOpen" />
      </div>
      <button
        type="button"
        class="sidebar-toggle"
        data-testid="sidebar-toggle"
        :aria-label="sidebarOpen ? 'Recolher barra lateral' : 'Expandir barra lateral'"
        :title="sidebarOpen ? 'Recolher barra lateral' : 'Expandir barra lateral'"
        :aria-expanded="sidebarOpen"
        @click="toggleSidebar"
      >
        <svg v-if="sidebarOpen" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m15 18-6-6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <nav class="sidebar-nav" aria-label="Seções">
      <RouterLink
        to="/"
        data-testid="nav-dashboard"
        :title="sidebarOpen ? undefined : 'Dashboard'"
        :aria-label="sidebarOpen ? undefined : 'Dashboard'"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.8" />
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.8" />
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.8" />
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.8" />
        </svg>
        <span v-if="sidebarOpen" class="nav-label">Dashboard</span>
      </RouterLink>
      <RouterLink
        v-if="activeInstitution()?.role === 'admin' && activeInstitutionId"
        :to="`/${activeInstitutionId}/membros`"
        data-testid="nav-members"
        :title="sidebarOpen ? undefined : 'Membros'"
        :aria-label="sidebarOpen ? undefined : 'Membros'"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.8" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-if="sidebarOpen" class="nav-label">Membros</span>
      </RouterLink>
      <RouterLink
        v-if="activeInstitutionId"
        :to="`/${activeInstitutionId}/certificacao`"
        data-testid="nav-certification"
        :title="sidebarOpen ? undefined : 'Certificação'"
        :aria-label="sidebarOpen ? undefined : 'Certificação'"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m12 3 2.25 1.37 2.62.08 1.08 2.39 2.05 1.64-.47 2.58.47 2.58-2.05 1.64-1.08 2.39-2.62.08L12 21l-2.25-1.37-2.62-.08-1.08-2.39L4 15.52l.47-2.58L4 10.36l2.05-1.64 1.08-2.39 2.62-.08z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="m8.5 12 2.25 2.25L15.5 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-if="sidebarOpen" class="nav-label">Certificação</span>
      </RouterLink>
    </nav>

    <div class="sidebar-footer">
      <button
        type="button"
        class="btn btn-secondary"
        data-testid="logout-button"
        :aria-label="sidebarOpen ? undefined : 'Sair'"
        :title="sidebarOpen ? undefined : 'Sair'"
        @click="handleLogout"
      >
        <svg class="footer-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m16 17 5-5-5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M21 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-if="sidebarOpen">Sair</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  z-index: 20;
  inset: 0 auto 0 0;
  display: flex;
  flex-direction: column;
  width: 260px;
  min-width: 0;
  height: 100dvh;
  overflow-y: auto;
  padding: 0 var(--hemo-space-4) var(--hemo-space-4);
  background: rgba(255, 255, 255, 0.96);
  border-right: 1px solid var(--hemo-color-black-15);
  box-shadow: 1px 0 8px rgba(37, 40, 43, 0.04);
  transition: width 0.2s ease, padding 0.2s ease;
}
.sidebar--collapsed {
  width: 64px;
  padding-inline: var(--hemo-space-2);
}
.sidebar-header {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--hemo-space-2);
  min-height: 72px;
  border-bottom: 1px solid var(--hemo-color-black-15);
}
.sidebar--collapsed .sidebar-header {
  flex-direction: column;
  justify-content: center;
  gap: var(--hemo-space-1);
}
.sidebar-brand {
  min-width: 0;
  flex: 1;
}
.sidebar--collapsed .sidebar-brand {
  flex: 0 0 auto;
}
.sidebar-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--hemo-color-black-15);
  border-radius: var(--hemo-radius-full);
  background: var(--hemo-color-white);
  color: var(--hemo-color-black-80);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}
.sidebar-toggle:hover {
  border-color: var(--hemo-color-primary);
  background: var(--hemo-color-primary-button-hover);
  color: var(--hemo-color-primary-dark);
}
.sidebar-toggle svg {
  width: 18px;
  height: 18px;
}
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--hemo-space-1);
  padding-top: var(--hemo-space-5);
}
.sidebar-nav a {
  display: flex;
  align-items: center;
  gap: var(--hemo-space-3);
  min-height: 40px;
  padding: 9px var(--hemo-space-3);
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
.sidebar--collapsed .sidebar-nav a {
  justify-content: center;
  padding-inline: 0;
}
.nav-icon,
.footer-icon {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
}
.nav-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sidebar-footer {
  margin-top: auto;
  padding-top: var(--hemo-space-5);
}
.sidebar-footer .btn {
  width: 100%;
}
.sidebar--collapsed .sidebar-footer .btn {
  padding-inline: 0;
}

@media (max-width: 768px) {
  .sidebar {
    width: min(260px, calc(100vw - var(--hemo-space-6)));
  }
  .sidebar--collapsed {
    width: 64px;
  }
}
</style>
