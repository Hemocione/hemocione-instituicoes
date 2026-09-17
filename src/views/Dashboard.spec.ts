import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import Dashboard from './Dashboard.vue'
import { coletaApi, digitalEventApi, idApi } from '../api'
import { activeInstitutionId, institutions } from '../institution'

vi.mock('../api', () => ({
  coletaApi: {
    listCollectionRequests: vi.fn(),
  },
  idApi: {
    myInstitutions: vi.fn(),
    listInterestCampaigns: vi.fn(),
  },
  digitalEventApi: {
    listEventsForInstitution: vi.fn(),
    getEventSubscribers: vi.fn(),
  },
}))

describe('Dashboard certification summary', () => {
  beforeEach(() => {
    localStorage.clear()
    institutions.value = []
    activeInstitutionId.value = null
    vi.mocked(idApi.myInstitutions).mockReset()
    vi.mocked(idApi.listInterestCampaigns).mockReset()
    vi.mocked(coletaApi.listCollectionRequests).mockReset()
    vi.mocked(digitalEventApi.listEventsForInstitution).mockReset()
    vi.mocked(digitalEventApi.getEventSubscribers).mockReset()
    vi.mocked(idApi.myInstitutions).mockResolvedValue([{ id: 'inst-1', name: 'Escola Um', role: 'member' }])
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([])
    vi.mocked(coletaApi.listCollectionRequests).mockResolvedValue({ items: [] })
    vi.mocked(digitalEventApi.listEventsForInstitution).mockResolvedValue({ total: 0, items: [] })
    vi.mocked(digitalEventApi.getEventSubscribers).mockResolvedValue({ total: 0, items: [] })
  })

  it('shows a compact summary and link instead of the full certification form', async () => {
    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
          InstitutionImageUploadField: true,
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="certification-summary"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="dashboard-certification-status"]').text()).toContain('Não verificado')
    expect(wrapper.get('[data-testid="certification-summary-link"]').attributes('href')).toBe(
      '/inst-1/certificacao'
    )
    expect(wrapper.find('[data-testid="create-campaign-form"]').exists()).toBe(false)
  })

  it('mostra o evento em destaque com contagem de inscritos e botão de exportar', async () => {
    vi.mocked(digitalEventApi.listEventsForInstitution).mockResolvedValue({
      total: 1,
      items: [
        {
          _id: 'e1',
          name: 'Coleta na Escola',
          slug: 'coleta-escola',
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 3600_000).toISOString(),
        },
      ],
    })
    vi.mocked(digitalEventApi.getEventSubscribers).mockResolvedValue({
      total: 5,
      items: [{ createdAt: new Date().toISOString(), name: 'Fulano', email: 'a@b.com' }],
    })

    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
          InstitutionImageUploadField: true,
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="featured-event-name"]').text()).toBe('Coleta na Escola')
    expect(wrapper.get('[data-testid="featured-event-subscribers"]').text()).toContain('5')
    expect(wrapper.find('[data-testid="download-subscribers"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('não mostra o card de evento em destaque quando não há eventos', async () => {
    vi.mocked(digitalEventApi.listEventsForInstitution).mockResolvedValue({ total: 0, items: [] })

    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
          InstitutionImageUploadField: true,
        },
      },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="featured-event-name"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('lista todos os eventos passados e futuros em uma seção separada', async () => {
    vi.mocked(digitalEventApi.listEventsForInstitution).mockResolvedValue({
      total: 2,
      items: [
        {
          _id: 'e1',
          name: 'Evento A',
          slug: 'a',
          startAt: '2026-01-01T00:00:00Z',
          endAt: '2026-01-01T04:00:00Z',
        },
        {
          _id: 'e2',
          name: 'Evento B',
          slug: 'b',
          startAt: '2026-09-16T00:00:00Z',
          endAt: '2026-09-16T04:00:00Z',
        },
      ],
    })
    vi.mocked(digitalEventApi.getEventSubscribers).mockResolvedValue({ total: 0, items: [] })

    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
          InstitutionImageUploadField: true,
        },
      },
    })
    await flushPromises()

    const names = wrapper.findAll('[data-testid="event-list-item"]').map((item) => item.text())
    expect(names.some((text) => text.includes('Evento A'))).toBe(true)
    expect(names.some((text) => text.includes('Evento B'))).toBe(true)
    wrapper.unmount()
  })

  it('mostra a data da contraproposta pendente quando o pedido está counter_proposed', async () => {
    vi.mocked(coletaApi.listCollectionRequests).mockResolvedValue({
      collectionRequests: [
        {
          id: 'req-1',
          status: 'counter_proposed',
          counterProposal: {
            proposedDates: [{ date: '2026-10-01T12:00:00Z', startTime: '09:00' }],
          },
        },
      ],
    })

    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
          InstitutionImageUploadField: true,
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="request-next-date"]').text()).toContain('01/10/2026')
    wrapper.unmount()
  })

  it('não mostra a linha de próxima data quando o pedido não tem contraproposta', async () => {
    vi.mocked(coletaApi.listCollectionRequests).mockResolvedValue({
      collectionRequests: [{ id: 'req-1', status: 'pending' }],
    })

    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
          InstitutionImageUploadField: true,
        },
      },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="request-next-date"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('mantém pedidos e certificação quando a listagem de eventos falha', async () => {
    vi.mocked(digitalEventApi.listEventsForInstitution).mockRejectedValue(new Error('403 Forbidden'))

    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
          InstitutionImageUploadField: true,
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('#requests-title').text()).toContain('Meus pedidos')
    expect(wrapper.find('[data-testid="certification-summary"]').exists()).toBe(true)
    expect(wrapper.find('.error-message').exists()).toBe(false)
    wrapper.unmount()
  })
})
