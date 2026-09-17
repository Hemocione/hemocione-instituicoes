import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
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

  it('mostra o seletor de instituição e o botão de sair', () => {
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', kind: 'school' }])
    const wrapper = mountSidebar()
    expect(wrapper.find('[data-testid="org-switcher"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="logout-button"]').text()).toBe('Sair')
    wrapper.unmount()
  })

  it('mantém a sidebar fixa na viewport', () => {
    const wrapper = mountSidebar()

    expect(getComputedStyle(wrapper.get('.sidebar').element).position).toBe('fixed')
    wrapper.unmount()
  })

  it('colapsa a sidebar para ícones e expande novamente', async () => {
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', role: 'admin' }])
    const wrapper = mountSidebar()
    const toggle = wrapper.get('[data-testid="sidebar-toggle"]')
    const dashboardLink = wrapper.get('a[href="/"]')

    expect(wrapper.get('.sidebar').classes()).not.toContain('sidebar--collapsed')
    expect(dashboardLink.text()).toContain('Dashboard')

    await toggle.trigger('click')

    expect(wrapper.get('.sidebar').classes()).toContain('sidebar--collapsed')
    expect(dashboardLink.text()).toBe('')
    expect(dashboardLink.attributes('title')).toBe('Dashboard')

    await toggle.trigger('click')

    expect(wrapper.get('.sidebar').classes()).not.toContain('sidebar--collapsed')
    expect(dashboardLink.text()).toContain('Dashboard')
    wrapper.unmount()
  })

  it('mostra o nome e a logo da instituição ativa no header', () => {
    setInstitutions([
      {
        id: 'inst-1',
        name: 'Hospital Luz',
        kind: 'company',
        logo: 'https://example.com/hospital-luz.png',
      },
      { id: 'inst-2', name: 'Escola Um', kind: 'school' },
    ])
    const wrapper = mountSidebar()

    expect(wrapper.find('.sidebar-brand').text()).toContain('Hospital Luz')
    expect(wrapper.find('.sidebar-brand').text()).not.toContain('Hemocione Instituições')
    expect(wrapper.get('[data-testid="active-institution-logo"]').attributes('src')).toBe(
      'https://example.com/hospital-luz.png'
    )
    expect(wrapper.get('[data-testid="org-switcher-trigger"] svg').classes()).toContain(
      'org-switcher-chevron'
    )
    wrapper.unmount()
  })

  it('usa o ícone do tipo quando a instituição não tem logo', () => {
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', kind: 'school' }])
    const wrapper = mountSidebar()

    expect(wrapper.find('[data-testid="active-institution-logo"]').exists()).toBe(false)
    expect(wrapper.find('.sidebar-brand .institution-kind-icon').exists()).toBe(true)
    expect(wrapper.find('[data-testid="org-switcher-chevron"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('troca a instituição pelo dropdown integrado ao header', async () => {
    setInstitutions([
      { id: 'inst-1', name: 'Escola Um', kind: 'school' },
      { id: 'inst-2', name: 'Empresa Dois', kind: 'company' },
    ])
    const wrapper = mountSidebar()

    await wrapper.get('[data-testid="org-switcher-trigger"]').trigger('click')
    const secondInstitution = document.querySelector<HTMLButtonElement>(
      '[data-testid="institution-option-inst-2"]'
    )
    expect(secondInstitution).not.toBeNull()
    secondInstitution?.click()
    await nextTick()

    expect(activeInstitutionId.value).toBe('inst-2')
    expect(wrapper.get('[data-testid="active-institution-name"]').text()).toBe('Empresa Dois')
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

  it('mostra um ícone SVG em cada item de navegação', () => {
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', role: 'admin' }])
    const wrapper = mountSidebar()

    for (const link of wrapper.findAll('.sidebar-nav a')) {
      expect(link.find('svg[aria-hidden="true"]').exists()).toBe(true)
    }
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
