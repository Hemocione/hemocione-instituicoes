<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { coletaApi, idApi } from '../api'

type Institution = { id: string; name: string }
type CollectionRequestSummary = { id: string; status: string }

const institutions = ref<Institution[]>([])
const activeInstitution = ref<Institution | null>(null)
const requests = ref<CollectionRequestSummary[]>([])
const loading = ref(true)
const errorMessage = ref<string | null>(null)

onMounted(async () => {
  try {
    const data = await idApi.myInstitutions()
    institutions.value = data.institutions ?? data
    activeInstitution.value = institutions.value[0] ?? null

    if (activeInstitution.value) {
      const requestData = await coletaApi.listCollectionRequests(activeInstitution.value.id)
      requests.value = requestData.collectionRequests ?? requestData.items ?? requestData
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
      <p v-if="!activeInstitution">Você ainda não tem instituição associada.</p>
      <template v-else>
        <h2>{{ activeInstitution.name }}</h2>
        <h3>Meus pedidos</h3>
        <ul v-if="requests.length">
          <li v-for="request in requests" :key="request.id">
            {{ request.id }} — <span class="pill">{{ request.status }}</span>
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
</style>
