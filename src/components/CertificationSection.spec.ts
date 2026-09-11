import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CertificationSection from './CertificationSection.vue'
import { idApi } from '../api'

vi.mock('../api', () => ({
  idApi: {
    listInterestCampaigns: vi.fn(),
    createInterestCampaign: vi.fn(),
    cancelInterestCampaign: vi.fn(),
  },
}))

const institution = { id: 'inst-1', name: 'Escola Real' }

describe('CertificationSection', () => {
  beforeEach(() => {
    vi.mocked(idApi.listInterestCampaigns).mockReset()
    vi.mocked(idApi.createInterestCampaign).mockReset()
    vi.mocked(idApi.cancelInterestCampaign).mockReset()
  })

  it('renders the unverified status without an active campaign', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([])

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()

    expect(wrapper.get('[data-testid="certification-status"]').text()).toContain('Não verificado')
  })

  it('renders the in-progress status when a campaign is scheduled', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([
      {
        id: 'campaign-1',
        periodLabel: 'Março 2026',
        startDate: '2026-03-01',
        endDate: '2026-03-07',
        status: 'scheduled',
      },
    ])

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()

    expect(wrapper.get('[data-testid="certification-status"]').text()).toContain(
      'Em processo de certificação'
    )
  })

  it('renders the granted seal status from the institution data', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([])

    const wrapper = mount(CertificationSection, {
      props: { institutionId: 'inst-1', institution: { ...institution, certificationStatus: 'certified' } },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="certification-status"]').text()).toContain('Selo concedido')
  })

  it('creates a campaign and displays its public link', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([])
    vi.mocked(idApi.createInterestCampaign).mockResolvedValue({
      id: 'campaign-1',
      periodLabel: 'Março 2026',
      startDate: '2026-03-01',
      endDate: '2026-03-07',
      status: 'scheduled',
    })

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()
    await wrapper.get('[data-testid="period-input"]').setValue('Março 2026')
    await wrapper.get('[data-testid="duration-input"]').setValue('7')
    await wrapper.get('[data-testid="start-date-input"]').setValue('2026-03-01')
    await wrapper.get('[data-testid="create-campaign-form"]').trigger('submit')
    await flushPromises()

    expect(idApi.createInterestCampaign).toHaveBeenCalledWith('inst-1', {
      periodLabel: 'Março 2026',
      startDate: '2026-03-01',
      endDate: '2026-03-07',
    })
    expect(wrapper.get('[data-testid="campaign-link"]').attributes('value')).toBe(
      `${window.location.origin}/interesse/campaign-1`
    )
  })

  it('keeps the form visible with a clear message when the backend returns 409', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([])
    vi.mocked(idApi.createInterestCampaign).mockRejectedValue(
      new Error('request failed: 409 /interest-campaigns')
    )

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()
    await wrapper.get('[data-testid="period-input"]').setValue('Março 2026')
    await wrapper.get('[data-testid="create-campaign-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Já existe uma campanha de interesse agendada ou ativa')
    expect(wrapper.find('[data-testid="create-campaign-form"]').exists()).toBe(true)
  })
})
