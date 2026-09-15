<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { idApi, type PublicInterestCampaign } from '../api'
import { isAuthenticated, redirectToLogin } from '../auth'

type CampaignStep = 'selection' | 'confirmed'

const route = useRoute()
const campaignId = computed(() => String(route.params.campaignId))
const campaign = ref<PublicInterestCampaign | null>(null)
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const step = ref<CampaignStep>('selection')
const selectedDays = ref<string[]>([])
const previousTitle = ref('')

const weekDays = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
]

const validDayValues = new Set(weekDays.map((day) => day.value))

function currentPageUrl() {
  return `${window.location.origin}${route.path}`
}

const createdMetaTags: HTMLMetaElement[] = []
const originalMetaContent = new Map<HTMLMetaElement, string | null>()

function updateMeta(attribute: 'name' | 'property', key: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)

  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attribute, key)
    document.head.appendChild(meta)
    createdMetaTags.push(meta)
  } else if (!originalMetaContent.has(meta) && !createdMetaTags.includes(meta)) {
    originalMetaContent.set(meta, meta.getAttribute('content'))
  }

  meta.setAttribute('content', content)
}

function updateCampaignMeta(data?: PublicInterestCampaign) {
  const institutionName = data?.institutionName ?? 'Campanha de interesse'
  const description = data?.questionText ?? 'Demonstre seu interesse em participar de uma coleta externa.'
  const image = data?.institutionBannerUrl || data?.institutionLogoUrl

  document.title = `${institutionName} | Campanha de interesse`
  updateMeta('name', 'robots', 'noindex,nofollow')
  updateMeta('property', 'og:title', `${institutionName} | Campanha de interesse`)
  updateMeta('property', 'og:description', description)
  if (image) {
    updateMeta('property', 'og:image', image)
  }
  updateMeta('property', 'og:url', currentPageUrl())
}

// Uses campaign.questionText when it adds something new; otherwise falls back
// to a short direct question so the page never repeats itself.
const selectorQuestion = computed(() => {
  const question = campaign.value?.questionText?.trim()
  if (!question) return 'Você tem interesse em participar?'
  const lower = question.toLowerCase()
  const name = campaign.value?.institutionName.toLowerCase() ?? ''
  const period = campaign.value?.periodLabel.toLowerCase() ?? ''
  if ((name && lower.includes(name)) || (period && lower.includes(period))) {
    return 'Você tem interesse em participar?'
  }
  return question
})

function isSelected(value: string) {
  return selectedDays.value.includes(value)
}

function toggleDay(value: string) {
  if (isSelected(value)) {
    selectedDays.value = selectedDays.value.filter((day) => day !== value)
  } else {
    selectedDays.value = [...selectedDays.value, value]
  }
  if (selectedDays.value.length > 0 && errorMessage.value === 'Selecione pelo menos um dia da semana.') {
    errorMessage.value = null
  }
}

async function submitResponse() {
  if (!selectedDays.value.length) {
    errorMessage.value = 'Selecione pelo menos um dia da semana.'
    return
  }

  errorMessage.value = null

  if (!isAuthenticated()) {
    localStorage.setItem(`interest_campaign_pending:${campaignId.value}`, JSON.stringify(selectedDays.value))
    redirectToLogin({ resume_days: selectedDays.value.join(',') })
    return
  }

  submitting.value = true
  try {
    await idApi.respondToInterestCampaign(campaignId.value, selectedDays.value)
    localStorage.setItem(`interest_campaign_responded:${campaignId.value}`, 'true')
    localStorage.removeItem(`interest_campaign_pending:${campaignId.value}`)
    step.value = 'confirmed'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    submitting.value = false
  }
}

function restorePrefill() {
  if (!campaign.value) return

  const respondedKey = `interest_campaign_responded:${campaignId.value}`
  const pendingKey = `interest_campaign_pending:${campaignId.value}`

  if (localStorage.getItem(respondedKey) === 'true') {
    step.value = 'confirmed'
    return
  }

  const rawParam = new URLSearchParams(window.location.search).get('resume_days')
  const fromQuery = rawParam !== null && rawParam !== ''
  let prefill: string[] = []

  if (rawParam !== null) {
    prefill = rawParam.split(',').filter((value) => validDayValues.has(value))
  } else {
    try {
      const stored = localStorage.getItem(pendingKey)
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          prefill = parsed.filter((value): value is string => typeof value === 'string' && validDayValues.has(value))
        }
      }
    } catch {
      prefill = []
    }
  }

  if (prefill.length === 0) return
  if (!isAuthenticated() || !campaign.value.isAcceptingResponses) return

  selectedDays.value = prefill
  if (fromQuery) {
    const params = new URLSearchParams(window.location.search)
    params.delete('resume_days')
    const query = params.toString()
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    )
  }
  localStorage.removeItem(pendingKey)
}

