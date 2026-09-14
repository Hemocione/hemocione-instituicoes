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
    <div class="branding-header">
      <div>
        <p class="section-kicker">Identidade do evento</p>
        <h3>Personalizar evento</h3>
        <p class="branding-description">Atualize os elementos que os doadores verão na página da coleta.</p>
      </div>
      <span class="pill pill-info">Agendado</span>
    </div>
    <label class="field">
      Banner (URL)
      <input v-model="banner" type="text" placeholder="https://exemplo.com/banner.jpg" data-testid="banner-input" />
    </label>
    <label class="field">
      Logo (URL)
      <input v-model="logo" type="text" placeholder="https://exemplo.com/logo.png" data-testid="logo-input" />
    </label>
    <label class="field">
      Endereço
      <input v-model="address" type="text" placeholder="Endereço do local de coleta" data-testid="address-input" />
    </label>
    <div class="branding-footer">
      <p class="branding-hint">Deixe um campo vazio para manter o valor atual.</p>
      <button type="submit" class="btn btn-primary" data-testid="submit-button" :disabled="saving">
        {{ saving ? 'Salvando...' : 'Salvar alterações' }}
      </button>
    </div>
    <p v-if="successMessage" data-testid="success-message" class="success-message">{{ successMessage }}</p>
    <p v-if="errorMessage" data-testid="error-message" class="error-message">{{ errorMessage }}</p>
  </form>
</template>

<style scoped>
.event-branding {
  margin-top: var(--hemo-space-4);
}
.branding-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--hemo-space-4);
  margin-bottom: var(--hemo-space-5);
}
.section-kicker {
  margin: 0 0 var(--hemo-space-1);
  color: var(--hemo-color-primary);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.3;
  text-transform: uppercase;
}
.branding-header h3 {
  font-size: 1.25rem;
}
.branding-description {
  max-width: 540px;
  margin-top: var(--hemo-space-2);
  color: var(--hemo-color-text-muted);
  font-size: 0.875rem;
  line-height: 1.45;
}
.branding-header .pill {
  flex-shrink: 0;
}
.branding-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hemo-space-4);
  margin-top: var(--hemo-space-5);
  padding-top: var(--hemo-space-4);
  border-top: 1px solid var(--hemo-color-black-15);
}
.branding-hint {
  color: var(--hemo-color-text-muted);
  font-size: 0.75rem;
}
.event-branding .success-message,
.event-branding .error-message {
  margin-top: var(--hemo-space-3);
}

@media (max-width: 520px) {
  .branding-header,
  .branding-footer {
    align-items: stretch;
    flex-direction: column;
  }
  .branding-header .pill {
    align-self: flex-start;
  }
  .branding-footer .btn {
    width: 100%;
  }
}
</style>
