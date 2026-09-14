<script setup lang="ts">
import { computed, ref } from 'vue'
import { token } from '../auth'

type ImageKind = 'logo' | 'banner'

const props = withDefaults(
  defineProps<{
    institutionId: string
    kind: ImageKind
    modelValue?: string
  }>(),
  { modelValue: '' }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const imageLabel = computed(() => (props.kind === 'logo' ? 'logo' : 'banner'))
const maxFileSize = computed(() => (props.kind === 'logo' ? 2 : 4) * 1024 * 1024)
const maxFileSizeLabel = computed(() => `${props.kind === 'logo' ? 2 : 4} MB`)

function openFilePicker() {
  fileInput.value?.click()
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : `Não foi possível enviar o ${imageLabel.value}.`
}

function responseErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === 'object') {
    const payload = body as { statusMessage?: unknown; message?: unknown }
    const message = payload.statusMessage ?? payload.message

    if (typeof message === 'string' && message.trim()) return message
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join(', ')
    }
  }

  return fallback
}

async function readResponseBody(response: Response) {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      })
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Não foi possível ler as dimensões da imagem.'))
    }
    image.src = objectUrl
  })
}

async function validateFile(file: File) {
  if (file.size > maxFileSize.value) {
    throw new Error(`O ${imageLabel.value} deve ter no máximo ${maxFileSizeLabel.value}.`)
  }

  if (props.kind === 'logo') {
    const dimensions = await imageDimensions(file)
    if (dimensions.width !== dimensions.height) {
      throw new Error('A logo deve ser quadrada.')
    }
  }
}

async function uploadImage(file: File) {
  if (!token.value) {
    throw new Error('Não foi possível enviar a imagem: usuário não autenticado.')
  }

  const coletaUrl = String(import.meta.env.VITE_HEMOCIONE_COLETA_URL).replace(/\/$/, '')
  const idApiUrl = String(import.meta.env.VITE_HEMOCIONE_ID_API_URL).replace(/\/$/, '')
  const formData = new FormData()
  formData.append('image', file)

  const uploadResponse = await fetch(
    `${coletaUrl}/api/v1/me/institutions/${props.kind}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: formData,
    }
  )
  const uploadBody = await readResponseBody(uploadResponse)

  if (!uploadResponse.ok) {
    throw new Error(
      responseErrorMessage(uploadBody, `Não foi possível enviar o ${imageLabel.value}.`)
    )
  }

  const url =
    uploadBody && typeof uploadBody === 'object' && 'url' in uploadBody
      ? (uploadBody as { url?: unknown }).url
      : undefined
  if (typeof url !== 'string' || !url) {
    throw new Error('O upload não retornou uma URL válida.')
  }

  const patchResponse = await fetch(
    `${idApiUrl}/institutions/${encodeURIComponent(props.institutionId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [props.kind]: url }),
    }
  )
  const patchBody = await readResponseBody(patchResponse)

  if (!patchResponse.ok) {
    throw new Error(
      responseErrorMessage(patchBody, `Não foi possível salvar o ${imageLabel.value} da instituição.`)
    )
  }

  emit('update:modelValue', url)
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  errorMessage.value = null
  loading.value = true

  try {
    await validateFile(file)
    await uploadImage(file)
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    loading.value = false
    input.value = ''
  }
}
</script>

<template>
  <section class="institution-image-upload card" :aria-busy="loading">
    <div class="image-preview">
      <img
        v-if="props.modelValue"
        :src="props.modelValue"
        :alt="`Imagem atual da instituição: ${imageLabel}`"
      />
      <span v-else data-testid="image-placeholder">Nenhum {{ imageLabel }} adicionado.</span>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg"
      data-testid="image-input"
      :disabled="loading"
      @change="handleFileChange"
    />
    <button
      type="button"
      class="btn btn-primary"
      data-testid="image-button"
      :disabled="loading"
      @click="openFilePicker"
    >
      {{ loading ? `Enviando ${imageLabel}...` : `${props.modelValue ? 'Trocar' : 'Adicionar'} ${imageLabel}` }}
    </button>

    <p v-if="loading" data-testid="loading-message" class="loading-message">
      Enviando {{ imageLabel }}...
    </p>
    <p v-if="errorMessage" data-testid="error-message" class="error-message" role="alert">{{ errorMessage }}</p>
  </section>
</template>

<style scoped>
.institution-image-upload {
  display: grid;
  gap: var(--hemo-space-3);
}

.image-preview {
  display: grid;
  min-height: 120px;
  place-items: center;
  overflow: hidden;
  border: 1px dashed var(--hemo-color-black-15);
  border-radius: var(--hemo-radius-md, 8px);
  color: var(--hemo-color-text-muted);
}

.image-preview img {
  display: block;
  max-width: 100%;
  max-height: 220px;
  object-fit: contain;
}

.institution-image-upload input[type='file'] {
  width: 100%;
}

.institution-image-upload .btn {
  justify-self: start;
}

.loading-message,
.error-message {
  margin: 0;
}
</style>
