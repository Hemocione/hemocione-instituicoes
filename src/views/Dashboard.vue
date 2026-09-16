<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { coletaApi, digitalEventApi, idApi, type InterestCampaign } from '../api'
import { institutions, activeInstitutionId, setInstitutions, activeInstitution } from '../institution'
import { config } from '../config'
import { statusLabel, statusTone } from '../statusLabels'
import { certificationStatusLabel, certificationStatusTone, getCertificationStatus } from '../certification'
import InstitutionImageUploadField from '../components/InstitutionImageUploadField.vue'
import InstitutionKindIcon from '../components/InstitutionKindIcon.vue'
import { computeSubscriptionTrend, pickFeaturedEvent, type EventSummary, type SubscriberRecord } from '../eventWindows'

type CollectionRequestSummary = {
  id: string
  status: string
  counterProposal?: { proposedDates: { date: string; startTime: string }[] }
}

const requests = ref<CollectionRequestSummary[]>([])
const certificationCampaigns = ref<InterestCampaign[]>([])
const events = ref<EventSummary[]>([])
const featuredEventSubscribers = ref<{ total: number; items: SubscriberRecord[] }>({ total: 0, items: [] })
const loading = ref(true)
const errorMessage = ref<string | null>(null)

const certificationStatus = computed(() => getCertificationStatus(activeInstitution(), certificationCampaigns.value))
const featuredEvent = computed(() => pickFeaturedEvent(events.value, new Date()))
const subscriberTrend = computed(() => computeSubscriptionTrend(featuredEventSubscribers.value.items, new Date()))

function newRequestUrl(institutionId: string) {
  return `${config.hemocioneColetaUrl}/agendar?institutionId=${encodeURIComponent(institutionId)}`
}

function nextProposedDate(request: CollectionRequestSummary): string | null {
  const firstDate = request.counterProposal?.proposedDates?.[0]
  if (!firstDate) return null
  return new Date(firstDate.date).toLocaleDateString('pt-BR')
}

async function loadRequests(institutionId: string) {
  const requestData = await coletaApi.listCollectionRequests(institutionId)
  requests.value = requestData.collectionRequests ?? requestData.items ?? requestData
}

async function loadCertificationCampaigns(institutionId: string) {
  try {
    certificationCampaigns.value = await idApi.listInterestCampaigns(institutionId)
  } catch {
    certificationCampaigns.value = []
  }
}

async function loadEvents(institutionId: string) {
  try {
    const data = await digitalEventApi.listEventsForInstitution(institutionId)
    events.value = data.items ?? []

    const featured = pickFeaturedEvent(events.value, new Date())
    if (featured) {
      featuredEventSubscribers.value = await digitalEventApi.getEventSubscribers(institutionId, featured.slug)
    }
  } catch {
    events.value = []
    featuredEventSubscribers.value = { total: 0, items: [] }
  }
}

