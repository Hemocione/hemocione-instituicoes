import { ref, watch } from 'vue'
import type { Router } from 'vue-router'
import { token } from './auth'
import { activeInstitutionId, institutions } from './institution'

export type HemarcioIntent = 'instituicoes.pendencias' | 'instituicoes.pedido'

type HemarcioContext = Record<string, unknown>

type RouteLike = {
  path: string
  params: Record<string, unknown>
  meta: Record<string, unknown>
  matched?: { path: string }[]
}

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

export function isRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value)
}

function pagePattern(route: RouteLike): string {
  const path = route.path.split('?')[0]
  const keys = Object.keys(route.params).filter((key) => key !== 'institutionId' && key !== 'id')
  if (!keys.length) return path
  // a route with other params (tokens, campaign ids) reports its pattern, never the raw values
  const pattern = route.matched?.[route.matched.length - 1]?.path
  if (pattern) return pattern
  return path
    .split('/')
    .map((segment) => {
      const key = keys.find((k) => String(route.params[k]) === segment)
      return key ? `:${key}` : segment
    })
    .join('/')
}

export function buildHemarcioContext(
  route: RouteLike,
  options: { activeInstitutionId: string | null; knownInstitutionIds?: string[]; includeRequestId?: boolean }
): HemarcioContext {
  const page = pagePattern(route)
  const context: HemarcioContext = { product: 'instituicoes', audience: 'instituicao', page }

  // a route that names an institution wins over the active one, but only if the user belongs to it
  const routeInstitutionId = route.params.institutionId
  const institutionId =
    typeof routeInstitutionId === 'string'
      ? (options.knownInstitutionIds ?? []).includes(routeInstitutionId)
        ? routeInstitutionId
        : null
      : options.activeInstitutionId
  if (institutionId) context.institutionId = institutionId

  const requestId = route.params.id
  if (options.includeRequestId !== false && /^\/pedidos\/[^/]+$/.test(page) && isRequestId(requestId)) {
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
      script.onerror = () => {
        script.remove()
        pending = null // allow a later sync to retry
        reject(new Error('Falha ao carregar o SDK do Hemárcio'))
      }
      document.head.appendChild(script)
    })
    return pending
  }
}

export function createHemarcioController(deps: {
  getRoute: () => RouteLike
  getToken: () => string | null
  getInstitutionId: () => string | null
  getKnownInstitutionIds?: () => string[]
  loadSdk: () => Promise<SdkGlobal>
  chatUrl: string
  onAvailabilityChange?: (available: boolean) => void
}) {
  let instance: ChatInstance | null = null
  let available = false
  let syncing: Promise<void> = Promise.resolve()
  // institution the current route was settled under (set by navigation, not by an institution switch)
  let settledInstitutionId: string | null | undefined

  function setAvailable(value: boolean) {
    if (available === value) return
    available = value
    deps.onAvailabilityChange?.(value)
  }

  function currentContext(): HemarcioContext {
    const institutionId = deps.getInstitutionId()
    return buildHemarcioContext(deps.getRoute(), {
      activeInstitutionId: institutionId,
      knownInstitutionIds: deps.getKnownInstitutionIds?.() ?? [],
      // while an institution switch is navigating, the old route's request id is stale
      includeRequestId: settledInstitutionId === undefined || settledInstitutionId === institutionId,
    })
  }

  async function run(settled: boolean) {
    if (settled || settledInstitutionId === undefined) settledInstitutionId = deps.getInstitutionId()
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

  // settled = true when called after a finished navigation
  function sync(settled = false): Promise<void> {
    const task = () => run(settled)
    syncing = syncing.then(task, task)
    return syncing
  }

  async function ask(intent: HemarcioIntent): Promise<void> {
    if (!instance) return
    try {
      instance.ask(intent, currentContext())
    } catch (error) {
      console.warn('[hemarcio] ask falhou', error instanceof Error ? error.message : error)
    }
  }

  return { sync, ask, isAvailable: () => available }
}

export const hemarcioAvailable = ref(false)

type Controller = ReturnType<typeof createHemarcioController>

let active: Controller | null = null
let stopWatch: (() => void) | null = null

export function askHemarcio(intent: HemarcioIntent): Promise<void> {
  return active ? active.ask(intent) : Promise.resolve()
}

type RouterLike = Pick<Router, 'afterEach' | 'isReady'> & { currentRoute: Router['currentRoute'] }

export async function startHemarcio(router: RouterLike) {
  stopWatch?.()
  active = createHemarcioController({
    getRoute: () => router.currentRoute.value,
    getToken: () => token.value,
    getInstitutionId: () => activeInstitutionId.value,
    getKnownInstitutionIds: () => institutions.value.map((institution) => institution.id),
    loadSdk: createSdkLoader(import.meta.env.VITE_HEMARCIO_SDK_URL || DEFAULT_SDK_URL),
    chatUrl: import.meta.env.VITE_HEMARCIO_CHAT_URL || DEFAULT_CHAT_URL,
    onAvailabilityChange: (value) => {
      hemarcioAvailable.value = value
    },
  })
  router.afterEach(() => void active?.sync(true))
  stopWatch = watch([token, activeInstitutionId, institutions], () => void active?.sync())
  // the first sync must see the resolved initial route, not START_LOCATION
  await router.isReady()
  await active.sync(true)
}