const whatsappUrl = computed(() => {
  const institutionName = campaign.value?.institutionName ?? 'a instituição'
  const message = `Tenho interesse em participar da campanha de ${institutionName}. Saiba mais: ${currentPageUrl()}`
  return `https://wa.me/?text=${encodeURIComponent(message)}`
})

onMounted(async () => {
  previousTitle.value = document.title
  updateCampaignMeta()

  try {
    campaign.value = await idApi.getPublicInterestCampaign(campaignId.value)
    updateCampaignMeta(campaign.value)
    restorePrefill()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  document.title = previousTitle.value
  createdMetaTags.forEach((meta) => meta.remove())
  originalMetaContent.forEach((content, meta) => {
    if (content === null) {
      meta.remove()
    } else {
      meta.setAttribute('content', content)
    }
  })
})
</script>

<template>
  <main class="page interest-page">
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>Carregando campanha...</span>
    </div>
    <div v-else-if="errorMessage && !campaign" class="card campaign-error">
      <p class="error-message">{{ errorMessage }}</p>
    </div>
    <article v-else-if="campaign" class="public-campaign card">
      <img
        v-if="campaign.institutionBannerUrl"
        :src="campaign.institutionBannerUrl"
        :alt="`Banner da ${campaign.institutionName}`"
        class="campaign-banner"
      />

      <div class="campaign-content">
        <div class="campaign-heading">
          <img
            v-if="campaign.institutionLogoUrl"
            :src="campaign.institutionLogoUrl"
            :alt="`Logo da ${campaign.institutionName}`"
            class="campaign-logo"
          />
          <div>
            <h1>{{ campaign.institutionName }}</h1>
            <p class="period-badge">Coleta prevista: {{ campaign.periodLabel }}</p>
          </div>
        </div>

        <section v-if="step === 'confirmed'" class="confirmation" data-testid="confirmation-state">
          <p class="confirmation-mark" aria-hidden="true">✓</p>
          <h2>Obrigado pelo seu interesse!</h2>
          <p>Sua disponibilidade foi registrada. Compartilhe esta campanha com mais pessoas.</p>
          <a :href="whatsappUrl" target="_blank" rel="noopener" class="btn btn-secondary campaign-action">
            Compartilhar no WhatsApp
          </a>
        </section>

        <template v-else>
          <p class="campaign-intro">
            A {{ campaign.institutionName }} está reunindo pessoas interessadas em doar sangue em uma
            próxima coleta, em {{ campaign.periodLabel }}. Sua resposta ajuda a instituição a garantir
            uma data com o banco de sangue.
          </p>

          <p v-if="!campaign.isAcceptingResponses" class="closed-message">
            <span class="pill pill-warning">Encerrada</span>
            Essa campanha não está mais aceitando respostas.
          </p>

          <form v-else class="response-form" @submit.prevent="submitResponse">
            <fieldset class="days-fieldset">
              <legend class="days-legend">{{ selectorQuestion }}</legend>
              <div class="days-grid">
                <button
                  v-for="day in weekDays"
                  :key="day.value"
                  type="button"
                  class="day-toggle"
                  :class="{ 'day-toggle-selected': isSelected(day.value) }"
                  :aria-pressed="isSelected(day.value)"
                  :data-testid="`day-toggle-${day.value}`"
                  @click="toggleDay(day.value)"
                >
                  <span v-if="isSelected(day.value)" class="day-check" aria-hidden="true">✓</span>
                  {{ day.label }}
                </button>
              </div>
            </fieldset>
            <p v-if="errorMessage" class="error-message form-error" role="alert">{{ errorMessage }}</p>
            <button
              type="submit"
              class="btn btn-primary campaign-action"
              data-testid="confirm-response-button"
              :disabled="submitting"
            >
              {{ submitting ? 'Enviando...' : 'Confirmar interesse' }}
            </button>
          </form>
        </template>
      </div>
    </article>
  </main>
</template>

<style scoped>
.interest-page {
  width: 100%;
  max-width: none;
  min-height: 100vh;
  min-height: 100dvh;
  max-height: 100vh;
  max-height: 100dvh;
  margin: 0;
  padding: 24px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
}
.interest-page .loading-state,
.interest-page .campaign-error {
  width: 100%;
  max-width: 620px;
  max-height: calc(100vh - 48px);
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  margin: auto;
}
.public-campaign {
  overflow: hidden;
  overflow-y: auto;
  width: 100%;
  max-width: 620px;
  max-height: calc(100vh - 48px);
  max-height: calc(100dvh - 48px);
  margin: auto;
  padding: 0;
  border-radius: var(--hemo-radius-lg);
}
.campaign-banner {
  display: block;
  width: 100%;
  height: 220px;
  object-fit: cover;
  background: var(--hemo-color-secondary);
}
.campaign-content {
  padding: var(--hemo-space-8);
}
.campaign-heading {
  display: flex;
  align-items: flex-start;
  gap: var(--hemo-space-4);
}
.campaign-logo {
  flex: 0 0 64px;
  width: 64px;
  height: 64px;
  object-fit: contain;
  border: 1px solid var(--hemo-color-border);
  border-radius: var(--hemo-radius-lg);
  background: var(--hemo-color-white);
  padding: var(--hemo-space-2);
}
.campaign-content h1 {
  font-size: 1.875rem;
  line-height: 1.15;
}
.period-badge {
  display: inline-flex;
  align-items: center;
  margin: var(--hemo-space-3) 0 0;
  padding: var(--hemo-space-2) var(--hemo-space-4);
  border: 1px solid rgba(187, 10, 8, 0.22);
  border-radius: var(--hemo-radius-full);
  background: var(--hemo-color-danger-soft);
  color: var(--hemo-color-primary-dark);
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.3;
}
.campaign-intro {
  margin: var(--hemo-space-6) 0 0;
  color: var(--hemo-color-black-80);
  font-size: 1rem;
  line-height: 1.6;
}
.campaign-action {
  width: 100%;
}
.closed-message {
  display: flex;
  align-items: center;
  gap: var(--hemo-space-2);
  margin: var(--hemo-space-6) 0 0;
  color: var(--hemo-color-black-80);
  font-size: 0.875rem;
}
.response-form {
  margin-top: var(--hemo-space-7);
}
.days-fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.days-legend {
  padding: 0;
  margin-bottom: var(--hemo-space-4);
  color: var(--hemo-color-black-100);
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.4;
}
.days-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--hemo-space-3);
}
.day-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--hemo-space-2);
  min-height: 48px;
  padding: var(--hemo-space-3) var(--hemo-space-2);
  border: 1.5px solid var(--hemo-color-black-20);
  border-radius: var(--hemo-radius);
  background: var(--hemo-color-white);
  color: var(--hemo-color-black-80);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}
