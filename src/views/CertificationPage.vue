<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { idApi } from '../api'
import { activeInstitutionId, institutions, setActiveInstitution, setInstitutions } from '../institution'
import CertificationSection from '../components/CertificationSection.vue'

const route = useRoute()
const loading = ref(true)
const accessDenied = ref(false)
const errorMessage = ref<string | null>(null)

const routeInstitutionId = computed(() => {
  const value = route.params.institutionId
  if (typeof value === 'string') return value
  return Array.isArray(value) ? value[0] ?? '' : ''
})

const selectedInstitution = computed(() =>
  institutions.value.find((institution) => institution.id === routeInstitutionId.value) ?? null
)

async function loadInstitution() {
  loading.value = true
  accessDenied.value = false
  errorMessage.value = null

  try {
    if (!institutions.value.length) {
      const data = await idApi.myInstitutions()
      setInstitutions(data)
    }

    if (!selectedInstitution.value) {
      accessDenied.value = true
      return
    }

    if (activeInstitutionId.value !== routeInstitutionId.value) {
      setActiveInstitution(routeInstitutionId.value)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    loading.value = false
  }
}

onMounted(loadInstitution)
</script>

<template>
  <main
    class="page certification-page"
    data-testid="certification-page"
    :data-institution-id="routeInstitutionId"
  >
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>Carregando certificação...</span>
    </div>
    <p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <section v-else-if="accessDenied" class="empty-state card certification-access-error" data-testid="certification-access-error" role="alert">
      <span class="empty-state-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 4 3.5 19h17L12 4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
          <path d="M12 9v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </span>
      <strong class="empty-state-title">Você não tem acesso a esta instituição.</strong>
      <span class="empty-state-description">Confira a instituição selecionada e tente novamente.</span>
    </section>
    <template v-else-if="selectedInstitution">
      <RouterLink to="/" class="back-link">&larr; voltar ao painel</RouterLink>

      <header class="certification-page-header">
        <div>
          <p class="page-kicker">Mobilização de doadores</p>
          <h1>Certificação</h1>
          <p class="page-description">{{ selectedInstitution.name }}</p>
        </div>
      </header>

      <section class="card certification-explainer" data-testid="certification-explainer" aria-labelledby="certification-explainer-title">
        <div class="explainer-heading">
          <p class="section-kicker">Entenda o processo</p>
          <h2 id="certification-explainer-title">Selo Hemocione de instituição Hábil para Coleta Externa</h2>
        </div>
        <div class="explainer-grid">
          <article class="explainer-block">
            <span class="explainer-number" aria-hidden="true">01</span>
            <div>
              <h3>O que é o selo?</h3>
              <p>O selo indica que a instituição já demonstrou capacidade de mobilizar doadores suficientes para justificar uma coleta externa.</p>
            </div>
          </article>
          <article class="explainer-block">
            <span class="explainer-number" aria-hidden="true">02</span>
            <div>
              <h3>Por que importa?</h3>
              <p>Instituições com o selo têm muito mais chance de conseguir uma data priorizada com o banco de sangue no agendamento. O selo já aparece para o banco de sangue nas telas de pedido de coleta do Hemocione Coleta.</p>
            </div>
          </article>
          <article class="explainer-block">
            <span class="explainer-number" aria-hidden="true">03</span>
            <div>
              <h3>Como funciona?</h3>
              <p>Crie um link de interesse com duração de 7 a 14 dias e divulgue internamente, por exemplo, no WhatsApp.</p>
              <p>As pessoas informam se têm interesse em doar e quais dias da semana estão disponíveis. Ao atingir o número mínimo de respostas, a instituição ganha o selo automaticamente.</p>
            </div>
          </article>
        </div>
      </section>

      <CertificationSection
        :institution-id="routeInstitutionId"
        :institution="selectedInstitution"
      />
    </template>
  </main>
</template>

<style scoped>
.certification-page {
  padding-top: var(--hemo-space-9);
}
.certification-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--hemo-space-6);
  margin-bottom: var(--hemo-space-6);
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
.page-description {
  margin-top: var(--hemo-space-2);
  color: var(--hemo-color-text-muted);
  font-size: 0.9375rem;
}
.certification-explainer {
  margin-bottom: var(--hemo-space-6);
  border-top: 3px solid var(--hemo-color-primary);
}
.explainer-heading {
  max-width: 760px;
}
.explainer-heading h2 {
  font-size: 1.35rem;
}
.explainer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--hemo-space-5);
  margin-top: var(--hemo-space-6);
}
.explainer-block {
  display: flex;
  align-items: flex-start;
  gap: var(--hemo-space-3);
}
.explainer-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: var(--hemo-radius-full);
  background: var(--hemo-color-danger-soft);
  color: var(--hemo-color-primary);
  font-size: 0.6875rem;
  font-weight: 700;
}
.explainer-block h3 {
  margin-bottom: var(--hemo-space-2);
  font-size: 0.9375rem;
}
.explainer-block p {
  color: var(--hemo-color-text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}
.explainer-block p + p {
  margin-top: var(--hemo-space-3);
}
.certification-access-error {
  max-width: 560px;
  margin: var(--hemo-space-8) auto 0;
}
.empty-state-icon svg {
  width: 20px;
  height: 20px;
}

@media (max-width: 800px) {
  .explainer-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .certification-page {
    padding-top: var(--hemo-space-7);
  }
}
</style>
