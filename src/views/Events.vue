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
    <h2>Meus eventos</h2>
    <p v-if="loading" class="empty-state">Carregando...</p>
    <p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-else-if="!events.length" class="empty-state">Nenhum evento ainda.</p>
    <div v-else class="event-list">
      <div v-for="event in events" :key="event._id" class="card event-card">
        <div class="event-info">
          <strong class="event-name">{{ event.name }}</strong>
          <span class="pill pill-neutral">{{ formatDate(event.startAt) }}</span>
        </div>
        <a :href="eventUrl(event.slug)" target="_blank" rel="noopener" class="btn btn-secondary">ver evento</a>
      </div>
    </div>
  </main>
</template>

<style scoped>
.events h2 {
  margin-bottom: 20px;
}
.event-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.event-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.event-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.event-name {
  font-size: 14px;
  color: var(--hemo-color-black-100);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
