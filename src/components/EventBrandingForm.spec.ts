import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import EventBrandingForm from './EventBrandingForm.vue'
import { coletaApi } from '../api'

vi.mock('../api', () => ({
  coletaApi: {
    updateEventBranding: vi.fn(),
  },
}))

describe('EventBrandingForm', () => {
  beforeEach(() => {
    vi.mocked(coletaApi.updateEventBranding).mockReset()
  })

  it('does not render the form when status is not scheduled', () => {
    const wrapper = mount(EventBrandingForm, {
      props: { institutionId: 'inst-1', requestId: 'req-1', status: 'pending', eventSlug: undefined },
    })
    expect(wrapper.find('[data-testid="banner-input"]').exists()).toBe(false)
  })

  it('does not render the form when scheduled but eventSlug is missing', () => {
    const wrapper = mount(EventBrandingForm, {
      props: { institutionId: 'inst-1', requestId: 'req-1', status: 'scheduled', eventSlug: undefined },
    })
    expect(wrapper.find('[data-testid="banner-input"]').exists()).toBe(false)
  })

  it('renders the form when scheduled and eventSlug exists', () => {
    const wrapper = mount(EventBrandingForm, {
      props: { institutionId: 'inst-1', requestId: 'req-1', status: 'scheduled', eventSlug: 'evt-1' },
    })
    expect(wrapper.find('[data-testid="banner-input"]').exists()).toBe(true)
  })

  it('calls coletaApi.updateEventBranding with the form data on submit', async () => {
    vi.mocked(coletaApi.updateEventBranding).mockResolvedValue({ success: true })
    const wrapper = mount(EventBrandingForm, {
      props: { institutionId: 'inst-1', requestId: 'req-1', status: 'scheduled', eventSlug: 'evt-1' },
    })

    await wrapper.find('[data-testid="banner-input"]').setValue('https://cdn.test/banner.png')
    await wrapper.find('[data-testid="logo-input"]').setValue('https://cdn.test/logo.png')
    await wrapper.find('[data-testid="address-input"]').setValue('Rua Teste, 123')
    await wrapper.find('form').trigger('submit')

    expect(coletaApi.updateEventBranding).toHaveBeenCalledWith('inst-1', 'req-1', {
      banner: 'https://cdn.test/banner.png',
      logo: 'https://cdn.test/logo.png',
      address: 'Rua Teste, 123',
    })
  })

  it('shows a success message when the call succeeds', async () => {
    vi.mocked(coletaApi.updateEventBranding).mockResolvedValue({ success: true })
    const wrapper = mount(EventBrandingForm, {
      props: { institutionId: 'inst-1', requestId: 'req-1', status: 'scheduled', eventSlug: 'evt-1' },
    })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="success-message"]').exists()).toBe(true)
  })

  it('shows an error message when the call fails', async () => {
    vi.mocked(coletaApi.updateEventBranding).mockRejectedValue(
      new Error('request failed: 400 event-branding')
    )
    const wrapper = mount(EventBrandingForm, {
      props: { institutionId: 'inst-1', requestId: 'req-1', status: 'scheduled', eventSlug: 'evt-1' },
    })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="error-message"]').text()).toContain('request failed: 400')
  })
})
