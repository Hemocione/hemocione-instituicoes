<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { coletaApi } from '../api'
import { activeInstitutionId } from '../institution'
import { statusLabel, terminalStatuses } from '../statusLabels'

type CollectionRequestDetail = {
  id: string
  status: string
  note?: string
  counterProposal?: {
    note?: string
    needsTechnicalVisit: boolean
    proposedDates: { date: string; startTime: string; durationMinutes: number }[]
  }
  confirmedSchedule?: { date: string; startTime: string; durationMinutes: number }
  eventSlug?: string
}

const route = useRoute()
const request = ref<CollectionRequestDetail | null>(null)
const loading = ref(true)
const errorMessage = ref<string | null>(null)

onMounted(async () => {
  try {
    if (!activeInstitutionId.value) throw new Error('sem instituição ativa')
    const data = await coletaApi.listCollectionRequests(activeInstitutionId.value)
    const list = data.collectionRequests ?? data.items ?? data
    request.value = (list as CollectionRequestDetail[]).find((r) => r.id === route.params.id) ?? null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="detail">
    <RouterLink to="/">&larr; voltar</RouterLink>
    <p v-if="loading">Carregando...</p>
    <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-else-if="!request">Pedido não encontrado.</p>
    <template v-else>
      <h2>Etapas e Contrapropostas</h2>
      <p v-if="request.note" class="note">Nota: {{ request.note }}</p>

      <ol class="timeline">
        <li class="done">Pedido enviado</li>
        <li v-if="request.counterProposal" :class="{ done: request.status !== 'counter_proposed' }">
          Contraproposta —
          <span v-if="request.status === 'counter_proposed'">aguardando resposta</span>
          <span v-else-if="request.status === 'counter_proposal_declined'">recusada</span>
          <span v-else>aceita</span>
          <span v-if="request.counterProposal.proposedDates?.[0]">
            ({{ request.counterProposal.proposedDates[0].date }}, {{ request.counterProposal.proposedDates[0].startTime }})
          </span>
        </li>
        <li
          v-if="['awaiting_technical_visit', 'technical_visit_confirmed', 'scheduled'].includes(request.status)"
          :class="{ done: request.status !== 'awaiting_technical_visit' }"
        >
          Visita técnica —
          <span v-if="request.status === 'awaiting_technical_visit'">aguardando veredito</span>
          <span v-else>confirmada</span>
        </li>
        <li :class="{ done: request.status === 'scheduled' }">
          Evento e inscrições
          <a v-if="request.eventSlug" :href="`https://eventos.hemocione.com.br/event/${request.eventSlug}`" target="_blank">
            — link de inscrição
          </a>
        </li>
      </ol>

      <p class="current-status">
        Status atual: <span :class="{ terminal: terminalStatuses.has(request.status) }">{{ statusLabel(request.status) }}</span>
      </p>
    </template>
  </main>
</template>

<style scoped>
.detail { max-width: 640px; margin: 40px auto; font-family: system-ui, sans-serif; }
.error { color: #bb0a08; }
.note { background: #f2f2f2; border-radius: 8px; padding: 10px 12px; margin: 12px 0; }
.timeline { list-style: none; padding: 0; margin: 16px 0; }
.timeline li { padding: 10px 0 10px 24px; border-left: 2px solid #e8e8e8; position: relative; color: #999; }
.timeline li.done { color: #1a1a1a; border-left-color: #2ac769; }
.timeline li::before {
  content: ''; position: absolute; left: -7px; top: 14px; width: 10px; height: 10px;
  border-radius: 50%; background: #e8e8e8;
}
.timeline li.done::before { background: #2ac769; }
.current-status { margin-top: 20px; font-weight: 600; }
.current-status .terminal { color: #bb0a08; }
</style>
