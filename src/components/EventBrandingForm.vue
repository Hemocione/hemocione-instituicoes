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
  <form v-if="visible" class="card event-branding" @submit.prevent="submit">
    <h3>Personalizar evento</h3>
    <label class="field">
      Banner (URL)
      <input v-model="banner" type="text" data-testid="banner-input" />
    </label>
    <label class="field">
      Logo (URL)
      <input v-model="logo" type="text" data-testid="logo-input" />
    </label>
    <label class="field">
      Endereço
      <input v-model="address" type="text" data-testid="address-input" />
    </label>
    <button type="submit" class="btn btn-primary" data-testid="submit-button" :disabled="saving">Salvar</button>
    <p v-if="successMessage" data-testid="success-message" class="success-message">{{ successMessage }}</p>
    <p v-if="errorMessage" data-testid="error-message" class="error-message">{{ errorMessage }}</p>
  </form>
</template>

<style scoped>
.event-branding {
  margin-top: 16px;
}
.event-branding h3 {
  font-size: 16px;
  margin-bottom: 16px;
}
.event-branding .success-message,
.event-branding .error-message {
  margin-top: 12px;
}
</style>
