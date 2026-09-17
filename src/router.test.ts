import { describe, it, expect, vi } from 'vitest'
import { router } from './router'

vi.mock('./auth', async () => {
  const actual = await vi.importActual<typeof import('./auth')>('./auth')
  return { ...actual, isAuthenticated: () => true }
})

describe('router — /instituicoes/nova', () => {
  it('registra a rota de criação de instituição', () => {
    const match = router.getRoutes().find((route) => route.path === '/instituicoes/nova')
    expect(match).toBeDefined()
  })

  it('não marca a rota como pública (exige autenticação)', () => {
    const match = router.getRoutes().find((route) => route.path === '/instituicoes/nova')
    expect(match?.meta.public).toBeFalsy()
  })

  it('redireciona /eventos para a home', async () => {
    await router.push('/eventos')

    expect(router.currentRoute.value.fullPath).toBe('/')
  })
})
