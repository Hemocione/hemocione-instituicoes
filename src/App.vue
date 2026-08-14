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
  gap: 20px;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e8e8e8;
  font-family: system-ui, sans-serif;
  color: #bb0a08;
}
.nav {
  display: flex;
  gap: 16px;
  flex: 1;
}
.nav a {
  color: inherit;
  text-decoration: none;
  font-size: 14px;
}
.nav a.router-link-active {
  font-weight: 600;
}
</style>
