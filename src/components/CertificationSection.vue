<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { idApi, type InterestCampaign, type InterestCampaignPayload } from '../api'
import {
  certificationStatusLabel,
  certificationStatusTone,
  effectiveCampaignStatus,
  getCertificationStatus,
} from '../certification'
import type { Institution } from '../institution'

const props = defineProps<{
  institutionId: string
  institution?: Institution
}>()

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

function formatPeriod(date: Date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

function buildPeriodOptions(count = 12) {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const label = formatPeriod(date)
    options.push({ value: label, label })
  }
  return options
}

const periodOptions = buildPeriodOptions()

const campaigns = ref<InterestCampaign[]>([])
const loading = ref(true)
const saving = ref(false)
const cancelling = ref(false)
const loadErrorMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const copied = ref(false)
const generatedLink = ref<string | null>(null)
const periodLabel = ref(periodOptions[0]?.value ?? '')
const durationDays = ref(7)
const startDate = ref(today())

const activeCampaign = computed(
  () => campaigns.value.find((campaign) => ['scheduled', 'active'].includes(effectiveCampaignStatus(campaign))) ?? null
)

const activeCampaignLink = computed(() => {
  const id = activeCampaign.value ? campaignIdFrom(activeCampaign.value) : null
  return id ? publicCampaignUrl(id) : null
})

const displayedLink = computed(() => activeCampaignLink.value ?? generatedLink.value)

const linkWasJustCreated = computed(
  () => generatedLink.value !== null && generatedLink.value === displayedLink.value
)

const certificationStatus = computed(() => getCertificationStatus(props.institution, campaigns.value))

function today() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: 'Agendada',
    active: 'Ativa',
    completed: 'Encerrada',
    cancelled: 'Cancelada',
  }
  return labels[status] ?? status
}

