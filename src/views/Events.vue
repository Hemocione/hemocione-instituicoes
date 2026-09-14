<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { digitalEventApi } from '../api'
import { activeInstitutionId } from '../institution'
import { config } from '../config'

type EventSummary = {
  _id: string
  name: string
  slug: string
  startAt: string
  endAt: string
}

const events = ref<EventSummary[]>([])
const loading = ref(true)
const errorMessage = ref<string | null>(null)

function eventUrl(slug: string) {
  return `${config.hemocioneDigitalEventUrl}/event/${slug}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { dateStyle: 'short' })
}

onMounted(async () => {
  try {
    if (!activeInstitutionId.value) throw new Error('sem instituição ativa')
    const data = await digitalEventApi.listEvents(activeInstitutionId.value)
    events.value = data.events ?? data.items ?? data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="page events">
    <RouterLink to="/" class="back-link">&larr; voltar</RouterLink>
    <div class="page-heading">
      <p class="page-kicker">Programação</p>
      <h1>Meus eventos</h1>
      <p class="page-description">Acesse os eventos de coleta organizados pela sua instituição.</p>
    </div>
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>Carregando eventos...</span>
    </div>
    <p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <div v-else-if="!events.length" class="empty-state card events-empty-state">
      <span class="empty-state-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.8" />
          <path d="M8 3v4M16 3v4M4 10h16M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </span>
      <strong class="empty-state-title">Nenhum evento ainda.</strong>
      <span class="empty-state-description">Os eventos confirmados aparecerão nesta lista.</span>
    </div>
    <div v-else class="event-list">
      <div v-for="event in events" :key="event._id" class="card event-card">
        <div class="event-card-leading" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.8" />
            <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>
        <div class="event-info">
          <span class="event-label">Evento de coleta</span>
          <strong class="event-name">{{ event.name }}</strong>
          <span class="pill pill-neutral">{{ formatDate(event.startAt) }}</span>
        </div>
        <a :href="eventUrl(event.slug)" target="_blank" rel="noopener" class="btn btn-secondary">
          ver evento
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  </main>
</template>

<style scoped>
.events {
  padding-top: var(--hemo-space-7);
}
.page-heading {
  margin-bottom: var(--hemo-space-7);
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
.page-description {
  margin-top: var(--hemo-space-2);
  color: var(--hemo-color-text-muted);
  font-size: 0.9375rem;
}
.event-list {
  display: flex;
  flex-direction: column;
  gap: var(--hemo-space-3);
}
.event-card {
  display: flex;
  align-items: center;
  gap: var(--hemo-space-4);
  min-height: 92px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}
.event-card:hover {
  border-color: var(--hemo-color-primary);
  box-shadow: var(--hemo-shadow-card-hover);
}
.event-card-leading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  border-radius: var(--hemo-radius);
  background: var(--hemo-color-danger-soft);
  color: var(--hemo-color-primary);
}
.event-card-leading svg {
  width: 21px;
  height: 21px;
}
.event-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--hemo-space-1);
}
.event-label {
  color: var(--hemo-color-text-muted);
  font-size: 0.75rem;
  font-weight: 500;
}
.event-name {
  min-width: 0;
  color: var(--hemo-color-black-100);
  font-size: 0.9375rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event-card .btn {
  flex-shrink: 0;
}
.event-card .btn span {
  font-size: 1rem;
}
.events-empty-state {
  margin: 0;
}
.empty-state-icon svg {
  width: 20px;
  height: 20px;
}

@media (max-width: 560px) {
  .event-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .event-info {
    flex-basis: calc(100% - 58px);
  }
  .event-card .btn {
    width: 100%;
    margin-left: 58px;
  }
}
</style>
