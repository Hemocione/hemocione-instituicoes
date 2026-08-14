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
  <strong v-else-if="institutions.length === 1">{{ institutions[0].name }}</strong>
</template>

<style scoped>
.org-switcher {
  font: inherit;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}
</style>
