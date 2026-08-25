<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { coletaApi, idApi } from '../api'
import { institutions, activeInstitutionId, setInstitutions, activeInstitution } from '../institution'
import { config } from '../config'
import { statusLabel, statusTone } from '../statusLabels'

type CollectionRequestSummary = { id: string; status: string }

const requests = ref<CollectionRequestSummary[]>([])
const loading = ref(true)
const errorMessage = ref<string | null>(null)

function newRequestUrl(institutionId: string) {
  return `${config.hemocioneColetaUrl}/agendar?institutionId=${encodeURIComponent(institutionId)}`
}

async function loadRequests(institutionId: string) {
  const requestData = await coletaApi.listCollectionRequests(institutionId)
  requests.value = requestData.collectionRequests ?? requestData.items ?? requestData
}

onMounted(async () => {
  try {
    const data = await idApi.myInstitutions()
    setInstitutions(data)

    if (activeInstitutionId.value) {
      await loadRequests(activeInstitutionId.value)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="page dashboard">
    <p v-if="loading" class="empty-state">Carregando...</p>
    <p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <template v-else>
      <p v-if="!institutions.length" class="empty-state">Você ainda não tem instituição associada.</p>
      <template v-else>
        <div class="dashboard-header">
          <h2>{{ activeInstitution()?.name }}</h2>
          <a
            v-if="activeInstitutionId"
            :href="newRequestUrl(activeInstitutionId)"
            target="_blank"
            rel="noopener"
            class="btn btn-primary"
          >
            Nova solicitação
          </a>
        </div>

        <h3 class="section-title">Meus pedidos</h3>
        <div v-if="requests.length" class="request-list">
          <RouterLink
            v-for="request in requests"
            :key="request.id"
            :to="`/pedidos/${request.id}`"
            class="card request-card"
          >
            <span class="request-id">Pedido {{ request.id }}</span>
            <span class="pill" :class="`pill-${statusTone(request.status)}`">{{ statusLabel(request.status) }}</span>
          </RouterLink>
        </div>
        <p v-else class="empty-state">Nenhum pedido de coleta ainda.</p>
      </template>
    </template>
  </main>
</template>

<style scoped>
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.section-title {
  font-size: 15px;
  color: var(--hemo-color-black-80);
  margin-bottom: 12px;
}
.request-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.request-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-decoration: none;
  transition: border-color 0.15s ease;
}
.request-card:hover {
  border-color: var(--hemo-color-primary);
}
.request-id {
  font-weight: 600;
  font-size: 14px;
  color: var(--hemo-color-black-100);
}
</style>
