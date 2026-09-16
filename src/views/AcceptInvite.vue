<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { idApi, type InviteContext } from '../api'
import { isAuthenticated } from '../auth'
import { config } from '../config'

const route = useRoute()
const token = route.params.token as string

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const invite = ref<InviteContext | null>(null)
const accepted = ref(false)

const TARGET_LABEL: Record<string, string> = {
  institution: 'instituição',
  blood_bank: 'banco de sangue',
}

function returnUrl() {
  return encodeURIComponent(`${window.location.origin}/invites/${token}`)
}

async function load() {
  loading.value = true
  errorMessage.value = null
  try {
    invite.value = await idApi.getInvite(token)
  } catch {
    errorMessage.value = 'Este convite não existe, expirou ou já foi usado.'
  } finally {
    loading.value = false
  }
}

async function accept() {
  await idApi.acceptInvite(token)
  accepted.value = true
}

onMounted(load)
</script>

<template>
  <main class="page accept-invite-page">
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>Carregando convite...</span>
    </div>
    <p v-else-if="errorMessage" data-testid="invite-error" class="error-message">{{ errorMessage }}</p>
    <template v-else-if="invite">
      <div v-if="accepted" class="card">
        <p>Convite aceito! Você agora faz parte desta {{ TARGET_LABEL[invite.targetType] }}.</p>
      </div>
      <div v-else class="card">
        <p>Você foi convidado para uma {{ TARGET_LABEL[invite.targetType] }} como {{ invite.role }}.</p>
        <button v-if="isAuthenticated()" data-testid="invite-accept-button" class="btn btn-primary" @click="accept">
          Aceitar convite
        </button>
        <template v-else>
          <a data-testid="invite-login-link" class="btn btn-primary" :href="`${config.hemocioneIdUrl}?redirect=${returnUrl()}`">
            Fazer login
          </a>
          <a data-testid="invite-signup-link" class="btn btn-secondary" :href="`${config.hemocioneIdUrl}?redirect=${returnUrl()}`">
            Criar conta
          </a>
        </template>
      </div>
    </template>
  </main>
</template>
