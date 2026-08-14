<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { coletaApi, idApi } from '../api'
import { institutions, activeInstitutionId, setInstitutions, activeInstitution } from '../institution'

type CollectionRequestSummary = { id: string; status: string }

const requests = ref<CollectionRequestSummary[]>([])
const loading = ref(true)
const errorMessage = ref<string | null>(null)

async function loadRequests(institutionId: string) {
  const requestData = await coletaApi.listCollectionRequests(institutionId)
  requests.value = requestData.collectionRequests ?? requestData.items ?? requestData
}

onMounted(async () => {
  try {
    const data = await idApi.myInstitutions()
    setInstitutions(data.institutions ?? data)

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
  <main class="dashboard">
    <p v-if="loading">Carregando...</p>
    <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>
    <template v-else>
      <p v-if="!institutions.length">Você ainda não tem instituição associada.</p>
      <template v-else>
        <h2>{{ activeInstitution()?.name }}</h2>
        <h3>Meus pedidos</h3>
        <ul v-if="requests.length">
          <li v-for="request in requests" :key="request.id">
            <RouterLink :to="`/pedidos/${request.id}`">
              {{ request.id }} — <span class="pill">{{ request.status }}</span>
            </RouterLink>
          </li>
        </ul>
        <p v-else>Nenhum pedido de coleta ainda.</p>
      </template>
    </template>
  </main>
</template>

<style scoped>
.dashboard { max-width: 640px; margin: 40px auto; font-family: system-ui, sans-serif; }
.error { color: #bb0a08; }
.pill { background: #f2f2f2; border-radius: 999px; padding: 2px 10px; font-size: 12px; }
ul { list-style: none; padding: 0; }
li { padding: 8px 0; border-bottom: 1px solid #e8e8e8; }
a { color: inherit; text-decoration: none; }
</style>
