import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import InterestCampaign from './InterestCampaign.vue'
import { token } from '../auth'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/interesse/:campaignId', component: InterestCampaign }],
  })
}

describe('InterestCampaign', () => {
  beforeEach(() => {
    token.value = null
    document.head.innerHTML = ''
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          institutionName: 'Escola Real',
          institutionLogoUrl: 'https://cdn.test/logo.png',
          institutionBannerUrl: 'https://cdn.test/banner.png',
          periodLabel: 'Março 2026',
          questionText: 'Quais dias você tem disponíveis?',
          isAcceptingResponses: true,
        }),
      })
    )
  })

  it('renders the public campaign without an authentication token', async () => {
    const router = createTestRouter()
    await router.push('/interesse/campaign-1')
    await router.isReady()

    const wrapper = mount(InterestCampaign, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Escola Real')
    expect(wrapper.text()).toContain('Quais dias você tem disponíveis?')
    expect(wrapper.get('[data-testid="interest-button"]').text()).toBe('Tenho interesse')
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex,nofollow'
    )
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://cdn.test/banner.png'
    )
  })

  it('submits selected days and offers a WhatsApp share link after authentication', async () => {
    token.value = 'test-token'
    vi.mocked(fetch)
      .mockReset()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          institutionName: 'Escola Real',
          periodLabel: 'Março 2026',
          questionText: 'Quais dias você tem disponíveis?',
          isAcceptingResponses: true,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response)

    const router = createTestRouter()
    await router.push('/interesse/campaign-1')
    await router.isReady()

    const wrapper = mount(InterestCampaign, { global: { plugins: [router] } })
    await flushPromises()
    await wrapper.get('[data-testid="interest-button"]').trigger('click')
    await wrapper.get('[data-testid="days-select"]').setValue(['monday', 'friday'])
    await wrapper.get('.response-form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://id-api.test/interest-campaigns/campaign-1/respond',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: JSON.stringify({ daysAvailable: ['monday', 'friday'] }),
      })
    )
    expect(wrapper.get('[data-testid="confirmation-state"]').text()).toContain('Obrigado')
    expect(wrapper.get('a').attributes('href')).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })

  it('updates the static og:image in place instead of duplicating it, and restores it on unmount', async () => {
    const staticImage = document.createElement('meta')
    staticImage.setAttribute('property', 'og:image')
    staticImage.setAttribute('content', 'https://cdn.hemocione.com.br/generic-og.png')
    document.head.appendChild(staticImage)

    const router = createTestRouter()
    await router.push('/interesse/campaign-1')
    await router.isReady()

    const wrapper = mount(InterestCampaign, { global: { plugins: [router] } })
    await flushPromises()

    const ogImageTags = document.head.querySelectorAll('meta[property="og:image"]')
    expect(ogImageTags).toHaveLength(1)
    expect(ogImageTags[0].getAttribute('content')).toBe('https://cdn.test/banner.png')

    wrapper.unmount()

    const restoredTags = document.head.querySelectorAll('meta[property="og:image"]')
    expect(restoredTags).toHaveLength(1)
    expect(restoredTags[0].getAttribute('content')).toBe('https://cdn.hemocione.com.br/generic-og.png')
  })

  it('disables interest when the public campaign is closed', async () => {
    vi.mocked(fetch).mockReset().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        institutionName: 'Escola Real',
        periodLabel: 'Março 2026',
        questionText: 'Quais dias você tem disponíveis?',
        isAcceptingResponses: false,
      }),
    } as Response)
    const router = createTestRouter()
    await router.push('/interesse/campaign-1')
    await router.isReady()

    const wrapper = mount(InterestCampaign, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Essa campanha não está mais aceitando respostas')
    expect(wrapper.get('[data-testid="interest-button"]').attributes('disabled')).toBeDefined()
  })
})
