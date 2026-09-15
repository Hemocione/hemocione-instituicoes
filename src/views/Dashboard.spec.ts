import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import Dashboard from './Dashboard.vue'
import { coletaApi, idApi } from '../api'
import { activeInstitutionId, institutions } from '../institution'

vi.mock('../api', () => ({
  coletaApi: {
    listCollectionRequests: vi.fn(),
  },
  idApi: {
    myInstitutions: vi.fn(),
    listInterestCampaigns: vi.fn(),
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
    vi.mocked(idApi.myInstitutions).mockResolvedValue([{ id: 'inst-1', name: 'Escola Um', role: 'member' }])
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([])
    vi.mocked(coletaApi.listCollectionRequests).mockResolvedValue({ items: [] })
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
})
