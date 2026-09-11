<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { idApi, type PublicInterestCampaign } from '../api'
import { isAuthenticated, redirectToLogin } from '../auth'

type CampaignStep = 'intro' | 'selection' | 'confirmed'

const route = useRoute()
const campaignId = computed(() => String(route.params.campaignId))
const campaign = ref<PublicInterestCampaign | null>(null)
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const step = ref<CampaignStep>('intro')
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

function resumePendingResponse() {
  const pendingUrl = sessionStorage.getItem('interest_campaign_pending_url')
  if (isAuthenticated() && pendingUrl === currentPageUrl() && campaign.value?.isAcceptingResponses) {
    sessionStorage.removeItem('interest_campaign_pending_url')
    step.value = 'selection'
  }
}

function startResponse() {
  if (!campaign.value?.isAcceptingResponses) return

  if (!isAuthenticated()) {
    sessionStorage.setItem('interest_campaign_pending_url', currentPageUrl())
    redirectToLogin()
    return
  }

  step.value = 'selection'
}

async function submitResponse() {
  if (!selectedDays.value.length) {
    errorMessage.value = 'Selecione pelo menos um dia da semana.'
    return
  }

  errorMessage.value = null
  submitting.value = true
  try {
    await idApi.respondToInterestCampaign(campaignId.value, selectedDays.value)
    sessionStorage.removeItem('interest_campaign_pending_url')
    step.value = 'confirmed'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    submitting.value = false
  }
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
    resumePendingResponse()
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
    <p v-if="loading" class="empty-state">Carregando campanha...</p>
    <p v-else-if="errorMessage && !campaign" class="error-message">{{ errorMessage }}</p>
    <article v-else-if="campaign" class="public-campaign card">
      <img
        v-if="campaign.institutionBannerUrl"
        :src="campaign.institutionBannerUrl"
        :alt="`Banner da ${campaign.institutionName}`"
        class="campaign-banner"
      />

      <div class="campaign-content">
        <img
          v-if="campaign.institutionLogoUrl"
          :src="campaign.institutionLogoUrl"
          :alt="`Logo da ${campaign.institutionName}`"
          class="campaign-logo"
        />
        <p class="campaign-kicker">Campanha de interesse</p>
        <h1>{{ campaign.institutionName }}</h1>
        <p class="campaign-period">{{ campaign.periodLabel }}</p>

        <template v-if="step === 'intro'">
          <div class="campaign-question">
            <span class="question-label">Pergunta</span>
            <p>{{ campaign.questionText }}</p>
          </div>
          <p v-if="!campaign.isAcceptingResponses" class="closed-message">
            Essa campanha não está mais aceitando respostas.
          </p>
          <button
            type="button"
            class="btn btn-primary campaign-action"
            data-testid="interest-button"
            :disabled="!campaign.isAcceptingResponses"
            @click="startResponse"
          >
            Tenho interesse
          </button>
        </template>

        <form v-else-if="step === 'selection'" class="response-form" @submit.prevent="submitResponse">
          <label class="field" for="available-days">
            Quais dias da semana você tem disponíveis?
            <select id="available-days" v-model="selectedDays" multiple size="7" data-testid="days-select">
              <option v-for="day in weekDays" :key="day.value" :value="day.value">{{ day.label }}</option>
            </select>
          </label>
          <p class="selection-hint">Use Ctrl ou Command para selecionar mais de um dia.</p>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          <button
            type="submit"
            class="btn btn-primary campaign-action"
            data-testid="confirm-response-button"
            :disabled="submitting"
          >
            {{ submitting ? 'Enviando...' : 'Confirmar interesse' }}
          </button>
        </form>

        <section v-else class="confirmation" data-testid="confirmation-state">
          <p class="confirmation-mark" aria-hidden="true">✓</p>
          <h2>Obrigado pelo seu interesse!</h2>
          <p>Sua disponibilidade foi registrada. Compartilhe esta campanha com mais pessoas.</p>
          <a :href="whatsappUrl" target="_blank" rel="noopener" class="btn btn-secondary campaign-action">
            Compartilhar no WhatsApp
          </a>
        </section>
      </div>
    </article>
  </main>
</template>

<style scoped>
.interest-page {
  max-width: 620px;
  padding-top: 24px;
}
.public-campaign {
  overflow: hidden;
  padding: 0;
}
.campaign-banner {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: cover;
}
.campaign-content {
  padding: 28px;
}
.campaign-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  border: 1px solid var(--hemo-color-black-15);
  border-radius: var(--hemo-radius);
  background: var(--hemo-color-white);
  margin-bottom: 18px;
}
.campaign-kicker,
.question-label {
  margin: 0 0 6px;
  color: var(--hemo-color-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.campaign-content h1 {
  font-size: 28px;
  line-height: 1.15;
}
.campaign-period {
  margin: 8px 0 26px;
  color: var(--hemo-color-black-60);
  font-size: 15px;
}
.campaign-question {
  margin-bottom: 20px;
  padding: 18px;
  border-left: 3px solid var(--hemo-color-primary);
  background: var(--hemo-color-black-5);
}
.campaign-question p {
  margin: 0;
  font-size: 18px;
  line-height: 1.45;
}
.campaign-action {
  width: 100%;
}
.closed-message {
  margin: 0 0 16px;
  color: var(--hemo-color-black-80);
  font-size: 14px;
}
.response-form .field {
  margin-bottom: 6px;
}
.response-form select {
  padding: 6px;
}
.response-form option {
  padding: 7px 8px;
}
.selection-hint {
  margin: 0 0 14px;
  color: var(--hemo-color-black-60);
  font-size: 12px;
}
.response-form .error-message {
  margin-bottom: 14px;
}
.confirmation {
  text-align: center;
}
.confirmation-mark {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: rgba(42, 199, 105, 0.14);
  color: #1b8f4c;
  font-size: 28px;
  font-weight: 700;
}
.confirmation h2 {
  font-size: 22px;
}
.confirmation > p:not(.confirmation-mark) {
  margin: 10px 0 20px;
  color: var(--hemo-color-black-80);
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 520px) {
  .campaign-content {
    padding: 22px 18px;
  }
  .campaign-content h1 {
    font-size: 24px;
  }
}
</style>
