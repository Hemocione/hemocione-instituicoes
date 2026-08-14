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
  <main class="events">
    <RouterLink to="/">&larr; voltar</RouterLink>
    <h2>Meus eventos</h2>
    <p v-if="loading">Carregando...</p>
    <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-else-if="!events.length">Nenhum evento ainda.</p>
    <ul v-else>
      <li v-for="event in events" :key="event._id">
        <strong>{{ event.name }}</strong>
        <span class="pill">{{ formatDate(event.startAt) }}</span>
        <a :href="eventUrl(event.slug)" target="_blank" rel="noopener">ver evento</a>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.events { max-width: 640px; margin: 40px auto; font-family: system-ui, sans-serif; }
.error { color: #bb0a08; }
.pill { background: #f2f2f2; border-radius: 999px; padding: 2px 10px; font-size: 12px; margin: 0 10px; }
ul { list-style: none; padding: 0; }
li { padding: 8px 0; border-bottom: 1px solid #e8e8e8; }
a { color: #bb0a08; }
</style>
