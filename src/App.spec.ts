import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from './App.vue'

const { route, replace, viewMounts } = vi.hoisted(() => ({
  viewMounts: { count: 0 },
  route: {
    name: 'dashboard' as string,
    meta: {} as Record<string, unknown>,
    params: {} as Record<string, string>,
    query: {},
  },
  replace: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace }),
}))

function mountApp() {
  return mount(App, {
    global: {
      stubs: {
        Sidebar: { template: '<aside data-testid="sidebar" />' },
        'router-view': {
          template: '<div data-testid="view" />',
          mounted() {
            viewMounts.count += 1
          },
        },
      },
    },
  })
}

describe('App shell', () => {
  beforeEach(() => {
    route.name = 'dashboard'
    route.meta = {}
    route.params = {}
    replace.mockReset()
    viewMounts.count = 0
  })

  it('mostra a sidebar em rotas privadas', () => {
    const wrapper = mountApp()

    expect(wrapper.find('[data-testid="sidebar"]').exists()).toBe(true)
    expect(wrapper.find('.app-shell').exists()).toBe(true)

    wrapper.unmount()
  })

  it('esconde a sidebar em rotas públicas', () => {
    route.meta = { public: true }
    const wrapper = mountApp()

    expect(wrapper.find('[data-testid="sidebar"]').exists()).toBe(false)
    expect(wrapper.find('.app-shell').exists()).toBe(false)

    wrapper.unmount()
  })

  it('troca o id da rota quando outra instituição fica ativa', async () => {
    const { activeInstitutionId, setInstitutions } = await import('./institution')
    setInstitutions([
      { id: 'inst-a', name: 'A', role: 'admin' },
      { id: 'inst-b', name: 'B', role: 'admin' },
    ])
    activeInstitutionId.value = 'inst-a'
    route.name = 'certification'
    route.params = { institutionId: 'inst-a' }
    const wrapper = mountApp()

    activeInstitutionId.value = 'inst-b'
    await nextTick()

    expect(replace).toHaveBeenCalledWith({
      name: 'certification',
      params: { institutionId: 'inst-b' },
      query: {},
    })
    wrapper.unmount()
  })

  it('remonta a view quando a instituição ativa muda numa rota sem id', async () => {
    const { activeInstitutionId } = await import('./institution')
    activeInstitutionId.value = 'inst-a'
    const wrapper = mountApp()
    expect(viewMounts.count).toBe(1)

    activeInstitutionId.value = 'inst-b'
    await nextTick()

    expect(replace).not.toHaveBeenCalled()
    expect(viewMounts.count).toBe(2)
    wrapper.unmount()
  })
})
