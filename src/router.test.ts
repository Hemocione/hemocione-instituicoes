import { describe, it, expect } from 'vitest'
import { router } from './router'

describe('router — /instituicoes/nova', () => {
  it('registra a rota de criação de instituição', () => {
    const match = router.getRoutes().find((route) => route.path === '/instituicoes/nova')
    expect(match).toBeDefined()
  })

  it('não marca a rota como pública (exige autenticação)', () => {
    const match = router.getRoutes().find((route) => route.path === '/instituicoes/nova')
    expect(match?.meta.public).toBeFalsy()
  })
})
