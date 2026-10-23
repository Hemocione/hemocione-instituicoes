import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import {
  buildHemarcioContext,
  createHemarcioController,
  createSdkLoader,
  isHemarcioVisible,
  startHemarcio,
} from './hemarcio'

const REQUEST_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6'

// builds a route the way vue-router would: the matched template is the path with param values as :key
function mk(path: string, params: Record<string, string> = {}, meta: Record<string, unknown> = {}, template?: string) {
  const derived = path
    .split('/')
    .map((segment) => {
      const key = Object.keys(params).find((k) => params[k] === segment)
      return key ? `:${key}` : segment
    })
    .join('/')
  return { path, params, meta, matched: [{ path: template ?? derived }] }
}

function ctx(
  path: string,
  params: Record<string, string>,
  active: string | null,
  extra: { known?: string[]; matchedPath?: string; includeRequestId?: boolean } = {}
) {
  return buildHemarcioContext(
    { path, params, meta: {}, matched: mk(path, params, {}, extra.matchedPath).matched },
    { activeInstitutionId: active, knownInstitutionIds: extra.known, includeRequestId: extra.includeRequestId }
  )
}

describe('buildHemarcioContext', () => {
  it('monta o contexto do dashboard sem query', () => {
    expect(ctx('/', {}, 'inst-1')).toEqual({
      product: 'instituicoes',
      audience: 'instituicao',
      page: '/',
      institutionId: 'inst-1',
    })
  })

  it('inclui requestId em /pedidos/:id quando o id tem 24 hex', () => {
    expect(ctx(`/pedidos/${REQUEST_ID}`, { id: REQUEST_ID }, 'inst-1')).toMatchObject({
      page: `/pedidos/${REQUEST_ID}`,
      requestId: REQUEST_ID,
    })
  })

  it('omite requestId quando o id e invalido, a rota e outra ou includeRequestId e false', () => {
    expect(ctx('/pedidos/abc', { id: 'abc' }, 'inst-1')).not.toHaveProperty('requestId')
    expect(ctx('/', { id: REQUEST_ID }, 'inst-1')).not.toHaveProperty('requestId')
    expect(
      ctx(`/pedidos/${REQUEST_ID}`, { id: REQUEST_ID }, 'inst-1', { includeRequestId: false })
    ).not.toHaveProperty('requestId')
  })

  it('omite institutionId quando nao ha instituicao ativa', () => {
    expect(ctx('/', {}, null)).not.toHaveProperty('institutionId')
  })

  it('usa o institutionId da rota quando o usuario pertence a ele', () => {
    expect(ctx('/inst-b/membros', { institutionId: 'inst-b' }, 'inst-a', { known: ['inst-a', 'inst-b'] })).toMatchObject({
      institutionId: 'inst-b',
    })
  })

  it('omite institutionId quando o id da rota nao esta na lista carregada', () => {
    expect(ctx('/inst-x/membros', { institutionId: 'inst-x' }, 'inst-a', { known: ['inst-a'] })).not.toHaveProperty(
      'institutionId'
    )
  })

  it('envia o padrao da rota quando ha params alem de institutionId e id', () => {
    expect(
      ctx('/invites/secret-token', { token: 'secret-token' }, 'inst-a', { matchedPath: '/invites/:token' }).page
    ).toBe('/invites/:token')
    expect(ctx('/interesse/camp-1', { campaignId: 'camp-1' }, 'inst-a').page).toBe('/interesse/:campaignId')
  })
})

describe('isHemarcioVisible', () => {
  it('só mostra logado e fora das rotas públicas', () => {
    expect(isHemarcioVisible({ meta: {} }, true)).toBe(true)
    expect(isHemarcioVisible({ meta: {} }, false)).toBe(false)
    expect(isHemarcioVisible({ meta: { public: true } }, true)).toBe(false)
  })
})

