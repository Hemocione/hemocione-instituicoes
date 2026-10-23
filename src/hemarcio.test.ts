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

describe('buildHemarcioContext', () => {
  it('monta o contexto do dashboard sem query', () => {
    expect(buildHemarcioContext('/', {}, 'inst-1')).toEqual({
      product: 'instituicoes',
      audience: 'instituicao',
      page: '/',
      institutionId: 'inst-1',
    })
  })

  it('inclui requestId em /pedidos/:id quando o id tem 24 hex', () => {
    expect(buildHemarcioContext(`/pedidos/${REQUEST_ID}`, { id: REQUEST_ID }, 'inst-1')).toMatchObject({
      page: `/pedidos/${REQUEST_ID}`,
      requestId: REQUEST_ID,
    })
  })

  it('omite requestId quando o id é inválido ou a rota é outra', () => {
    expect(buildHemarcioContext('/pedidos/abc', { id: 'abc' }, 'inst-1')).not.toHaveProperty('requestId')
    expect(buildHemarcioContext('/', { id: REQUEST_ID }, 'inst-1')).not.toHaveProperty('requestId')
  })

  it('omite institutionId quando não há instituição ativa', () => {
    expect(buildHemarcioContext('/', {}, null)).not.toHaveProperty('institutionId')
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
    route: { path: '/', params: {} as Record<string, string>, meta: {} as Record<string, unknown> },
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
    state.route = { path: `/pedidos/${REQUEST_ID}`, params: { id: REQUEST_ID }, meta: {} }
    state.institutionId = 'inst-2'
    await controller.sync()

    expect(create).toHaveBeenCalledOnce()
    expect(instance.setContext).toHaveBeenLastCalledWith(
      expect.objectContaining({ institutionId: 'inst-2', requestId: REQUEST_ID })
    )
  })

  it('destrói a bolha em rota pública e ao deslogar', async () => {
    const { controller, instance, state } = setup()
    await controller.sync()
    state.route = { path: '/interesse/x', params: {}, meta: { public: true } }
    await controller.sync()
    expect(instance.destroy).toHaveBeenCalledOnce()

    state.route = { path: '/', params: {}, meta: {} }
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
  type RouteShape = { path: string; params: Record<string, string>; meta: Record<string, unknown> }

  function fakeRouter() {
    afterEachCb = () => {}
    currentRoute = ref<RouteShape>({ path: '/', params: {}, meta: {} })
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

    currentRoute.value = { path: `/pedidos/${REQUEST_ID}`, params: { id: REQUEST_ID }, meta: {} }
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
    currentRoute.value = { path: '/interesse/x', params: {}, meta: { public: true } }
    await startHemarcio(router)
    expect(create).not.toHaveBeenCalled()
  })
})
