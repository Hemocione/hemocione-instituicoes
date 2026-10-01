<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import { activeInstitutionId, institutions } from './institution'
import { routeAfterInstitutionSwitch } from './institutionRouting'

const route = useRoute()
const router = useRouter()
const isPublicRoute = computed(() => route.meta.public === true)

// Institution-scoped routes follow the id in the url; the other routes follow the active institution.
// A new key remounts the view, so the view loads its data again for the new institution.
const viewKey = computed(() => {
  const routeInstitutionId = route.params?.institutionId
  return typeof routeInstitutionId === 'string' ? routeInstitutionId : activeInstitutionId.value ?? ''
})

watch(activeInstitutionId, (institutionId) => {
  if (isPublicRoute.value) return
  const target = routeAfterInstitutionSwitch(route, institutionId, institutions.value)
  if (target) router.replace(target)
})
const sidebarOpen = ref(typeof window === 'undefined' || window.innerWidth > 768)
</script>

<template>
  <div v-if="!isPublicRoute" class="app-shell" :class="{ 'app-shell--collapsed': !sidebarOpen }">
    <Sidebar v-model:open="sidebarOpen" />
    <main class="app-content">
      <router-view :key="viewKey" />
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
