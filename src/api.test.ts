import { describe, it, expect, vi, beforeEach } from 'vitest'
import { idApi } from './api'
import { setToken } from './auth'

describe('idApi.createInstitution', () => {
  beforeEach(() => {
    setToken('fake-token')
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ message: 'ok', institution: { id: 'inst-1', name: 'Empresa X' } }),
        })
      )
    )
  })

  it('envia POST para /institutions com o payload completo', async () => {
    await idApi.createInstitution({
      name: 'Empresa X',
      document: '11222333000181',
      kind: 'company',
      address: 'Rua A, 1',
      phone: '21999999999',
      city: 'Rio de Janeiro',
      state: 'RJ',
      createdVia: 'self_service_instituicoes',
      website: '',
    })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/institutions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    )
    const body = JSON.parse((fetch as any).mock.calls[0][1].body)
    expect(body.createdVia).toBe('self_service_instituicoes')
  })

  it('retorna o institution criado', async () => {
    const result = await idApi.createInstitution({
      name: 'Empresa X',
      document: '11222333000181',
      kind: 'company',
      address: 'Rua A, 1',
      phone: '21999999999',
      city: 'Rio de Janeiro',
      state: 'RJ',
      createdVia: 'self_service_instituicoes',
    })

    expect(result.institution).toEqual({ id: 'inst-1', name: 'Empresa X' })
  })
})
