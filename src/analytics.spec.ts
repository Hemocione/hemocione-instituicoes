import { beforeEach, describe, expect, it, vi } from 'vitest'

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('posthog-js', () => ({ default: posthogMock }))

function fakeToken(claims: Record<string, unknown>) {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.signature`
}

const router = { afterEach: vi.fn() } as never

describe('analytics', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    Object.values(posthogMock).forEach((fn) => fn.mockReset())
    ;(router as { afterEach: ReturnType<typeof vi.fn> }).afterEach.mockReset()
  })

  it('does nothing without a PostHog key', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '')
    const analytics = await import('./analytics')

    analytics.initAnalytics(router)
    analytics.track('interest_page_viewed')
    analytics.identifyFromToken(fakeToken({ id: 'user-1' }))

    expect(posthogMock.init).not.toHaveBeenCalled()
    expect(posthogMock.capture).not.toHaveBeenCalled()
    expect(posthogMock.identify).not.toHaveBeenCalled()
  })

  it('initializes PostHog and captures events when a key is set', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test')
    const analytics = await import('./analytics')

    analytics.initAnalytics(router)
    analytics.track('interest_page_viewed', { campaign_id: 'c-1' })

    expect(posthogMock.init).toHaveBeenCalledWith('phc_test', expect.objectContaining({ capture_pageview: false, api_host: 'https://hemohog.guima.workers.dev' }))
    expect(posthogMock.capture).toHaveBeenCalledWith('interest_page_viewed', { campaign_id: 'c-1' }, undefined)
  })

  it('sends the event at once before a full-page navigation', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test')
    const analytics = await import('./analytics')
    analytics.initAnalytics(router)

    analytics.track('interest_login_redirected', {}, { beforeNavigation: true })

    expect(posthogMock.capture).toHaveBeenCalledWith('interest_login_redirected', {}, { send_instantly: true })
  })

  it('identifies the person with id, email and name from the token, and nothing else', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test')
    const analytics = await import('./analytics')
    analytics.initAnalytics(router)

    analytics.identifyFromToken(
      fakeToken({ id: 'user-1', email: 'doadora@test.com', givenName: 'Ana', document: '12345678900', phone: '+5521' })
    )

    expect(posthogMock.identify).toHaveBeenCalledWith('user-1', { email: 'doadora@test.com', name: 'Ana' })
  })

  it('ignores a malformed token', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test')
    const analytics = await import('./analytics')
    analytics.initAnalytics(router)

    analytics.identifyFromToken('not-a-jwt')

    expect(posthogMock.identify).not.toHaveBeenCalled()
  })
})
