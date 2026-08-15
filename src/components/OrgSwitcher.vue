<script setup lang="ts">
import { institutions, activeInstitutionId, setActiveInstitution } from '../institution'
</script>

<template>
  <select
    v-if="institutions.length > 1"
    class="org-switcher"
    :value="activeInstitutionId"
    @change="setActiveInstitution(($event.target as HTMLSelectElement).value)"
  >
    <option v-for="inst in institutions" :key="inst.id" :value="inst.id">{{ inst.name }}</option>
  </select>
  <strong v-else-if="institutions.length === 1" class="org-name">{{ institutions[0].name }}</strong>
</template>

<style scoped>
.org-switcher {
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  padding: 7px 12px;
  border-radius: var(--hemo-radius);
  border: 1px solid var(--hemo-color-black-15);
  background: var(--hemo-color-white);
  color: var(--hemo-color-black-100);
}
.org-switcher:focus {
  outline: none;
  border-color: var(--hemo-color-primary);
}
.org-name {
  font-size: 14px;
  color: var(--hemo-color-black-100);
  white-space: nowrap;
}
</style>
