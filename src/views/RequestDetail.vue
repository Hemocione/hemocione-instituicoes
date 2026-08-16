<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { coletaApi } from '../api'
import { activeInstitutionId } from '../institution'
import { statusLabel, statusTone } from '../statusLabels'
import { config } from '../config'
import EventBrandingForm from '../components/EventBrandingForm.vue'

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
  <main class="page detail">
    <RouterLink to="/" class="back-link">&larr; voltar</RouterLink>
    <p v-if="loading" class="empty-state">Carregando...</p>
    <p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-else-if="!request" class="empty-state">Pedido não encontrado.</p>
    <template v-else>
      <div class="card">
        <div class="detail-header">
          <h2>Etapas e Contrapropostas</h2>
          <span class="pill" :class="`pill-${statusTone(request.status)}`">{{ statusLabel(request.status) }}</span>
        </div>
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
            v-if="request.counterProposal?.needsTechnicalVisit && ['awaiting_technical_visit', 'technical_visit_confirmed', 'scheduled'].includes(request.status)"
            :class="{ done: request.status !== 'awaiting_technical_visit' }"
          >
            Visita técnica —
            <span v-if="request.status === 'awaiting_technical_visit'">aguardando veredito</span>
            <span v-else>confirmada</span>
          </li>
          <li :class="{ done: request.status === 'scheduled' }">
            Evento e inscrições
            <a v-if="request.eventSlug" :href="`${config.hemocioneDigitalEventUrl}/event/${request.eventSlug}`" target="_blank">
              — link de inscrição
            </a>
          </li>
        </ol>
      </div>

      <EventBrandingForm
        v-if="activeInstitutionId"
        :institution-id="activeInstitutionId"
        :request-id="request.id"
        :status="request.status"
        :event-slug="request.eventSlug"
      />
    </template>
  </main>
</template>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}
.note {
  background: var(--hemo-color-secondary);
  border-radius: var(--hemo-radius);
  padding: 10px 12px;
  margin: 16px 0 0;
  font-size: 14px;
  color: var(--hemo-color-black-80);
}
.timeline {
  list-style: none;
  padding: 0;
  margin: 20px 0 0;
}
.timeline li {
  padding: 10px 0 10px 24px;
  border-left: 2px solid var(--hemo-color-black-15);
  position: relative;
  color: var(--hemo-color-black-60);
  font-size: 14px;
}
.timeline li:last-child {
  border-left-color: transparent;
}
.timeline li.done {
  color: var(--hemo-color-black-100);
  border-left-color: var(--hemo-color-success);
}
.timeline li::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 14px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--hemo-color-black-15);
}
.timeline li.done::before {
  background: var(--hemo-color-success);
}
.timeline a {
  color: var(--hemo-color-link);
  font-weight: 500;
}
</style>
