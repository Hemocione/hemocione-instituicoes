import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import App from './App.vue'

const { route, logoutMock, redirectToLoginMock } = vi.hoisted(() => ({
  route: { meta: {} as Record<string, unknown> },
  logoutMock: vi.fn(),
  redirectToLoginMock: vi.fn(),
}))

vi.mock('./auth', () => ({
  logout: logoutMock,
  redirectToLogin: redirectToLoginMock,
}))

vi.mock('vue-router', () => ({
  RouterLink: { template: '<a><slot /></a>' },
  useRoute: () => route,
}))

function mountApp() {
  return mount(App, {
    global: {
      stubs: {
        OrgSwitcher: { template: '<div data-testid="org-switcher" />' },
        'router-view': true,
      },
    },
  })
}

describe('App topbar logout', () => {
  beforeEach(() => {
    route.meta = {}
    logoutMock.mockReset()
    redirectToLoginMock.mockReset()
  })

  it('shows the logout button on private routes and hides it on public routes', () => {
    const privateWrapper = mountApp()

    expect(privateWrapper.get('[data-testid="logout-button"]').text()).toBe('Sair')
    expect(privateWrapper.find('[data-testid="logout-button"] svg').exists()).toBe(true)

    privateWrapper.unmount()
    route.meta = { public: true }
    const publicWrapper = mountApp()

    expect(publicWrapper.find('[data-testid="logout-button"]').exists()).toBe(false)
    publicWrapper.unmount()
  })

  it('logs out and redirects to login when clicked', async () => {
    const wrapper = mountApp()

    await wrapper.get('[data-testid="logout-button"]').trigger('click')

    expect(logoutMock).toHaveBeenCalledOnce()
    expect(redirectToLoginMock).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