.day-toggle:hover {
  border-color: var(--hemo-color-primary);
  color: var(--hemo-color-primary-dark);
}
.day-toggle:focus-visible {
  outline: none;
  border-color: var(--hemo-color-primary);
  box-shadow: var(--hemo-shadow-focus);
}
.day-toggle-selected {
  border-color: var(--hemo-color-primary);
  background: var(--hemo-color-danger-soft);
  color: var(--hemo-color-primary-dark);
  font-weight: 700;
}
.day-toggle-selected:hover {
  border-color: var(--hemo-color-primary-dark);
  color: var(--hemo-color-primary-dark);
}
.day-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  border-radius: var(--hemo-radius-full);
  background: var(--hemo-color-primary);
  color: var(--hemo-color-white);
  font-size: 0.75rem;
  font-weight: 700;
}
.form-error {
  margin: var(--hemo-space-4) 0 0;
}
.response-form .campaign-action {
  margin-top: var(--hemo-space-5);
  min-height: 48px;
  font-size: 1rem;
}
.confirmation {
  margin-top: var(--hemo-space-7);
  text-align: center;
}
.confirmation-mark {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  margin: 0 auto var(--hemo-space-4);
  border-radius: var(--hemo-radius-full);
  background: var(--hemo-color-success-soft);
  color: var(--hemo-color-success-text);
  font-size: 1.75rem;
  font-weight: 700;
}
.confirmation h2 {
  font-size: 1.375rem;
}
.confirmation > p:not(.confirmation-mark) {
  margin: var(--hemo-space-2) 0 var(--hemo-space-5);
  color: var(--hemo-color-black-80);
  font-size: 0.875rem;
  line-height: 1.5;
}
.campaign-error {
  padding: var(--hemo-space-4);
}
.campaign-error .error-message {
  margin: 0;
}

@media (min-width: 640px) {
  .days-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 640px) {
  .interest-page {
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
  }
  .interest-page .loading-state,
  .interest-page .campaign-error {
    max-width: none;
    max-height: 100vh;
    max-height: 100dvh;
    border: 0;
    border-radius: 0;
  }
  .public-campaign {
    max-width: none;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    max-height: 100vh;
    max-height: 100dvh;
    margin: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
}

@media (max-width: 520px) {
  .campaign-content {
    padding: var(--hemo-space-6) var(--hemo-space-4);
  }
  .campaign-banner {
    height: 160px;
  }
  .campaign-heading {
    gap: var(--hemo-space-3);
  }
  .campaign-logo {
    flex-basis: 52px;
    width: 52px;
    height: 52px;
  }
  .campaign-content h1 {
    font-size: 1.5rem;
  }
}
</style>
