<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
const MOBILE_MAX_WIDTH = 768
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX_WIDTH)
const sidebarOpen = ref(!isMobile.value)

// On a phone the open sidebar covers the content; a tap outside or a navigation closes it.
const showScrim = computed(() => isMobile.value && sidebarOpen.value)
function updateViewport() {
  isMobile.value = window.innerWidth <= MOBILE_MAX_WIDTH
}
onMounted(() => window.addEventListener('resize', updateViewport))
onBeforeUnmount(() => window.removeEventListener('resize', updateViewport))
watch(
  () => route.path,
  () => {
    if (isMobile.value) sidebarOpen.value = false
  }
)
</script>

<template>
  <div v-if="!isPublicRoute" class="app-shell" :class="{ 'app-shell--collapsed': !sidebarOpen }">
    <Sidebar v-model:open="sidebarOpen" />
    <div v-if="showScrim" class="sidebar-scrim" data-testid="sidebar-scrim" aria-hidden="true" @click="sidebarOpen = false" />
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
  margin-left: var(--content-offset, var(--sidebar-width));
  overflow-x: auto;
  transition: margin-left 0.2s ease;
}
.sidebar-scrim {
  position: fixed;
  z-index: 15;
  inset: 0;
  background: rgba(37, 40, 43, 0.32);
}
@media (max-width: 768px) {
  .app-shell {
    --sidebar-width: min(260px, calc(100vw - var(--hemo-space-6)));
    --content-offset: 64px;
  }
  .app-shell--collapsed {
    --sidebar-width: 64px;
  }
}
</style>
