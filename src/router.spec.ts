import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isAuthenticated, redirectToLogin } from './auth'
import { router } from './router'

vi.mock('./auth', () => ({
  isAuthenticated: vi.fn(),
  redirectToLogin: vi.fn(),
}))

describe('router authentication boundary', () => {
  beforeEach(async () => {
    vi.mocked(isAuthenticated).mockReturnValue(false)
    vi.mocked(redirectToLogin).mockReset()
    await router.push('/interesse/campaign-1')
  })

  it('allows the public campaign route without authentication', () => {
    expect(router.currentRoute.value.fullPath).toBe('/interesse/campaign-1')
    expect(redirectToLogin).not.toHaveBeenCalled()
  })

  it('keeps authenticated routes protected', async () => {
    await router.push('/')

    expect(redirectToLogin).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.fullPath).toBe('/interesse/campaign-1')
  })
})
