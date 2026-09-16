import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Sidebar from './Sidebar.vue'
import { activeInstitutionId, institutions, setInstitutions } from '../institution'

const { route, logoutMock, redirectToLoginMock } = vi.hoisted(() => ({
  route: { meta: {} as Record<string, unknown> },
  logoutMock: vi.fn(),
  redirectToLoginMock: vi.fn(),
}))

vi.mock('../auth', () => ({
  logout: logoutMock,
  redirectToLogin: redirectToLoginMock,
}))

vi.mock('vue-router', () => ({
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
  useRoute: () => route,
}))

function mountSidebar() {
  return mount(Sidebar, {
    global: {
      stubs: {
        OrgSwitcher: { template: '<div data-testid="org-switcher" />' },
        RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
      },
    },
  })
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear()
    institutions.value = []
    activeInstitutionId.value = null
    logoutMock.mockReset()
    redirectToLoginMock.mockReset()
  })

  it('mostra o OrgSwitcher e o botão de sair', () => {
    const wrapper = mountSidebar()
    expect(wrapper.find('[data-testid="org-switcher"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="logout-button"]').text()).toBe('Sair')
    wrapper.unmount()
  })

  it('sai e redireciona ao clicar em Sair', async () => {
    const wrapper = mountSidebar()
    await wrapper.get('[data-testid="logout-button"]').trigger('click')
    expect(logoutMock).toHaveBeenCalledOnce()
    expect(redirectToLoginMock).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('lista os itens de navegação com rotas escopadas e Membros para admin', () => {
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', role: 'admin' }])
    const wrapper = mountSidebar()
    const links = wrapper.findAll('a').map((link) => link.text())
    expect(links).toContain('Dashboard')
    expect(links).toContain('Membros')
    expect(links).toContain('Certificação')
    expect(wrapper.get('a[href="/inst-1/membros"]').text()).toBe('Membros')
    expect(wrapper.get('a[href="/inst-1/certificacao"]').text()).toBe('Certificação')
    wrapper.unmount()
  })

  it('esconde Membros para quem não é admin', () => {
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', role: 'staff' }])
    const wrapper = mountSidebar()
    expect(wrapper.find('a[href="/inst-1/membros"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/inst-1/certificacao"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
