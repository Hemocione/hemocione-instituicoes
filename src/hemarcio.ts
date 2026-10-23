import { ref, watch } from 'vue'
import type { Router } from 'vue-router'
import { token } from './auth'
import { activeInstitutionId } from './institution'

export type HemarcioIntent = 'instituicoes.pendencias' | 'instituicoes.pedido'

type HemarcioContext = Record<string, unknown>

type RouteLike = { path: string; params: Record<string, unknown>; meta: Record<string, unknown> }

type ChatInstance = {
  setContext(context: HemarcioContext): void
  setToken(token: string | null): void
  ask(intent: string, context?: HemarcioContext): void
  destroy(): void
}

type SdkGlobal = { createHemocioneChat(options: Record<string, unknown>): ChatInstance }

const REQUEST_ID_PATTERN = /^[a-f0-9]{24}$/i

export const DEFAULT_SDK_URL = 'https://chat.hemocione.com.br/sdk/0.3.0/hemocione-sdk.js'
export const DEFAULT_CHAT_URL = 'https://chat.hemocione.com.br'

export function buildHemarcioContext(
  path: string,
  params: Record<string, unknown>,
  institutionId: string | null
): HemarcioContext {
  const context: HemarcioContext = {
    product: 'instituicoes',
    audience: 'instituicao',
    page: path.split('?')[0],
  }
  if (institutionId) context.institutionId = institutionId
  const requestId = params.id
  if (
    /^\/pedidos\/[^/]+$/.test(context.page as string) &&
    typeof requestId === 'string' &&
    REQUEST_ID_PATTERN.test(requestId)
  ) {
    context.requestId = requestId
  }
  return context
}

export function isHemarcioVisible(route: { meta: Record<string, unknown> }, authenticated: boolean): boolean {
  return authenticated && route.meta.public !== true
}

export function createSdkLoader(url: string): () => Promise<SdkGlobal> {
  let pending: Promise<SdkGlobal> | null = null
  return () => {
    pending ??= new Promise<SdkGlobal>((resolve, reject) => {
      const existing = (window as unknown as { HemocioneSDK?: SdkGlobal }).HemocioneSDK
      if (existing) return resolve(existing)
      const script = document.createElement('script')
      script.src = url
      script.async = true
      script.onload = () => {
        const sdk = (window as unknown as { HemocioneSDK?: SdkGlobal }).HemocioneSDK
        if (sdk?.createHemocioneChat) resolve(sdk)
        else reject(new Error('HemocioneSDK ausente'))
      }
      script.onerror = () => reject(new Error('Falha ao carregar o SDK do Hemárcio'))
      document.head.appendChild(script)
    })
    return pending
  }
}

export function createHemarcioController(deps: {
  getRoute: () => RouteLike
  getToken: () => string | null
  getInstitutionId: () => string | null
  loadSdk: () => Promise<SdkGlobal>
  chatUrl: string
  onAvailabilityChange?: (available: boolean) => void
}) {
  let instance: ChatInstance | null = null
  let available = false
  let syncing: Promise<void> = Promise.resolve()

  function setAvailable(value: boolean) {
    if (available === value) return
    available = value
    deps.onAvailabilityChange?.(value)
  }

  function currentContext(): HemarcioContext {
    const route = deps.getRoute()
    return buildHemarcioContext(route.path, route.params, deps.getInstitutionId())
  }

  async function run() {
    const route = deps.getRoute()
    const authToken = deps.getToken()
    if (!isHemarcioVisible(route, !!authToken)) {
      instance?.destroy()
      instance = null
      setAvailable(false)
      return
    }
    if (instance) {
      instance.setToken(authToken)
      instance.setContext(currentContext())
      setAvailable(true)
      return
    }
    try {
      const sdk = await deps.loadSdk()
      // estado pode ter mudado durante o carregamento
      const latestRoute = deps.getRoute()
      const latestToken = deps.getToken()
      if (!isHemarcioVisible(latestRoute, !!latestToken)) return
      instance = sdk.createHemocioneChat({
        mode: 'bubble',
        chatUrl: deps.chatUrl,
        context: currentContext(),
        token: latestToken,
      })
      setAvailable(true)
    } catch {
      setAvailable(false)
    }
  }

  function sync(): Promise<void> {
    syncing = syncing.then(run, run)
    return syncing
  }

  async function ask(intent: HemarcioIntent): Promise<void> {
    if (!instance) return
    try {
      instance.ask(intent, currentContext())
    } catch {
      // intent desconhecido pelo SDK carregado: sem efeito
    }
  }

  return { sync, ask, isAvailable: () => available }
}

export const hemarcioAvailable = ref(false)

const controller = createHemarcioController({
  getRoute: () => ({ path: '/', params: {}, meta: {} }),
  getToken: () => null,
  getInstitutionId: () => null,
  loadSdk: () => Promise.reject(new Error('not started')),
  chatUrl: DEFAULT_CHAT_URL,
})

let active: ReturnType<typeof createHemarcioController> = controller

export function askHemarcio(intent: HemarcioIntent): Promise<void> {
  return active.ask(intent)
}

export function startHemarcio(router: Router) {
  active = createHemarcioController({
    getRoute: () => router.currentRoute.value,
    getToken: () => token.value,
    getInstitutionId: () => activeInstitutionId.value,
    loadSdk: createSdkLoader(import.meta.env.VITE_HEMARCIO_SDK_URL || DEFAULT_SDK_URL),
    chatUrl: import.meta.env.VITE_HEMARCIO_CHAT_URL || DEFAULT_CHAT_URL,
    onAvailabilityChange: (value) => {
      hemarcioAvailable.value = value
    },
  })
  const sync = () => void active.sync()
  router.afterEach(sync)
  watch([token, activeInstitutionId], sync)
  sync()
}
