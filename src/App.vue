<script setup lang="ts">
import OrgSwitcher from './components/OrgSwitcher.vue'
</script>

<template>
  <header class="topbar">
    <span class="brand"><strong>hemocione</strong> instituições</span>
    <OrgSwitcher />
  </header>
  <router-view />
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e8e8e8;
  font-family: system-ui, sans-serif;
  color: #bb0a08;
}
</style>