function downloadSubscribersCsv() {
  const rows = featuredEventSubscribers.value.items
  const header = 'nome,email,telefone,documento\n'
  const body = rows
    .map((row) => [row.name, row.email, row.phone, row.document].map((value) => `"${value ?? ''}"`).join(','))
    .join('\n')
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `inscritos-${featuredEvent.value?.slug ?? 'evento'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function updateInstitutionImage(kind: 'logo' | 'banner', url: string) {
  const institution = activeInstitution()
  if (institution) institution[kind] = url
}

onMounted(async () => {
  try {
    const data = await idApi.myInstitutions()
    setInstitutions(data)

    if (activeInstitutionId.value) {
      await Promise.all([
        loadRequests(activeInstitutionId.value),
        loadCertificationCampaigns(activeInstitutionId.value),
        loadEvents(activeInstitutionId.value),
      ])
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="page dashboard">
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>Carregando painel...</span>
    </div>
    <p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <template v-else>
      <div v-if="!institutions.length" class="empty-state card dashboard-state">
        <span class="empty-state-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 20h16M6 20V8l6-4 6 4v12M9 11h.01M15 11h.01M9 15h.01M15 15h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <strong class="empty-state-title">Você ainda não tem instituição associada.</strong>
        <span class="empty-state-description">Associe uma instituição para acompanhar seus pedidos de coleta.</span>
        <RouterLink to="/instituicoes/nova" class="btn btn-primary">Cadastrar minha instituição</RouterLink>
      </div>
      <template v-else>
        <div class="dashboard-header">
          <div class="page-heading">
            <p class="page-kicker">Visão geral</p>
            <h1>
              <InstitutionKindIcon :kind="activeInstitution()?.kind" />
              <span class="institution-name">{{ activeInstitution()?.name }}</span>
            </h1>
            <p class="page-description">Acompanhe solicitações e mobilize doadores em um só lugar.</p>
          </div>
          <a
            v-if="activeInstitutionId"
            :href="newRequestUrl(activeInstitutionId)"
            target="_blank"
            rel="noopener"
            class="btn btn-primary"
          >
            <span aria-hidden="true">+</span>
            Nova solicitação
          </a>
        </div>

        <section v-if="activeInstitution()?.role === 'admin'" class="institution-images-section" aria-labelledby="institution-images-title">
          <div class="section-heading institution-images-heading">
            <div>
              <p class="section-kicker">Identidade</p>
              <h2 id="institution-images-title">Imagens da instituição</h2>
              <p class="section-description">Atualize a logo e o banner exibidos para sua instituição.</p>
            </div>
          </div>
          <div v-if="activeInstitutionId" class="institution-images-grid">
            <InstitutionImageUploadField
              kind="logo"
              :institution-id="activeInstitutionId"
              :model-value="activeInstitution()?.logo"
              @update:model-value="updateInstitutionImage('logo', $event)"
            />
            <InstitutionImageUploadField
              kind="banner"
              :institution-id="activeInstitutionId"
              :model-value="activeInstitution()?.banner"
              @update:model-value="updateInstitutionImage('banner', $event)"
            />
          </div>
        </section>

        <section class="requests-section" aria-labelledby="requests-title">
          <div class="section-heading">
            <div>
              <p class="section-kicker">Acompanhamento</p>
              <h2 id="requests-title">Meus pedidos</h2>
            </div>
            <span v-if="requests.length" class="section-count">{{ requests.length }} {{ requests.length === 1 ? 'pedido' : 'pedidos' }}</span>
          </div>
          <div v-if="requests.length" class="request-list">
            <RouterLink
              v-for="request in requests"
              :key="request.id"
              :to="`/pedidos/${request.id}`"
              class="card request-card"
            >
              <span class="request-card-content">
                <span class="request-label">Solicitação de coleta</span>
                <span class="request-id">Pedido {{ request.id }}</span>
                <span v-if="nextProposedDate(request)" data-testid="request-next-date" class="request-next-date">
                  Proposta: {{ nextProposedDate(request) }}
                </span>
              </span>
              <span class="request-card-action">
                <span class="pill" :class="`pill-${statusTone(request.status)}`">{{ statusLabel(request.status) }}</span>
                <span class="request-arrow" aria-hidden="true">→</span>
              </span>
            </RouterLink>
          </div>
          <div v-else class="empty-state card request-empty-state">
            <span class="empty-state-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7 4h10a2 2 0 0 1 2 2v13H5V6a2 2 0 0 1 2-2ZM8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <strong class="empty-state-title">Nenhum pedido de coleta ainda.</strong>
            <span class="empty-state-description">Quando você criar um pedido, o acompanhamento aparecerá aqui.</span>
          </div>
        </section>

        <section v-if="activeInstitutionId" class="events-section" aria-labelledby="events-title">
          <div class="section-heading">
            <p class="section-kicker">Programação</p>
            <h2 id="events-title">Meus eventos</h2>
          </div>

          <div v-if="featuredEvent" class="card featured-event-card">
            <strong data-testid="featured-event-name">{{ featuredEvent.name }}</strong>
            <p data-testid="featured-event-subscribers">{{ featuredEventSubscribers.total }} inscritos</p>
            <p class="trend">
              {{ subscriberTrend.lastHour }} na última hora
              ({{ subscriberTrend.previousHour }} na hora anterior)
            </p>
            <button type="button" class="btn btn-secondary" data-testid="download-subscribers" @click="downloadSubscribersCsv">
              Baixar lista de inscritos
            </button>
          </div>

          <div v-if="events.length" class="event-list">
            <div v-for="event in events" :key="event._id" data-testid="event-list-item" class="card event-list-row">
              <span>{{ event.name }}</span>
              <span>{{ new Date(event.startAt).toLocaleDateString('pt-BR') }}</span>
            </div>
          </div>
          <div v-else class="empty-state card">
            <span>Nenhum evento ainda.</span>
          </div>
        </section>

        <section v-if="activeInstitutionId" class="certification-summary-section" aria-labelledby="certification-summary-title">
          <div class="card certification-summary" data-testid="certification-summary">
            <div class="certification-summary-copy">
              <p class="section-kicker">Mobilização de doadores</p>
              <h2 id="certification-summary-title">Certificação</h2>
              <p class="section-description">Consulte o selo da instituição e acompanhe seus links de interesse.</p>
            </div>
            <div class="certification-summary-action">
              <span
                class="pill"
                data-testid="dashboard-certification-status"
                :class="`pill-${certificationStatusTone(certificationStatus)}`"
              >
                {{ certificationStatusLabel(certificationStatus) }}
              </span>
              <RouterLink
                :to="`/${activeInstitutionId}/certificacao`"
                class="btn btn-secondary"
                data-testid="certification-summary-link"
              >
                Ver certificação
              </RouterLink>
            </div>
          </div>
        </section>
      </template>
    </template>
  </main>
</template>

<style scoped>
.dashboard {
  padding-top: var(--hemo-space-9);
}
.dashboard-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--hemo-space-6);
  margin-bottom: var(--hemo-space-8);
}
.page-heading {
  min-width: 0;
}
.page-kicker,
.section-kicker {
  margin: 0 0 var(--hemo-space-1);
  color: var(--hemo-color-primary);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.3;
  text-transform: uppercase;
}
.page-heading h1 {
  display: flex;
  align-items: center;
  gap: var(--hemo-space-2);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.page-heading h1 .institution-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.page-description {
  max-width: 540px;
  margin-top: var(--hemo-space-1);
  color: var(--hemo-color-text-muted);
  font-size: 0.9375rem;
}
.dashboard-header .btn {
  flex-shrink: 0;
}
.dashboard-header .btn span {
  font-size: 1.125rem;
  font-weight: 400;
  line-height: 1;
}
.institution-images-section {
  margin-bottom: var(--hemo-space-8);
}
.institution-images-heading {
  align-items: flex-start;
  margin-bottom: var(--hemo-space-3);
}
.section-description {
  max-width: 540px;
  margin-top: var(--hemo-space-2);
  color: var(--hemo-color-text-muted);
  font-size: 0.875rem;
}
.institution-images-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--hemo-space-4);
}
.requests-section {
  margin-bottom: var(--hemo-space-8);
}
.events-section {
  margin-bottom: var(--hemo-space-8);
}
.featured-event-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--hemo-space-2);
  margin-bottom: var(--hemo-space-3);
}
.featured-event-card p {
  margin: 0;
  color: var(--hemo-color-text-muted);
}
.featured-event-card .trend {
  font-size: 0.875rem;
}
.event-list {
  display: flex;
  flex-direction: column;
  gap: var(--hemo-space-3);
}
.event-list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hemo-space-4);
}
.event-list-row span:last-child {
  color: var(--hemo-color-text-muted);
  font-size: 0.875rem;
}
.certification-summary-section {
  margin-top: var(--hemo-space-8);
}
.certification-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hemo-space-6);
}
.certification-summary-copy {
  min-width: 0;
}
.certification-summary-copy h2 {
  font-size: 1.25rem;
}
.certification-summary-action {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--hemo-space-3);
}
.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--hemo-space-4);
  margin-bottom: var(--hemo-space-3);
}
.section-heading h2 {
  font-size: 1.25rem;
}
.section-count {
  color: var(--hemo-color-text-muted);
  font-size: 0.8125rem;
  font-weight: 600;
}
.request-list {
  display: flex;
  flex-direction: column;
  gap: var(--hemo-space-3);
}
.request-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hemo-space-4);
  min-height: 78px;
  text-decoration: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}
.request-card:hover {
  border-color: var(--hemo-color-primary);
  box-shadow: var(--hemo-shadow-card-hover);
}
.request-card-content,
.request-card-action {
  display: flex;
  align-items: center;
}
.request-card-content {
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--hemo-space-1);
}
.request-label {
  color: var(--hemo-color-text-muted);
  font-size: 0.75rem;
  font-weight: 500;
}
.request-id {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--hemo-color-black-100);
}
.request-next-date {
  color: var(--hemo-color-text-muted);
  font-size: 0.8125rem;
}
.request-card-action {
  flex-shrink: 0;
  gap: var(--hemo-space-3);
}
.request-arrow {
  color: var(--hemo-color-primary);
  font-size: 1.125rem;
  transition: transform 0.15s ease;
}
.request-card:hover .request-arrow {
  transform: translateX(3px);
}
.dashboard-state,
.request-empty-state {
  margin: 0;
}
.empty-state-icon svg {
  width: 20px;
  height: 20px;
}

@media (max-width: 640px) {
  .dashboard {
    padding-top: var(--hemo-space-7);
  }
  .dashboard-header {
    align-items: stretch;
    flex-direction: column;
    margin-bottom: var(--hemo-space-7);
  }
  .dashboard-header .btn {
    width: 100%;
  }
  .institution-images-grid {
    grid-template-columns: 1fr;
  }
  .request-card {
    align-items: flex-start;
    flex-direction: column;
  }
  .request-card-action {
    width: 100%;
    justify-content: space-between;
  }
  .certification-summary {
    align-items: flex-start;
    flex-direction: column;
  }
  .certification-summary-action {
    align-items: stretch;
    flex-direction: column;
    width: 100%;
  }
}
</style>
