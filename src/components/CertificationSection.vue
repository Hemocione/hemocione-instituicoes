<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { idApi, type InterestCampaign, type InterestCampaignPayload } from '../api'
import { institutionHasCertification, type Institution } from '../institution'

const props = defineProps<{
  institutionId: string
  institution?: Institution
}>()

const campaigns = ref<InterestCampaign[]>([])
const loading = ref(true)
const saving = ref(false)
const cancelling = ref(false)
const loadErrorMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const copied = ref(false)
const generatedLink = ref<string | null>(null)
const periodLabel = ref('')
const durationDays = ref(7)
const startDate = ref(today())

const activeCampaign = computed(
  () => campaigns.value.find((campaign) => ['scheduled', 'active'].includes(effectiveStatus(campaign))) ?? null
)

const certificationStatus = computed(() => {
  if (institutionHasCertification(props.institution)) return 'certified'
  if (activeCampaign.value) return 'in-progress'
  return 'unverified'
})

function today() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function effectiveStatus(campaign: InterestCampaign) {
  const status = campaign.effectiveStatus
  return String(typeof status === 'string' ? status : campaign.status).toLowerCase()
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
    periodLabel.value = ''
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
    await loadCampaigns()
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    cancelling.value = false
  }
}

async function copyLink() {
  if (!generatedLink.value || !navigator.clipboard) return

  try {
    await navigator.clipboard.writeText(generatedLink.value)
    copied.value = true
  } catch {
    errorMessage.value = 'Não foi possível copiar o link.'
  }
}

watch(() => props.institutionId, loadCampaigns, { immediate: true })
</script>

<template>
  <section class="certification-section">
    <div class="section-heading">
      <div>
        <p class="section-kicker">Mobilização de doadores</p>
        <h3>Certificação</h3>
      </div>
      <span
        v-if="!loading"
        class="pill"
        data-testid="certification-status"
        :class="{
          'pill-success': certificationStatus === 'certified',
          'pill-info': certificationStatus === 'in-progress',
          'pill-neutral': certificationStatus === 'unverified',
        }"
      >
        {{ certificationStatus === 'certified' ? 'Selo concedido' : certificationStatus === 'in-progress' ? 'Em processo de certificação' : 'Não verificado' }}
      </span>
    </div>

    <p v-if="loading" class="empty-state">Carregando campanhas...</p>
    <p v-else-if="loadErrorMessage" class="error-message">{{ loadErrorMessage }}</p>
    <template v-else>
      <div v-if="activeCampaign" class="active-campaign card">
        <div>
          <strong>{{ activeCampaign.periodLabel }}</strong>
          <p>
            {{ formatDate(activeCampaign.startDate) }} a {{ formatDate(activeCampaign.endDate) }}
          </p>
        </div>
        <button type="button" class="btn btn-secondary" :disabled="cancelling" @click="cancelCampaign">
          {{ cancelling ? 'Cancelando...' : 'Cancelar' }}
        </button>
      </div>

      <div v-if="generatedLink" class="generated-link card">
        <strong>Link de interesse criado</strong>
        <div class="link-row">
          <input :value="generatedLink" readonly data-testid="campaign-link" aria-label="Link da campanha" />
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
            <h4>Criar link de interesse</h4>
            <p>Compartilhe o link para reunir disponibilidades para uma coleta externa.</p>
          </div>
        </div>
        <label class="field">
          Período
          <input v-model="periodLabel" type="text" placeholder="Ex.: Março 2026" data-testid="period-input" />
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
        <h4>Histórico de campanhas</h4>
        <div v-for="campaign in campaigns" :key="campaign.id" class="card campaign-history-card">
          <div class="history-header">
            <div>
              <strong>{{ campaign.periodLabel }}</strong>
              <p>{{ formatDate(campaign.startDate) }} a {{ formatDate(campaign.endDate) }}</p>
            </div>
            <span class="pill pill-neutral">{{ statusLabel(effectiveStatus(campaign)) }}</span>
          </div>
          <p class="response-count">
            <strong>{{ responseCount(campaign) }}</strong>
            {{ responseCount(campaign) === 1 ? 'resposta' : 'respostas' }}
          </p>
          <div class="day-breakdown" aria-label="Distribuição por dia da semana">
            <span v-for="day in days" :key="day.label">{{ day.label }}: {{ dayCount(campaign, day.keys) }}</span>
          </div>
        </div>
      </div>
      <p v-else class="empty-state">Nenhuma campanha criada ainda.</p>
    </template>
  </section>
</template>

<style scoped>
.certification-section {
  margin-top: 36px;
}
.section-heading,
.active-campaign,
.link-row,
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.section-heading {
  margin-bottom: 14px;
}
.section-kicker {
  margin: 0 0 4px;
  color: var(--hemo-color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.section-heading h3,
.campaign-history h4,
.campaign-form h4 {
  font-size: 18px;
}
.active-campaign,
.generated-link,
.campaign-form,
.campaign-history-card {
  margin-top: 12px;
}
.active-campaign p,
.form-heading p,
.history-header p {
  margin: 5px 0 0;
  color: var(--hemo-color-black-60);
  font-size: 13px;
}
.generated-link strong {
  font-size: 14px;
}
.link-row {
  margin-top: 10px;
  align-items: stretch;
}
.link-row input {
  min-width: 0;
  flex: 1;
  padding: 9px 12px;
  border: 1px solid var(--hemo-color-black-15);
  border-radius: var(--hemo-radius);
  color: var(--hemo-color-black-80);
  font: inherit;
  font-size: 13px;
}
.campaign-form h4 {
  margin: 0;
}
.form-heading {
  margin-bottom: 16px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 12px;
}
.campaign-form .error-message {
  margin-bottom: 12px;
}
.campaign-history {
  margin-top: 28px;
}
.campaign-history h4 {
  margin: 0 0 12px;
}
.history-header strong {
  font-size: 14px;
}
.response-count {
  margin: 18px 0 10px;
  color: var(--hemo-color-black-80);
  font-size: 14px;
}
.response-count strong {
  color: var(--hemo-color-black-100);
  font-size: 20px;
}
.day-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  color: var(--hemo-color-black-60);
  font-size: 12px;
}

@media (max-width: 560px) {
  .active-campaign,
  .history-header {
    align-items: flex-start;
    flex-direction: column;
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
