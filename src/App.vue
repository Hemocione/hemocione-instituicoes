<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'

const route = useRoute()
const isPublicRoute = computed(() => route.meta.public === true)
const sidebarOpen = ref(typeof window === 'undefined' || window.innerWidth > 768)
</script>

<template>
  <div v-if="!isPublicRoute" class="app-shell" :class="{ 'app-shell--collapsed': !sidebarOpen }">
    <Sidebar v-model:open="sidebarOpen" />
    <main class="app-content">
      <router-view />
    </main>
  </div>
  <router-view v-else />
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  --sidebar-width: 260px;
}
.app-shell--collapsed {
  --sidebar-width: 64px;
}
.app-content {
  min-width: 0;
  margin-left: var(--sidebar-width);
  overflow-x: auto;
  transition: margin-left 0.2s ease;
}
@media (max-width: 768px) {
  .app-shell {
    --sidebar-width: min(260px, calc(100vw - var(--hemo-space-6)));
  }
  .app-shell--collapsed {
    --sidebar-width: 64px;
  }
}
</style>
