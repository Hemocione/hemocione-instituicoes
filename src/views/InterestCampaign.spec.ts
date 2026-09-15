import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import InterestCampaign from './InterestCampaign.vue'
import { redirectToLogin, token } from '../auth'

// Partial mock: keep the real token/isAuthenticated wiring (shared with ../api)
// and replace only the navigation side effect so it can be asserted.
vi.mock('../auth', async () => {
  const actual = await vi.importActual<typeof import('../auth')>('../auth')
  return { ...actual, redirectToLogin: vi.fn() }
})

const campaignResponse = {
  institutionName: 'Escola Real',
  institutionLogoUrl: 'https://cdn.test/logo.png',
  institutionBannerUrl: 'https://cdn.test/banner.png',
  periodLabel: 'Março 2026',
  questionText: 'Quais dias você tem disponíveis?',
  isAcceptingResponses: true,
}

function stubFetch(overrides: Record<string, unknown> = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    if (String(input).includes('/public')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ...campaignResponse, ...overrides }),
      } as Response
    }
    return { ok: true, status: 200, json: async () => ({ success: true }) } as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function postCalls(fetchMock: ReturnType<typeof stubFetch>) {
  return fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/interesse/:campaignId', component: InterestCampaign }],
  })
}

async function mountPage() {
  const router = createTestRouter()
  await router.push('/interesse/campaign-1')
  await router.isReady()

  const wrapper = mount(InterestCampaign, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('InterestCampaign', () => {
  beforeEach(() => {
    token.value = null
    localStorage.clear()
    document.head.innerHTML = ''
    window.history.replaceState(window.history.state, '', '/interesse/campaign-1')
    vi.mocked(redirectToLogin).mockReset()
  })

  it('toggles the day buttons and reflects the selection through aria-pressed', async () => {
    stubFetch()
    const wrapper = await mountPage()

    expect(wrapper.findAll('[data-testid^="day-toggle-"]')).toHaveLength(7)

    const monday = wrapper.get('[data-testid="day-toggle-mon"]')
    expect(monday.attributes('type')).toBe('button')
    expect(monday.attributes('aria-pressed')).toBe('false')
    expect(wrapper.find('select').exists()).toBe(false)

    await monday.trigger('click')
    expect(monday.attributes('aria-pressed')).toBe('true')

    await monday.trigger('click')
    expect(monday.attributes('aria-pressed')).toBe('false')
  })

  it('stores pending days and redirects to login without calling the API when unauthenticated', async () => {
    const fetchMock = stubFetch()
    const wrapper = await mountPage()

    await wrapper.get('[data-testid="day-toggle-mon"]').trigger('click')
    await wrapper.get('[data-testid="day-toggle-fri"]').trigger('click')
    await wrapper.get('.response-form').trigger('submit')
    await flushPromises()

    expect(localStorage.getItem('interest_campaign_pending:campaign-1')).toBe(
      JSON.stringify(['mon', 'fri'])
    )
    expect(redirectToLogin).toHaveBeenCalledTimes(1)
    expect(redirectToLogin).toHaveBeenCalledWith({ resume_days: 'mon,fri' })
    expect(postCalls(fetchMock)).toHaveLength(0)
  })

  it('posts the response, records it, and shows the WhatsApp confirmation when authenticated', async () => {
    token.value = 'test-token'
    const fetchMock = stubFetch()
    const wrapper = await mountPage()

    await wrapper.get('[data-testid="day-toggle-tue"]').trigger('click')
    await wrapper.get('[data-testid="day-toggle-sat"]').trigger('click')
    await wrapper.get('.response-form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://id-api.test/interest-campaigns/campaign-1/respond',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: JSON.stringify({ daysAvailable: ['tue', 'sat'] }),
      })
    )
    expect(localStorage.getItem('interest_campaign_responded:campaign-1')).toBe('true')
    expect(localStorage.getItem('interest_campaign_pending:campaign-1')).toBeNull()
    expect(redirectToLogin).not.toHaveBeenCalled()
    expect(wrapper.find('.response-form').exists()).toBe(false)

    const confirmation = wrapper.get('[data-testid="confirmation-state"]')
    expect(confirmation.text()).toContain('Obrigado')
    expect(confirmation.get('a').attributes('href')).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })

  it('envia daysAvailable com códigos de 3 letras (regressão 400)', async () => {
    token.value = 'test-token'
    const fetchMock = stubFetch()
    const wrapper = await mountPage()

    await wrapper.get('[data-testid="day-toggle-mon"]').trigger('click')
    await wrapper.get('.response-form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://id-api.test/interest-campaigns/campaign-1/respond',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ daysAvailable: ['mon'] }),
      })
    )
  })

  it('prefills from resume_days on return, removes only that param, and clears pending', async () => {
    token.value = 'test-token'
    localStorage.setItem('interest_campaign_pending:campaign-1', JSON.stringify(['sun']))
    window.history.replaceState(
      window.history.state,
      '',
      '/interesse/campaign-1?keep=1&resume_days=mon,fri'
    )
    const fetchMock = stubFetch()

    const wrapper = await mountPage()

    expect(wrapper.get('[data-testid="day-toggle-mon"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="day-toggle-fri"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="day-toggle-sun"]').attributes('aria-pressed')).toBe('false')
    expect(postCalls(fetchMock)).toHaveLength(0)

    const params = new URLSearchParams(window.location.search)
    expect(params.get('keep')).toBe('1')
    expect(params.has('resume_days')).toBe(false)
    expect(localStorage.getItem('interest_campaign_pending:campaign-1')).toBeNull()
  })

  it('prefills from the pending storage fallback when the URL has no resume_days', async () => {
    token.value = 'test-token'
    localStorage.setItem('interest_campaign_pending:campaign-1', JSON.stringify(['wed']))
    const fetchMock = stubFetch()

    const wrapper = await mountPage()

    expect(wrapper.get('[data-testid="day-toggle-wed"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="day-toggle-mon"]').attributes('aria-pressed')).toBe('false')
    expect(postCalls(fetchMock)).toHaveLength(0)
    expect(localStorage.getItem('interest_campaign_pending:campaign-1')).toBeNull()
  })

  it('skips straight to the confirmation state when the response was already recorded', async () => {
    localStorage.setItem('interest_campaign_responded:campaign-1', 'true')
    const fetchMock = stubFetch()

    const wrapper = await mountPage()

    expect(wrapper.get('[data-testid="confirmation-state"]').text()).toContain('Obrigado')
    expect(wrapper.find('.response-form').exists()).toBe(false)
    expect(wrapper.find('[data-testid="confirm-response-button"]').exists()).toBe(false)
    expect(postCalls(fetchMock)).toHaveLength(0)
  })

  it('does not restore a selection and shows the closed state when the campaign stopped accepting responses', async () => {
    token.value = 'test-token'
    localStorage.setItem('interest_campaign_pending:campaign-1', JSON.stringify(['mon']))
    window.history.replaceState(
      window.history.state,
      '',
      '/interesse/campaign-1?resume_days=mon,fri'
    )
    const fetchMock = stubFetch({ isAcceptingResponses: false })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Essa campanha não está mais aceitando respostas')
    expect(wrapper.find('.response-form').exists()).toBe(false)
    expect(wrapper.find('[data-testid="confirm-response-button"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid^="day-toggle-"]')).toHaveLength(0)
    expect(postCalls(fetchMock)).toHaveLength(0)
  })

  it('shows a validation error and does not call the API or redirect when no day is selected', async () => {
    const fetchMock = stubFetch()
    const wrapper = await mountPage()

    await wrapper.get('.response-form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.form-error').text()).toBe('Selecione pelo menos um dia da semana.')
    expect(redirectToLogin).not.toHaveBeenCalled()
    expect(postCalls(fetchMock)).toHaveLength(0)
    expect(localStorage.getItem('interest_campaign_pending:campaign-1')).toBeNull()

    await wrapper.get('[data-testid="day-toggle-mon"]').trigger('click')
    expect(wrapper.find('.form-error').exists()).toBe(false)
  })

  it('renders the public campaign without a token and sets noindex and og:image', async () => {
    stubFetch()
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Escola Real')
    expect(wrapper.text()).toContain('Quais dias você tem disponíveis?')
    expect(wrapper.get('[data-testid="confirm-response-button"]').text()).toBe('Confirmar interesse')
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex,nofollow'
    )
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://cdn.test/banner.png'
    )
  })

  it('updates the static og:image in place instead of duplicating it, and restores it on unmount', async () => {
    const staticImage = document.createElement('meta')
    staticImage.setAttribute('property', 'og:image')
    staticImage.setAttribute('content', 'https://cdn.hemocione.com.br/generic-og.png')
    document.head.appendChild(staticImage)

    stubFetch()
    const wrapper = await mountPage()

    const ogImageTags = document.head.querySelectorAll('meta[property="og:image"]')
    expect(ogImageTags).toHaveLength(1)
    expect(ogImageTags[0].getAttribute('content')).toBe('https://cdn.test/banner.png')

    wrapper.unmount()

    const restoredTags = document.head.querySelectorAll('meta[property="og:image"]')
    expect(restoredTags).toHaveLength(1)
    expect(restoredTags[0].getAttribute('content')).toBe('https://cdn.hemocione.com.br/generic-og.png')
  })

  it('shows an error state and no form when the campaign cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response)
    )

    const wrapper = await mountPage()

    expect(wrapper.get('.campaign-error').text()).toContain('request failed: 500')
    expect(wrapper.find('.response-form').exists()).toBe(false)
  })
})