function setup(overrides: { loadSdk?: () => Promise<unknown> } = {}) {
  const instance = { setContext: vi.fn(), setToken: vi.fn(), ask: vi.fn(), destroy: vi.fn() }
  const create = vi.fn(() => instance)
  const state = {
    route: mk('/') as ReturnType<typeof mk>,
    token: 'tok-1' as string | null,
    institutionId: 'inst-1' as string | null,
  }
  const controller = createHemarcioController({
    getRoute: () => state.route,
    getToken: () => state.token,
    getInstitutionId: () => state.institutionId,
    loadSdk: (overrides.loadSdk ?? (async () => ({ createHemocioneChat: create }))) as never,
    chatUrl: 'https://chat.test',
  })
  return { controller, instance, create, state }
}

describe('createHemarcioController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cria a bolha logado com contexto e token', async () => {
    const { controller, create } = setup()
    await controller.sync()

    expect(create).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'bubble',
        chatUrl: 'https://chat.test',
        token: 'tok-1',
        context: expect.objectContaining({ product: 'instituicoes', institutionId: 'inst-1', page: '/' }),
      })
    )
    expect(controller.isAvailable()).toBe(true)
  })

  it('atualiza o contexto na troca de rota e de instituição', async () => {
    const { controller, create, instance, state } = setup()
    await controller.sync()
    state.route = mk(`/pedidos/${REQUEST_ID}`, { id: REQUEST_ID }, {})
    state.institutionId = 'inst-2'
    await controller.sync(true)

    expect(create).toHaveBeenCalledOnce()
    expect(instance.setContext).toHaveBeenLastCalledWith(
      expect.objectContaining({ institutionId: 'inst-2', requestId: REQUEST_ID })
    )
  })

  it('nao envia requestId velho com a instituicao nova enquanto a navegacao esta pendente', async () => {
    const { controller, instance, state } = setup()
    state.route = mk(`/pedidos/${REQUEST_ID}`, { id: REQUEST_ID }, {})
    await controller.sync(true)

    state.institutionId = 'inst-2' // route still the old one: navigation pending
    await controller.sync()
    const pendingCtx = instance.setContext.mock.calls.at(-1)![0]
    expect(pendingCtx).toMatchObject({ institutionId: 'inst-2' })
    expect(pendingCtx).not.toHaveProperty('requestId')

    state.route = mk('/', {}, {}) // navigation settled
    await controller.sync(true)
    expect(instance.setContext).toHaveBeenLastCalledWith(
      expect.objectContaining({ institutionId: 'inst-2', page: '/' })
    )
  })

  it('destrói a bolha em rota pública e ao deslogar', async () => {
    const { controller, instance, state } = setup()
    await controller.sync()
    state.route = mk('/interesse/x', {}, { public: true })
    await controller.sync()
    expect(instance.destroy).toHaveBeenCalledOnce()

    state.route = mk('/', {}, {})
    await controller.sync()
    state.token = null
    await controller.sync()
    expect(instance.destroy).toHaveBeenCalledTimes(2)
  })

  it('não carrega o SDK deslogado', async () => {
    const loadSdk = vi.fn()
    const { controller, state } = setup({ loadSdk })
    state.token = null
    await controller.sync()
    expect(loadSdk).not.toHaveBeenCalled()
  })

  it('fica indisponível quando o SDK falha', async () => {
    const { controller } = setup({ loadSdk: async () => Promise.reject(new Error('x')) })
    await controller.sync()
    expect(controller.isAvailable()).toBe(false)
    await expect(controller.ask('instituicoes.pendencias')).resolves.toBeUndefined()
  })

  it('ask repassa intent e contexto atual', async () => {
    const { controller, instance } = setup()
    await controller.sync()
    await controller.ask('instituicoes.pendencias')
    expect(instance.ask).toHaveBeenCalledWith(
      'instituicoes.pendencias',
      expect.objectContaining({ product: 'instituicoes', page: '/' })
    )
  })

  it('ask engole intent desconhecido pelo SDK', async () => {
    const { controller, instance } = setup()
    instance.ask.mockImplementation(() => {
      throw new TypeError('intent')
    })
    await controller.sync()
    await expect(controller.ask('instituicoes.pedido')).resolves.toBeUndefined()
  })
})

