<script setup lang="ts">
import type { Institution } from '../institution'

defineProps<{
  kind?: Institution['kind']
}>()
</script>

<template>
  <svg
    v-if="kind === 'school'"
    class="institution-kind-icon"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path d="M14 21v-3a2 2 0 0 0-4 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M18 4.933V21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M6 4.933V21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="12" cy="9" r="2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <svg
    v-else-if="kind === 'university'"
    class="institution-kind-icon"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M22 10v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <svg
    v-else-if="kind === 'company'"
    class="institution-kind-icon"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path d="M10 12h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M10 8h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M14 21v-3a2 2 0 0 0-4 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

<style scoped>
.institution-kind-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  color: var(--hemo-color-primary);
}
</style>
