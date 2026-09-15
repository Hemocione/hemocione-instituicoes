import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

type AuthModule = typeof import('./auth')

// The module reads ?token at import time, so each test boots a fresh copy of
// it against the URL it wants to simulate.
function bootAt(url: string) {
  window.history.replaceState(window.history.state, '', url)
  vi.resetModules()
  return import('./auth') as Promise<AuthModule>
}

describe('initAuth URL token handling', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('removes the token from the URL even when validation fails, and does not authenticate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const auth = await bootAt('/?token=rejected.jwt&campaign=1')
    await auth.initAuth()

    expect(window.location.search).toBe('?campaign=1')
    expect(auth.token.value).toBeNull()
    expect(localStorage.getItem('hemocione_token')).toBeNull()
  })

  it('removes the token from the URL when the validation request throws, and does not authenticate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const auth = await bootAt('/?token=unreachable.jwt')
    await auth.initAuth()

    expect(window.location.search).toBe('')
    expect(auth.token.value).toBeNull()
  })

  it('authenticates and leaves a clean URL when validation succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const auth = await bootAt('/?token=accepted.jwt')
    await auth.initAuth()

    expect(window.location.search).toBe('')
    expect(auth.token.value).toBe('accepted.jwt')
    expect(localStorage.getItem('hemocione_token')).toBe('accepted.jwt')
    expect(fetch).toHaveBeenCalledWith('https://id-api.test/users/validate-token', {
      headers: { Authorization: 'Bearer accepted.jwt' },
    })
  })

  // Regression: createWebHistory() snapshots window.location at creation and the
  // router replays that snapshot when installed, which used to put ?token back
  // in the address bar.
  it('keeps the token out of the URL after the router installs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    window.history.replaceState(window.history.state, '', '/?token=accepted.jwt')
    vi.resetModules()
    const { router } = await import('./router')
    const auth = await import('./auth')
    await auth.initAuth()

    const app = createApp({ render: () => null })
    app.use(router)
    await router.isReady()

    expect(window.location.search).toBe('')
  })
})
