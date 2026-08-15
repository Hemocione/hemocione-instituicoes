<script setup lang="ts">
import { ref, computed } from 'vue'
import { coletaApi, type EventBranding } from '../api'

const props = defineProps<{
  institutionId: string
  requestId: string
  status: string
  eventSlug?: string
}>()

const visible = computed(() => props.status === 'scheduled' && !!props.eventSlug)

const banner = ref('')
const logo = ref('')
const address = ref('')
const saving = ref(false)
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

function buildBranding(): EventBranding {
  const branding: EventBranding = {}
  if (banner.value.trim()) branding.banner = banner.value.trim()
  if (logo.value.trim()) branding.logo = logo.value.trim()
  if (address.value.trim()) branding.address = address.value.trim()
  return branding
}

async function submit() {
  successMessage.value = null
  errorMessage.value = null
  saving.value = true
  try {
    await coletaApi.updateEventBranding(props.institutionId, props.requestId, buildBranding())
    successMessage.value = 'Personalização salva com sucesso.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form v-if="visible" class="event-branding" @submit.prevent="submit">
    <h3>Personalizar evento</h3>
    <label>
      Banner (URL)
      <input v-model="banner" type="text" data-testid="banner-input" />
    </label>
    <label>
      Logo (URL)
      <input v-model="logo" type="text" data-testid="logo-input" />
    </label>
    <label>
      Endereço
      <input v-model="address" type="text" data-testid="address-input" />
    </label>
    <button type="submit" data-testid="submit-button" :disabled="saving">Salvar</button>
    <p v-if="successMessage" data-testid="success-message" class="success">{{ successMessage }}</p>
    <p v-if="errorMessage" data-testid="error-message" class="error">{{ errorMessage }}</p>
  </form>
</template>

<style scoped>
.event-branding { margin: 20px 0; padding: 16px; border: 1px solid #e8e8e8; border-radius: 8px; }
.event-branding label { display: block; margin-bottom: 10px; font-size: 14px; }
.event-branding input {
  display: block; width: 100%; margin-top: 4px; padding: 6px 8px;
  border: 1px solid #e8e8e8; border-radius: 6px; font: inherit; box-sizing: border-box;
}
.event-branding button {
  padding: 8px 16px; background: #bb0a08; color: #fff; border: none;
  border-radius: 6px; font-size: 14px; cursor: pointer;
}
.success { color: #2ac769; }
.error { color: #bb0a08; }
</style>
