<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'

const route = useRoute()
const isPublicRoute = computed(() => route.meta.public === true)
</script>

<template>
  <div v-if="!isPublicRoute" class="app-shell">
    <Sidebar />
    <main class="app-content">
      <router-view />
    </main>
  </div>
  <router-view v-else />
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}
.app-content {
  min-width: 0;
  overflow-x: auto;
}
@media (max-width: 768px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
}
</style>