describe('createSdkLoader', () => {
  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>).HemocioneSDK
    document.head.querySelectorAll('script').forEach((s) => s.remove())
  })

  it('reusa o global ja carregado sem injetar script', async () => {
    const sdk = { createHemocioneChat: vi.fn() }
    ;(window as unknown as Record<string, unknown>).HemocioneSDK = sdk
    await expect(createSdkLoader('https://sdk.test/a.js')()).resolves.toBe(sdk)
    expect(document.head.querySelector('script')).toBeNull()
  })

  it('rejeita no onerror e permite nova tentativa', async () => {
    const load = createSdkLoader('https://sdk.test/a.js')
    const first = load()
    document.head.querySelector('script')!.onerror!(new Event('error'))
    await expect(first).rejects.toThrow()

    const second = load()
    const script = document.head.querySelector('script')!
    expect(script).not.toBeNull()
    const sdk = { createHemocioneChat: vi.fn() }
    ;(window as unknown as Record<string, unknown>).HemocioneSDK = sdk
    script.onload!(new Event('load'))
    await expect(second).resolves.toBe(sdk)
  })

  it('esconde os botoes quando o SDK falha', async () => {
    const { controller } = setup({ loadSdk: createSdkLoader('https://sdk.test/b.js') })
    const pending = controller.sync()
    await vi.waitFor(() => expect(document.head.querySelector('script')).not.toBeNull())
    document.head.querySelector('script')!.onerror!(new Event('error'))
    await pending
    expect(controller.isAvailable()).toBe(false)
  })
})

describe('startHemarcio', () => {
  const instance = { setContext: vi.fn(), setToken: vi.fn(), ask: vi.fn(), destroy: vi.fn() }
  const create = vi.fn(() => instance)
  let afterEachCb: () => void
  let currentRoute: ReturnType<typeof ref<RouteShape>>
  type RouteShape = ReturnType<typeof mk>

  function fakeRouter() {
    afterEachCb = () => {}
    currentRoute = ref<RouteShape>(mk('/', {}, {}))
    return {
      currentRoute,
      afterEach: (cb: () => void) => {
        afterEachCb = cb
        return () => {}
      },
      isReady: async () => {},
    } as never
  }
  const flush = async () => {
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    ;(window as unknown as Record<string, unknown>).HemocioneSDK = { createHemocioneChat: create }
    const auth = await import('./auth')
    const inst = await import('./institution')
    auth.token.value = 'tok'
    inst.activeInstitutionId.value = 'inst-1'
    await flush()
    vi.clearAllMocks()
  })

  it('cria a bolha, segue navegacao, instituicao, logout e rota publica', async () => {
    const { token } = await import('./auth')
    const { activeInstitutionId } = await import('./institution')
    await startHemarcio(fakeRouter())
    expect(create).toHaveBeenCalledOnce()

    currentRoute.value = mk(`/pedidos/${REQUEST_ID}`, { id: REQUEST_ID }, {})
    afterEachCb()
    await flush()
    expect(instance.setContext).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: `/pedidos/${REQUEST_ID}`, requestId: REQUEST_ID })
    )

    activeInstitutionId.value = 'inst-2'
    await flush()
    expect(instance.setContext).toHaveBeenLastCalledWith(expect.objectContaining({ institutionId: 'inst-2' }))

    token.value = null
    await flush()
    expect(instance.destroy).toHaveBeenCalledOnce()
  })

  it('nao cria a bolha em rota publica', async () => {
    const router = fakeRouter()
    currentRoute.value = mk('/interesse/x', {}, { public: true })
    await startHemarcio(router)
    expect(create).not.toHaveBeenCalled()
  })
})

