<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { idApi, type Member, type PendingInvite } from '../api'
import { institutions, setInstitutions } from '../institution'

const route = useRoute()
const institutionId = computed(() => {
  const value = route.params.institutionId
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] ?? '' : ''
})

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const members = ref<Member[]>([])
const invites = ref<PendingInvite[]>([])
const inviteEmail = ref('')
const inviteRole = ref<'admin' | 'staff'>('staff')
const inviteFeedback = ref<string | null>(null)
const confirmingRemovalOf = ref<string | null>(null)

async function loadData() {
  loading.value = true
  errorMessage.value = null
  try {
    if (!institutions.value.length) {
      setInstitutions(await idApi.myInstitutions())
    }
    const [membersResponse, invitesResponse] = await Promise.all([
      idApi.getMembers(institutionId.value),
      idApi.listInvites(institutionId.value),
    ])
    members.value = membersResponse.members
    invites.value = invitesResponse.invites
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    loading.value = false
  }
}

async function submitInvite() {
  inviteFeedback.value = null
  const response = await idApi.inviteMember(institutionId.value, inviteEmail.value, inviteRole.value)
  inviteFeedback.value = response.message
  inviteEmail.value = ''
  await loadData()
}

async function changeRole(userId: string, role: string) {
  await idApi.updateMemberRole(institutionId.value, userId, role as 'admin' | 'staff')
  await loadData()
}

function askRemoveConfirmation(userId: string) {
  confirmingRemovalOf.value = userId
}

async function confirmRemove(userId: string) {
  await idApi.removeMember(institutionId.value, userId)
  confirmingRemovalOf.value = null
  await loadData()
}

async function revoke(inviteId: string) {
  await idApi.revokeInvite(institutionId.value, inviteId)
  await loadData()
}

onMounted(loadData)
</script>

<template>
  <main class="page members-page">
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>Carregando membros...</span>
    </div>
    <p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <template v-else>
      <div class="page-heading">
        <p class="page-kicker">Gestão</p>
        <h1>Membros</h1>
      </div>

      <form data-testid="invite-form" class="card invite-form" @submit.prevent="submitInvite">
        <input
          data-testid="invite-email-input"
          v-model="inviteEmail"
          type="email"
          required
          placeholder="email@exemplo.com"
        />
        <select data-testid="invite-role-select" v-model="inviteRole">
          <option value="staff">Membro</option>
          <option value="admin">Administrador</option>
        </select>
        <button type="submit" class="btn btn-primary">Convidar</button>
      </form>
      <p v-if="inviteFeedback" data-testid="invite-feedback">{{ inviteFeedback }}</p>

      <section class="members-section">
        <h2>Membros atuais</h2>
        <div v-if="!members.length" class="empty-state card">
          <span class="empty-state-title">Nenhum membro ainda.</span>
        </div>
        <div v-for="member in members" :key="member.userId" class="card member-row">
          <span>{{ member.user.givenName }} {{ member.user.surName }}</span>
          <span>{{ member.user.email }}</span>
          <span>{{ member.role }}</span>
          <select
            :data-testid="`role-select-${member.userId}`"
            :value="member.role"
            @change="changeRole(member.userId, ($event.target as HTMLSelectElement).value)"
          >
            <option value="staff">Membro</option>
            <option value="admin">Administrador</option>
          </select>
          <button
            v-if="confirmingRemovalOf !== member.userId"
            :data-testid="`remove-member-${member.userId}`"
            class="btn btn-secondary"
            @click="askRemoveConfirmation(member.userId)"
          >
            Remover
          </button>
          <button
            v-else
            :data-testid="`confirm-remove-${member.userId}`"
            class="btn btn-danger"
            @click="confirmRemove(member.userId)"
          >
            Confirmar remoção
          </button>
        </div>
      </section>

      <section class="invites-section">
        <h2>Convites pendentes</h2>
        <div v-if="!invites.length" class="empty-state card">
          <span class="empty-state-title">Nenhum convite pendente.</span>
        </div>
        <div v-for="invite in invites" :key="invite.id" class="card invite-row">
          <span>{{ invite.invitedEmail }}</span>
          <span>{{ invite.role }}</span>
          <button :data-testid="`revoke-invite-${invite.id}`" class="btn btn-secondary" @click="revoke(invite.id)">
            Revogar
          </button>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.invite-form {
  display: flex;
  gap: var(--hemo-space-3);
  align-items: center;
  margin-bottom: var(--hemo-space-6);
}
.member-row,
.invite-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hemo-space-3);
  margin-bottom: var(--hemo-space-2);
}
</style>
