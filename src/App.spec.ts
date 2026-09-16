import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import App from './App.vue'

const { route } = vi.hoisted(() => ({
  route: { meta: {} as Record<string, unknown> },
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
}))

function mountApp() {
  return mount(App, {
    global: {
      stubs: {
        Sidebar: { template: '<aside data-testid="sidebar" />' },
        'router-view': true,
      },
    },
  })
}

describe('App shell', () => {
  beforeEach(() => {
    route.meta = {}
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
})