describe('page masking', () => {
  it('nunca usa o path cru: /pedidos/:id com id curto fica no template', () => {
    const route = mk('/pedidos/short-secret', { id: 'short-secret' })
    const { page } = buildHemarcioContext(route, { activeInstitutionId: 'inst-1' })
    expect(page).toBe('/pedidos/:id')
    expect(JSON.stringify(buildHemarcioContext(route, { activeInstitutionId: 'inst-1' }))).not.toContain('short-secret')
  })

  it('valor com %2F nao vaza', () => {
    const route = mk('/invites/a%2Fb', { token: 'a/b' }, {}, '/invites/:token')
    expect(buildHemarcioContext(route, { activeInstitutionId: null }).page).toBe('/invites/:token')
  })

  it('substitui so institutionId conhecido e id de 24 hex', () => {
    const known = ['inst-b']
    const pedido = mk(`/pedidos/${REQUEST_ID}`, { id: REQUEST_ID })
    expect(buildHemarcioContext(pedido, { activeInstitutionId: 'inst-b', knownInstitutionIds: known }).page).toBe(
      `/pedidos/${REQUEST_ID}`
    )
    const membros = mk('/inst-b/membros', { institutionId: 'inst-b' })
    expect(buildHemarcioContext(membros, { activeInstitutionId: 'x', knownInstitutionIds: known }).page).toBe(
      '/inst-b/membros'
    )
    const unknown = mk('/inst-x/membros', { institutionId: 'inst-x' })
    expect(buildHemarcioContext(unknown, { activeInstitutionId: 'x', knownInstitutionIds: known }).page).toBe(
      '/:institutionId/membros'
    )
  })

  it('sem rota casada, nunca cai no path cru', () => {
    const page = buildHemarcioContext({ path: '/secret/zzz', params: {}, meta: {} }, { activeInstitutionId: null }).page
    expect(page).not.toContain('secret')
  })
})

describe('context race', () => {
  it('SDK pendente + navegacao + troca de instituicao: nunca envia requestId antigo com instituicao nova', async () => {
    let resolveSdk!: (sdk: unknown) => void
    const loading = new Promise((resolve) => {
      resolveSdk = resolve
    })
    const { controller, instance, create, state } = setup({ loadSdk: () => loading })

    const first = controller.sync(true) // SDK load pending
    state.route = mk(`/pedidos/${REQUEST_ID}`, { id: REQUEST_ID })
    void controller.sync(true) // navigation settled under inst-1
    state.institutionId = 'inst-2' // switch; redirect still pending
    void controller.sync()
    resolveSdk({ createHemocioneChat: create })
    await first

    const sent = [
      ...create.mock.calls.map((c) => (c as unknown[])[0] as { context: Record<string, unknown> }).map((o) => o.context),
      ...instance.setContext.mock.calls.map((c) => c[0] as Record<string, unknown>),
    ]
    expect(create).toHaveBeenCalledOnce()
    expect(sent.length).toBeGreaterThan(0)
    for (const context of sent) {
      expect(context.institutionId === 'inst-2' && context.requestId !== undefined).toBe(false)
    }

    state.route = mk('/') // redirect settled
    await controller.sync(true)
    expect(instance.setContext).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: '/', institutionId: 'inst-2' })
    )
  })

  it('syncs enfileirados sao coalescidos: so o ultimo roda', async () => {
    const { controller, create, state } = setup()
    const a = controller.sync(true)
    state.institutionId = 'inst-2'
    const b = controller.sync()
    await Promise.all([a, b])
    expect(create).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ context: expect.objectContaining({ institutionId: 'inst-2' }) })
    )
  })

  it('navegacao duplicada (failure) nao conta como assentada e nao restaura requestId', async () => {
    const instance = { setContext: vi.fn(), setToken: vi.fn(), ask: vi.fn(), destroy: vi.fn() }
    ;(window as unknown as Record<string, unknown>).HemocioneSDK = { createHemocioneChat: () => instance }
    const { token } = await import('./auth')
    const { activeInstitutionId } = await import('./institution')
    token.value = 'tok'
    activeInstitutionId.value = 'inst-1'
    let cb!: (to: unknown, from: unknown, failure?: unknown) => void
    const currentRoute = ref(mk(`/pedidos/${REQUEST_ID}`, { id: REQUEST_ID }))
    await startHemarcio({
      currentRoute,
      afterEach: (fn: never) => {
        cb = fn
        return () => {}
      },
      isReady: async () => {},
    } as never)

    activeInstitutionId.value = 'inst-2'
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    cb({}, {}, { type: 16 }) // duplicated navigation
    await new Promise((r) => setTimeout(r, 0))

    const last = instance.setContext.mock.calls.at(-1)![0]
    expect(last).toMatchObject({ institutionId: 'inst-2' })
    expect(last).not.toHaveProperty('requestId')
  })
})
