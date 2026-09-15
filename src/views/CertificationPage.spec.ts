import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CertificationPage from './CertificationPage.vue'
import { idApi } from '../api'
import { activeInstitutionId, institutions } from '../institution'

const { route } = vi.hoisted(() => ({
  route: { params: { institutionId: 'inst-2' } },
}))

vi.mock('vue-router', () => ({
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
  useRoute: () => route,
}))

vi.mock('../api', () => ({
  idApi: {
    myInstitutions: vi.fn(),
    listInterestCampaigns: vi.fn(),
    createInterestCampaign: vi.fn(),
    cancelInterestCampaign: vi.fn(),
  },
}))

const userInstitutions = [
  { id: 'inst-1', name: 'Escola Um', role: 'member' },
  { id: 'inst-2', name: 'Escola Dois', role: 'member' },
]

describe('CertificationPage', () => {
  let wrapper: ReturnType<typeof mount> | undefined

  beforeEach(() => {
    localStorage.clear()
    institutions.value = []
    activeInstitutionId.value = null
    route.params = { institutionId: 'inst-2' }
    vi.mocked(idApi.myInstitutions).mockReset()
    vi.mocked(idApi.listInterestCampaigns).mockReset()
    vi.mocked(idApi.createInterestCampaign).mockReset()
    vi.mocked(idApi.cancelInterestCampaign).mockReset()
    vi.mocked(idApi.myInstitutions).mockResolvedValue(userInstitutions)
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([])
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it('renders the page for the institution in the route', async () => {
    wrapper = mount(CertificationPage)
    await flushPromises()

    expect(wrapper.get('[data-testid="certification-page"]').attributes('data-institution-id')).toBe('inst-2')
    expect(wrapper.get('h1').text()).toBe('Certificação')
    expect(wrapper.get('[data-testid="certification-explainer"]')).toBeTruthy()
    expect(idApi.listInterestCampaigns).toHaveBeenCalledWith('inst-2')
  })

  it('synchronizes the active institution with a valid route institution', async () => {
    institutions.value = userInstitutions
    activeInstitutionId.value = 'inst-1'

    wrapper = mount(CertificationPage)
    await flushPromises()

    expect(activeInstitutionId.value).toBe('inst-2')
    expect(idApi.myInstitutions).not.toHaveBeenCalled()
    expect(idApi.listInterestCampaigns).toHaveBeenCalledWith('inst-2')
  })

  it('shows an access error and does not load campaigns for an unknown institution', async () => {
    route.params = { institutionId: 'inst-unknown' }

    wrapper = mount(CertificationPage)
    await flushPromises()

    expect(wrapper.get('[data-testid="certification-access-error"]').text()).toContain(
      'Você não tem acesso a esta instituição.'
    )
    expect(idApi.listInterestCampaigns).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="create-campaign-form"]').exists()).toBe(false)
  })
})
