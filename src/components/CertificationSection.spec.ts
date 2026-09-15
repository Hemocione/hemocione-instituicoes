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

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

function currentPeriodLabel() {
  const now = new Date()
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
}

function periodLabelAtOffset(offset: number) {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

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

  it('renders the period select with the next 12 months, current month first, no past months', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([])

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()

    const select = wrapper.get('[data-testid="period-input"]')
    expect(select.element.tagName).toBe('SELECT')
    const options = wrapper.findAll('[data-testid="period-input"] option')
    expect(options).toHaveLength(12)
    const labels = options.map((option) => option.text())
    expect(labels[0]).toBe(currentPeriodLabel())
    expect(labels[11]).toBe(periodLabelAtOffset(11))
    // Each label is unique and all 12 are in chronological order.
    expect(new Set(labels).size).toBe(12)
    expect(labels).toEqual(
      Array.from({ length: 12 }, (_, offset) => periodLabelAtOffset(offset))
    )
    expect((select.element as HTMLSelectElement).value).toBe(currentPeriodLabel())
  })

  it('updates the submitted payload when the user picks a different month', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([])
    vi.mocked(idApi.createInterestCampaign).mockResolvedValue({
      id: 'campaign-2',
      periodLabel: 'qualquer',
      startDate: '2099-01-01',
      endDate: '2099-01-07',
      status: 'scheduled',
    })

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()

    const picked = periodLabelAtOffset(2)
    expect(picked).not.toBe(currentPeriodLabel())

    await wrapper.get('[data-testid="period-input"]').setValue(picked)
    expect(
      (wrapper.get('[data-testid="period-input"]').element as HTMLSelectElement).value
    ).toBe(picked)
    await wrapper.get('[data-testid="duration-input"]').setValue('7')
    await wrapper.get('[data-testid="start-date-input"]').setValue('2099-01-01')
    await wrapper.get('[data-testid="create-campaign-form"]').trigger('submit')
    await flushPromises()

    expect(idApi.createInterestCampaign).toHaveBeenCalledWith('inst-1', {
      periodLabel: picked,
      startDate: '2099-01-01',
      endDate: '2099-01-07',
    })
  })

  it('creates a campaign and displays its public link', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([])
    vi.mocked(idApi.createInterestCampaign).mockResolvedValue({
      id: 'campaign-1',
      periodLabel: currentPeriodLabel(),
      startDate: '2099-03-01',
      endDate: '2099-03-07',
      status: 'scheduled',
    })

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()
    // period-input already defaults to the current month — set a deterministic start date instead.
    await wrapper.get('[data-testid="duration-input"]').setValue('7')
    await wrapper.get('[data-testid="start-date-input"]').setValue('2099-03-01')
    await wrapper.get('[data-testid="create-campaign-form"]').trigger('submit')
    await flushPromises()

    expect(idApi.createInterestCampaign).toHaveBeenCalledWith('inst-1', {
      periodLabel: currentPeriodLabel(),
      startDate: '2099-03-01',
      endDate: '2099-03-07',
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
    await wrapper.get('[data-testid="create-campaign-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Já existe uma campanha de interesse agendada ou ativa')
    expect(wrapper.find('[data-testid="create-campaign-form"]').exists()).toBe(true)
  })

  it('derives and copies the public link from a campaign already active on load', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([
      {
        id: 'campaign-existing',
        periodLabel: 'Março 2026',
        startDate: '2026-03-01',
        endDate: '2026-03-07',
        status: 'active',
      },
    ])

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()

    expect(idApi.createInterestCampaign).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="campaign-link"]').attributes('value')).toBe(
      `${window.location.origin}/interesse/campaign-existing`
    )
    expect(wrapper.text()).toContain('Seu link de interesse')

    const copyButton = wrapper
      .get('.generated-link')
      .findAll('button')
      .find((button) => button.text() === 'Copiar')
    expect(copyButton).toBeTruthy()
    await copyButton!.trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/interesse/campaign-existing`)
    expect(copyButton!.text()).toBe('Copiado')
  })

  it('resets the copied state when the displayed link changes', async () => {
    vi.mocked(idApi.listInterestCampaigns)
      .mockResolvedValueOnce([
        {
          id: 'campaign-existing',
          periodLabel: 'Março 2026',
          startDate: '2026-03-01',
          endDate: '2026-03-07',
          status: 'active',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'campaign-other',
          periodLabel: 'Abril 2026',
          startDate: '2026-04-01',
          endDate: '2026-04-07',
          status: 'active',
        },
      ])

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()

    const copyButton = wrapper
      .get('.generated-link')
      .findAll('button')
      .find((button) => button.text() === 'Copiar')
    await copyButton!.trigger('click')
    await flushPromises()
    expect(copyButton!.text()).toBe('Copiado')

    await wrapper.setProps({ institutionId: 'inst-2' })
    await flushPromises()

    expect(wrapper.get('[data-testid="campaign-link"]').attributes('value')).toBe(
      `${window.location.origin}/interesse/campaign-other`
    )
    expect(wrapper.get('.generated-link').findAll('button').find((button) => button.text() === 'Copiar')).toBeTruthy()
  })

  it('renders the 7 day bars always in Seg-to-Dom order even when a later day peaks', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([
      {
        id: 'campaign-bars',
        periodLabel: 'Março 2026',
        startDate: '2026-03-01',
        endDate: '2026-03-07',
        status: 'completed',
        dayDistribution: { mon: 2, sat: 9 },
      },
    ])

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="day-bar"]')
    expect(rows).toHaveLength(7)
    const labels = rows.map((row) => row.find('.day-label').text().trim())
    expect(labels).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'])
  })

  it('shows the numeric value of each day on its own row', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([
      {
        id: 'campaign-values',
        periodLabel: 'Março 2026',
        startDate: '2026-03-01',
        endDate: '2026-03-07',
        status: 'completed',
        dayDistribution: { mon: 2, tue: 0, wed: 1, thu: 4, fri: 0, sat: 7, sun: 1 },
      },
    ])

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="day-bar"]')
    expect(rows).toHaveLength(7)
    const expected: Array<[string, string, string]> = [
      ['Segunda', '2', 'Segunda: 2 respostas'],
      ['Terça', '0', 'Terça: 0 respostas'],
      ['Quarta', '1', 'Quarta: 1 resposta'],
      ['Quinta', '4', 'Quinta: 4 respostas'],
      ['Sexta', '0', 'Sexta: 0 respostas'],
      ['Sábado', '7', 'Sábado: 7 respostas'],
      ['Domingo', '1', 'Domingo: 1 resposta'],
    ]
    rows.forEach((row, index) => {
      const entry = expected[index]!
      expect(row.find('.day-value').text().trim()).toBe(entry[1])
      expect(row.attributes('title')).toBe(entry[2])
    })
    const fills = rows.map((row) => row.find('.day-fill').attributes('style') ?? '')
    expect(fills[5]).toContain('100%')
    expect(fills[1]).toContain('0%')
  })

  it('renders 7 zero rows without undefined or NaN when the campaign has no responses', async () => {
    vi.mocked(idApi.listInterestCampaigns).mockResolvedValue([
      {
        id: 'campaign-empty',
        periodLabel: 'Março 2026',
        startDate: '2026-03-01',
        endDate: '2026-03-07',
        status: 'completed',
        dayDistribution: {},
      },
    ])

    const wrapper = mount(CertificationSection, { props: { institutionId: 'inst-1', institution } })
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="day-bar"]')
    expect(rows).toHaveLength(7)
    rows.forEach((row) => {
      expect(row.find('.day-value').text().trim()).toBe('0')
    })
    expect(wrapper.text()).not.toContain('undefined')
    expect(wrapper.text()).not.toContain('NaN')
  })
})