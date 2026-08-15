<script setup lang="ts">
import { RouterLink } from 'vue-router'
import OrgSwitcher from './components/OrgSwitcher.vue'
</script>

<template>
  <header class="topbar">
    <span class="brand"><strong>hemocione</strong> instituições</span>
    <nav class="nav">
      <RouterLink to="/">Dashboard</RouterLink>
      <RouterLink to="/eventos">Meus eventos</RouterLink>
    </nav>
    <OrgSwitcher />
  </header>
  <router-view />
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 24px;
  justify-content: space-between;
  padding: 14px 24px;
  background: var(--hemo-color-white);
  border-bottom: 1px solid var(--hemo-color-black-15);
}
.brand {
  font-size: 15px;
  color: var(--hemo-color-black-100);
  white-space: nowrap;
}
.brand strong {
  color: var(--hemo-color-primary);
}
.nav {
  display: flex;
  gap: 8px;
  flex: 1;
}
.nav a {
  color: var(--hemo-color-black-80);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: var(--hemo-radius);
}
.nav a:hover {
  background: var(--hemo-color-black-5);
  color: var(--hemo-color-black-100);
}
.nav a.router-link-active {
  color: var(--hemo-color-primary);
  background: rgba(187, 10, 8, 0.08);
  font-weight: 600;
}
</style>
