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
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>Carregando pedido...</span>
    </div>
    <p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <div v-else-if="!request" class="empty-state card detail-state">
      <span class="empty-state-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M7 4h10a2 2 0 0 1 2 2v13H5V6a2 2 0 0 1 2-2ZM8 8h8M8 12h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="m15 15 4 4M19 15l-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </span>
      <strong class="empty-state-title">Pedido não encontrado.</strong>
      <span class="empty-state-description">Verifique o endereço ou volte ao painel para consultar seus pedidos.</span>
    </div>
    <template v-else>
      <div class="card detail-card">
        <div class="detail-header">
          <div>
            <p class="page-kicker">Pedido {{ request.id }}</p>
            <h1>Etapas e contrapropostas</h1>
          </div>
          <span class="pill" :class="`pill-${statusTone(request.status)}`">{{ statusLabel(request.status) }}</span>
        </div>
        <p v-if="request.note" class="note">
          <strong>Nota</strong>
          <span>{{ request.note }}</span>
        </p>

        <ol class="timeline">
          <li class="done">
            <div class="timeline-content">
              <strong>Pedido enviado</strong>
              <span class="pill pill-success timeline-badge">Concluído</span>
            </div>
          </li>
          <li v-if="request.counterProposal" :class="{ done: request.status !== 'counter_proposed' }">
            <div class="timeline-content">
              <strong>Contraproposta</strong>
              <span
                v-if="request.status === 'counter_proposed'"
                class="pill pill-warning timeline-badge"
              >
                aguardando resposta
              </span>
              <span v-else-if="request.status === 'counter_proposal_declined'" class="pill pill-danger timeline-badge">
                recusada
              </span>
              <span v-else class="pill pill-success timeline-badge">aceita</span>
            </div>
            <span v-if="request.counterProposal.proposedDates?.[0]">
              ({{ request.counterProposal.proposedDates[0].date }}, {{ request.counterProposal.proposedDates[0].startTime }})
            </span>
          </li>
          <li
            v-if="request.counterProposal?.needsTechnicalVisit && ['awaiting_technical_visit', 'technical_visit_confirmed', 'scheduled'].includes(request.status)"
            :class="{ done: request.status !== 'awaiting_technical_visit' }"
          >
            <div class="timeline-content">
              <strong>Visita técnica</strong>
              <span v-if="request.status === 'awaiting_technical_visit'" class="pill pill-warning timeline-badge">
                aguardando veredito
              </span>
              <span v-else class="pill pill-success timeline-badge">confirmada</span>
            </div>
          </li>
          <li :class="{ done: request.status === 'scheduled' }">
            <div class="timeline-content">
              <strong>Evento e inscrições</strong>
              <span v-if="request.status === 'scheduled'" class="pill pill-success timeline-badge">Agendado</span>
              <span v-else class="pill pill-neutral timeline-badge">Próxima etapa</span>
            </div>
            <a
              v-if="request.eventSlug"
              :href="`${config.hemocioneDigitalEventUrl}/event/${request.eventSlug}`"
              target="_blank"
              rel="noopener"
              class="btn btn-secondary timeline-link"
            >
              Link de inscrição <span aria-hidden="true">↗</span>
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
.detail {
  padding-top: var(--hemo-space-7);
}
.page-kicker {
  margin: 0 0 var(--hemo-space-1);
  color: var(--hemo-color-primary);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.3;
  text-transform: uppercase;
}
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hemo-space-4);
  margin-bottom: var(--hemo-space-5);
}
.detail-header h1 {
  font-size: 1.5rem;
}
.detail-header .pill {
  flex-shrink: 0;
}
.note {
  display: flex;
  flex-direction: column;
  gap: var(--hemo-space-1);
  margin: 0 0 var(--hemo-space-5);
  padding: var(--hemo-space-3) var(--hemo-space-4);
  border: 1px solid var(--hemo-color-black-15);
  border-radius: var(--hemo-radius);
  background: var(--hemo-color-secondary);
  color: var(--hemo-color-black-80);
  font-size: 0.875rem;
}
.note strong {
  color: var(--hemo-color-black-100);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
}
.timeline li {
  position: relative;
  padding: var(--hemo-space-3) 0 var(--hemo-space-3) var(--hemo-space-6);
  border-left: 2px solid var(--hemo-color-black-15);
  color: var(--hemo-color-black-60);
  font-size: 0.875rem;
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
  left: -8px;
  top: 18px;
  width: 14px;
  height: 14px;
  border: 3px solid var(--hemo-color-surface);
  border-radius: var(--hemo-radius-full);
  background: var(--hemo-color-black-15);
  box-shadow: 0 0 0 1px var(--hemo-color-black-15);
}
.timeline li.done::before {
  background: var(--hemo-color-success);
  box-shadow: 0 0 0 1px var(--hemo-color-success);
}
.timeline-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--hemo-space-2);
}
.timeline-content strong {
  color: var(--hemo-color-black-100);
  font-size: 0.9375rem;
}
.timeline-badge {
  min-height: 22px;
  padding: 3px 8px;
  font-size: 0.6875rem;
}
.timeline li > span:not(.timeline-badge) {
  display: block;
  margin-top: var(--hemo-space-1);
  color: var(--hemo-color-text-muted);
  font-size: 0.8125rem;
}
.timeline-link {
  min-height: 34px;
  margin-top: var(--hemo-space-2);
  padding: 7px var(--hemo-space-3);
  font-size: 0.75rem;
}
.timeline-link span {
  font-size: 0.9375rem;
}
.detail-state {
  margin: 0;
}
.empty-state-icon svg {
  width: 20px;
  height: 20px;
}

@media (max-width: 520px) {
  .detail-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .detail-header .pill {
    align-self: flex-start;
  }
}
</style>