function endDateFrom(start: string, duration: number) {
  const endDate = new Date(`${start}T00:00:00Z`)
  endDate.setUTCDate(endDate.getUTCDate() + duration - 1)
  return endDate.toISOString().slice(0, 10)
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR', { dateStyle: 'short' })
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function aggregateData(campaign: InterestCampaign) {
  return objectValue(campaign.aggregates) ?? objectValue(campaign.aggregate) ?? {}
}

function responseCount(campaign: InterestCampaign) {
  const aggregate = aggregateData(campaign)
  return (
    numberValue(campaign.responseCount) ??
    numberValue(campaign.responsesCount) ??
    numberValue(campaign.totalResponses) ??
    numberValue(aggregate.responseCount) ??
    numberValue(aggregate.totalResponses) ??
    0
  )
}

const days = [
  { keys: ['monday', 'segunda', 'segunda-feira'], label: 'Segunda' },
  { keys: ['tuesday', 'terça', 'terca', 'terça-feira', 'terca-feira'], label: 'Terça' },
  { keys: ['wednesday', 'quarta', 'quarta-feira'], label: 'Quarta' },
  { keys: ['thursday', 'quinta', 'quinta-feira'], label: 'Quinta' },
  { keys: ['friday', 'sexta', 'sexta-feira'], label: 'Sexta' },
  { keys: ['saturday', 'sábado', 'sabado'], label: 'Sábado' },
  { keys: ['sunday', 'domingo'], label: 'Domingo' },
]

function dayDistribution(campaign: InterestCampaign) {
  const aggregate = aggregateData(campaign)
  return (
    objectValue(campaign.dayDistribution) ??
    objectValue(campaign.responsesByDay) ??
    objectValue(campaign.responsesByDayOfWeek) ??
    objectValue(aggregate.dayDistribution) ??
    objectValue(aggregate.byDayOfWeek) ??
    {}
  )
}

function dayCount(campaign: InterestCampaign, keys: string[]) {
  const distribution = dayDistribution(campaign)
  const entry = Object.entries(distribution).find(([key]) => keys.includes(key.toLowerCase()))
  return entry ? numberValue(entry[1]) ?? 0 : 0
}

function campaignIdFrom(value: unknown): string | null {
  const data = objectValue(value)
  if (!data) return null
  if (typeof data.id === 'string') return data.id
  if (typeof data.campaignId === 'string') return data.campaignId
  return campaignIdFrom(data.campaign)
}

function publicCampaignUrl(id: string) {
  return `${window.location.origin}/interesse/${encodeURIComponent(id)}`
}

function errorText(error: unknown) {
  const status = objectValue(error)?.status
  const message = error instanceof Error ? error.message : ''
  if (status === 409 || message.includes('409')) {
    return 'Já existe uma campanha de interesse agendada ou ativa para esta instituição.'
  }
  return message || 'Erro desconhecido'
}

async function loadCampaigns() {
  loading.value = true
  loadErrorMessage.value = null
  try {
    campaigns.value = await idApi.listInterestCampaigns(props.institutionId)
  } catch (error) {
    loadErrorMessage.value = errorText(error)
  } finally {
    loading.value = false
  }
}

async function createCampaign() {
  errorMessage.value = null
  copied.value = false

  if (!periodLabel.value.trim()) {
    errorMessage.value = 'Informe o período da campanha.'
    return
  }
  if (!startDate.value) {
    errorMessage.value = 'Informe a data de início.'
    return
  }
  if (durationDays.value < 7 || durationDays.value > 14) {
    errorMessage.value = 'A duração deve estar entre 7 e 14 dias.'
    return
  }

  const payload: InterestCampaignPayload = {
    periodLabel: periodLabel.value.trim(),
    startDate: startDate.value,
    endDate: endDateFrom(startDate.value, durationDays.value),
  }

  saving.value = true
  try {
    const createdCampaign = await idApi.createInterestCampaign(props.institutionId, payload)
    const id = campaignIdFrom(createdCampaign)
    if (!id) throw new Error('A campanha foi criada sem identificador.')
    generatedLink.value = publicCampaignUrl(id)
    periodLabel.value = periodOptions[0]?.value ?? ''
    await loadCampaigns()
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    saving.value = false
  }
}

async function cancelCampaign() {
  if (!activeCampaign.value) return
  const id = campaignIdFrom(activeCampaign.value)
  if (!id) return

  errorMessage.value = null
  cancelling.value = true
  try {
    await idApi.cancelInterestCampaign(props.institutionId, id)
    generatedLink.value = null
    await loadCampaigns()
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    cancelling.value = false
  }
}

async function copyLink() {
  const link = displayedLink.value
  if (!link || !navigator.clipboard) return

  try {
    await navigator.clipboard.writeText(link)
    copied.value = true
  } catch {
    errorMessage.value = 'Não foi possível copiar o link.'
  }
}

watch(displayedLink, () => {
  copied.value = false
})

watch(() => props.institutionId, loadCampaigns, { immediate: true })
</script>

<template>
  <section class="certification-section">
    <div class="section-heading">
      <div class="section-copy">
        <p class="section-kicker">Mobilização de doadores</p>
        <h3>Certificação</h3>
        <p class="section-description">Reúna disponibilidades e prepare sua instituição para a próxima coleta.</p>
      </div>
      <span
        v-if="!loading"
        class="pill"
        data-testid="certification-status"
        :class="`pill-${certificationStatusTone(certificationStatus)}`"
      >
        {{ certificationStatusLabel(certificationStatus) }}
      </span>
    </div>

    <div v-if="loading" class="loading-state">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>Carregando campanhas...</span>
    </div>
    <p v-else-if="loadErrorMessage" class="error-message">{{ loadErrorMessage }}</p>
    <template v-else>
      <div v-if="activeCampaign" class="active-campaign card">
        <div class="campaign-summary">
          <p class="card-kicker">Campanha em andamento</p>
          <strong>{{ activeCampaign.periodLabel }}</strong>
          <p>
            {{ formatDate(activeCampaign.startDate) }} a {{ formatDate(activeCampaign.endDate) }}
          </p>
        </div>
        <button type="button" class="btn btn-secondary" :disabled="cancelling" @click="cancelCampaign">
          {{ cancelling ? 'Cancelando...' : 'Cancelar' }}
        </button>
      </div>

      <div v-if="displayedLink" class="generated-link card">
        <div class="generated-link-heading">
          <p class="card-kicker">Compartilhe com sua rede</p>
          <strong>{{ linkWasJustCreated ? 'Link de interesse criado' : 'Seu link de interesse' }}</strong>
        </div>
        <div class="link-row">
          <label class="field link-field">
            Link público
            <input :value="displayedLink" readonly data-testid="campaign-link" aria-label="Link da campanha" />
          </label>
          <button type="button" class="btn btn-secondary" @click="copyLink">
            {{ copied ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
      </div>

      <form
        class="card campaign-form"
        data-testid="create-campaign-form"
        @submit.prevent="createCampaign"
      >
        <div class="form-heading">
          <div>
            <p class="card-kicker">Nova campanha</p>
            <h4>Criar link de interesse</h4>
            <p>Compartilhe o link para reunir disponibilidades para uma coleta externa.</p>
          </div>
        </div>
        <label class="field">
          Período
          <select v-model="periodLabel" data-testid="period-input">
            <option v-for="option in periodOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <div class="form-grid">
          <label class="field">
            Duração (dias)
            <input
              v-model.number="durationDays"
              type="number"
              min="7"
              max="14"
              data-testid="duration-input"
            />
          </label>
          <label class="field">
            Data de início
            <input v-model="startDate" type="date" :min="today()" data-testid="start-date-input" />
          </label>
        </div>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <button type="submit" class="btn btn-primary" :disabled="saving || !!activeCampaign">
          {{ saving ? 'Criando...' : activeCampaign ? 'Já existe uma campanha em andamento' : 'Criar link' }}
        </button>
      </form>

      <div v-if="campaigns.length" class="campaign-history">
        <div class="history-heading">
          <p class="section-kicker">Registro</p>
          <h4>Histórico de campanhas</h4>
        </div>
        <div v-for="campaign in campaigns" :key="campaign.id" class="card campaign-history-card">
          <div class="history-header">
            <div>
              <strong>{{ campaign.periodLabel }}</strong>
              <p>{{ formatDate(campaign.startDate) }} a {{ formatDate(campaign.endDate) }}</p>
            </div>
            <span class="pill pill-neutral">{{ statusLabel(effectiveCampaignStatus(campaign)) }}</span>
          </div>
          <p class="response-count">
            <strong>{{ responseCount(campaign) }}</strong>
            {{ responseCount(campaign) === 1 ? 'resposta' : 'respostas' }}
          </p>
          <div class="day-breakdown" aria-label="Distribuição por dia da semana">
            <span v-for="day in days" :key="day.label" class="pill pill-neutral day-chip">
              {{ day.label }}: {{ dayCount(campaign, day.keys) }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state card campaigns-empty-state">
        <span class="empty-state-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" stroke="currentColor" stroke-width="1.8" />
            <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H19M8 8h7M8 11h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </span>
        <strong class="empty-state-title">Nenhuma campanha criada ainda.</strong>
        <span class="empty-state-description">Crie um link para começar a reunir disponibilidades.</span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.certification-section {
  margin-top: var(--hemo-space-8);
  padding-top: var(--hemo-space-7);
  border-top: 1px solid var(--hemo-color-black-15);
}
.section-heading,
.active-campaign,
.link-row,
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hemo-space-4);
}
.section-heading {
  align-items: flex-start;
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
.section-copy {
  min-width: 0;
}
.section-heading h3,
.campaign-history h4,
.campaign-form h4 {
  font-size: 1.25rem;
}
.section-description {
  max-width: 540px;
  margin-top: var(--hemo-space-2);
  color: var(--hemo-color-text-muted);
  font-size: 0.875rem;
}
.section-heading > .pill {
  flex-shrink: 0;
}
.active-campaign,
.generated-link,
.campaign-form,
.campaign-history-card {
  margin-top: var(--hemo-space-3);
}
.active-campaign {
  align-items: flex-end;
}
.campaign-summary {
  min-width: 0;
}
.card-kicker {
  margin: 0 0 var(--hemo-space-1);
  color: var(--hemo-color-text-muted);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.3;
  text-transform: uppercase;
}
.active-campaign p,
.form-heading p,
.history-header p {
  margin: var(--hemo-space-1) 0 0;
  color: var(--hemo-color-text-muted);
  font-size: 0.8125rem;
}
.generated-link strong {
  color: var(--hemo-color-black-100);
  font-size: 0.9375rem;
}
.link-row {
  align-items: flex-end;
  margin-top: var(--hemo-space-3);
}
.link-field {
  flex: 1;
  min-width: 0;
  margin: 0;
}
.link-field input {
  color: var(--hemo-color-black-80);
  font-size: 0.8125rem;
}
.link-row .btn {
  flex-shrink: 0;
  align-self: flex-end;
}
.campaign-form {
  margin-top: var(--hemo-space-4);
}
.campaign-form h4 {
  margin: 0;
}
.form-heading {
  margin-bottom: var(--hemo-space-5);
}
.form-heading > div {
  min-width: 0;
}
.form-heading p:not(.card-kicker) {
  max-width: 600px;
  line-height: 1.45;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: var(--hemo-space-3);
}
.campaign-form .error-message {
  margin-bottom: var(--hemo-space-3);
}
.campaign-form > .btn {
  min-width: 132px;
}
.campaign-history {
  margin-top: var(--hemo-space-7);
}
.history-heading {
  margin-bottom: var(--hemo-space-3);
}
.history-heading h4 {
  margin: 0;
}
.history-header {
  align-items: flex-start;
}
.history-header strong {
  color: var(--hemo-color-black-100);
  font-size: 0.9375rem;
}
.history-header .pill {
  flex-shrink: 0;
}
.response-count {
  display: flex;
  align-items: baseline;
  gap: var(--hemo-space-2);
  margin: var(--hemo-space-5) 0 var(--hemo-space-3);
  color: var(--hemo-color-black-80);
  font-size: 0.875rem;
}
.response-count strong {
  color: var(--hemo-color-black-100);
  font-size: 1.5rem;
  line-height: 1;
}
.day-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: var(--hemo-space-2);
}
.day-chip {
  min-height: 24px;
  padding: 4px 8px;
  font-size: 0.6875rem;
}
.campaigns-empty-state {
  margin-top: var(--hemo-space-4);
}
.empty-state-icon svg {
  width: 20px;
  height: 20px;
}

@media (max-width: 560px) {
  .section-heading,
  .active-campaign,
  .history-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .section-heading > .pill,
  .history-header .pill {
    align-self: flex-start;
  }
  .form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .link-row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
