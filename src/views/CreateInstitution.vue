<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { idApi } from '../api'
import { setInstitutions } from '../institution'

const router = useRouter()

const form = reactive({
  name: '',
  legalName: '',
  document: '',
  kind: 'company' as 'company' | 'school' | 'university',
  address: '',
  phone: '',
  city: '',
  state: '',
  website: '', // honeypot — never shown to a real person
})

const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

function validate(): boolean {
  const errors: Record<string, string> = {}

  if (!form.name.trim()) errors.name = 'Nome é obrigatório.'
  const digitsOnlyDocument = form.document.replace(/\D/g, '')
  if (digitsOnlyDocument.length !== 14) errors.document = 'CNPJ deve ter 14 dígitos'
  if (!form.address.trim()) errors.address = 'Endereço é obrigatório.'
  if (!form.phone.trim()) errors.phone = 'Telefone é obrigatório.'
  if (!form.city.trim()) errors.city = 'Cidade é obrigatória.'
  if (form.state.trim().length !== 2) errors.state = 'Estado deve ter 2 caracteres'

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function onSubmit() {
  errorMessage.value = null
  if (!validate()) return

  submitting.value = true
  try {
    const result = await idApi.createInstitution({
      name: form.name.trim(),
      legalName: form.legalName.trim() || undefined,
      document: form.document.replace(/\D/g, ''),
      kind: form.kind,
      address: form.address.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      createdVia: 'self_service_instituicoes',
      website: form.website,
    })

    const updatedList = await idApi.myInstitutions()
    setInstitutions(updatedList)
    if (result.institution?.id) {
      // setInstitutions already picks a sensible active institution when the
      // previous one is gone; explicitly select the one just created so the
      // person lands on it, not on whatever was first in the list.
      const { setActiveInstitution } = await import('../institution')
      setActiveInstitution(result.institution.id)
    }

    router.push('/')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="page create-institution">
    <RouterLink to="/" class="back-link">&larr; voltar</RouterLink>
    <div class="page-heading">
      <p class="page-kicker">Nova instituição</p>
      <h1>Cadastre sua instituição</h1>
      <p class="page-description">Preencha os dados abaixo para começar a usar o portal.</p>
    </div>

    <form class="card" @submit.prevent="onSubmit">
      <label class="field" :class="{ 'has-error': fieldErrors.name }">
        Nome
        <input id="name" v-model="form.name" type="text" />
        <span v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</span>
      </label>

      <label class="field">
        Razão social (opcional)
        <input v-model="form.legalName" type="text" />
      </label>

      <label class="field" :class="{ 'has-error': fieldErrors.document }">
        CNPJ
        <input id="document" v-model="form.document" type="text" placeholder="00.000.000/0000-00" />
        <span v-if="fieldErrors.document" class="field-error">{{ fieldErrors.document }}</span>
      </label>

      <label class="field">
        Tipo
        <select id="kind" v-model="form.kind">
          <option value="company">Empresa</option>
          <option value="school">Escola</option>
          <option value="university">Universidade</option>
        </select>
      </label>

      <label class="field" :class="{ 'has-error': fieldErrors.address }">
        Endereço
        <input id="address" v-model="form.address" type="text" />
        <span v-if="fieldErrors.address" class="field-error">{{ fieldErrors.address }}</span>
      </label>

      <label class="field" :class="{ 'has-error': fieldErrors.phone }">
        Telefone
        <input id="phone" v-model="form.phone" type="text" placeholder="(21) 99999-9999" />
        <span v-if="fieldErrors.phone" class="field-error">{{ fieldErrors.phone }}</span>
      </label>

      <label class="field" :class="{ 'has-error': fieldErrors.city }">
        Cidade
        <input id="city" v-model="form.city" type="text" />
        <span v-if="fieldErrors.city" class="field-error">{{ fieldErrors.city }}</span>
      </label>

      <label class="field" :class="{ 'has-error': fieldErrors.state }">
        Estado (UF)
        <input id="state" v-model="form.state" type="text" maxlength="2" placeholder="RJ" />
        <span v-if="fieldErrors.state" class="field-error">{{ fieldErrors.state }}</span>
      </label>

      <!-- Honeypot: invisível e inalcançável por teclado para uma pessoa real;
           um bot de preenchimento automático de formulário tende a preenchê-lo. -->
      <input
        v-model="form.website"
        type="text"
        name="website"
        autocomplete="off"
        tabindex="-1"
        aria-hidden="true"
        style="position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0;"
      />

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <button type="submit" class="btn btn-primary" :disabled="submitting">
        {{ submitting ? 'Enviando...' : 'Cadastrar instituição' }}
      </button>
    </form>
  </main>
</template>
