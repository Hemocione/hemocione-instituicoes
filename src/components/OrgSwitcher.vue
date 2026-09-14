<script setup lang="ts">
import { institutions, activeInstitutionId, setActiveInstitution } from '../institution'
</script>

<template>
  <select
    v-if="institutions.length > 1"
    class="org-switcher-select"
    aria-label="Selecionar instituição ativa"
    :value="activeInstitutionId"
    @change="setActiveInstitution(($event.target as HTMLSelectElement).value)"
  >
    <option v-for="inst in institutions" :key="inst.id" :value="inst.id">{{ inst.name }}</option>
  </select>
  <strong v-else-if="institutions.length === 1" class="org-name" :title="institutions[0].name">
    {{ institutions[0].name }}
  </strong>
</template>

<style scoped>
.org-switcher-select,
.org-name {
  display: block;
  max-width: 240px;
  min-height: 38px;
  padding: 8px 12px;
  border-radius: var(--hemo-radius);
  border: 1px solid var(--hemo-color-black-15);
  background: var(--hemo-color-secondary);
  color: var(--hemo-color-black-100);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
}
.org-switcher-select {
  min-width: 180px;
  padding-right: 34px;
  cursor: pointer;
}
.org-switcher-select:focus {
  outline: none;
  border-color: var(--hemo-color-primary);
  box-shadow: var(--hemo-shadow-focus);
}
.org-switcher-select:hover {
  border-color: var(--hemo-color-black-70);
}
.org-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .org-switcher-select,
  .org-name {
    max-width: min(48vw, 220px);
  }
  .org-switcher-select {
    min-width: 0;
  }
}
</style>
