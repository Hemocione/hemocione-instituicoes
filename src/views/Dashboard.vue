<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { coletaApi, idApi } from '../api'
import { institutions, activeInstitutionId, setInstitutions, activeInstitution } from '../institution'
import { config } from '../config'
import { statusLabel, statusTone } from '../statusLabels'
import CertificationSection from '../components/CertificationSection.vue'
import InstitutionImageUploadField from '../components/InstitutionImageUploadField.vue'
import InstitutionKindIcon from '../components/InstitutionKindIcon.vue'

type CollectionRequestSummary = { id: string; status: string }

const requests = ref<CollectionRequestSummary[]>([])
const loading = ref(true)
const errorMessage = ref<string | null>(null)

function newRequestUrl(institutionId: string) {
  return `${config.hemocioneColetaUrl}/agendar?institutionId=${encodeURIComponent(institutionId)}`
}

async function loadRequests(institutionId: string) {
  const requestData = await coletaApi.listCollectionRequests(institutionId)
  requests.value = requestData.collectionRequests ?? requestData.items ?? requestData
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
      await loadRequests(activeInstitutionId.value)
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

        <CertificationSection
          v-if="activeInstitutionId"
          :institution-id="activeInstitutionId"
          :institution="activeInstitution() ?? undefined"
        />
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
}
</style>
