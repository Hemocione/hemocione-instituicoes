import { describe, it, expect, beforeEach, vi } from 'vitest'
import { coletaApi, idApi } from './api'
import { token } from './auth'

describe('coletaApi.updateEventBranding', () => {
  beforeEach(() => {
    token.value = 'test-token'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
    )
  })

  it('sends a PUT with the branding payload to the event-branding endpoint', async () => {
    await coletaApi.updateEventBranding('inst-1', 'req-1', {
      banner: 'https://cdn.test/banner.png',
      logo: 'https://cdn.test/logo.png',
      address: 'Rua Teste, 123',
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://coleta.test/api/v1/institutions/inst-1/collection-requests/req-1/event-branding',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          banner: 'https://cdn.test/banner.png',
          logo: 'https://cdn.test/logo.png',
          address: 'Rua Teste, 123',
        }),
      })
    )
  })
})

describe('idApi.myInstitutions', () => {
  beforeEach(() => {
    token.value = 'test-token'
  })

  it('maps membership records to {id, name} using the nested institution, not the membership row id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: 'membership-row-1',
            institutionId: 'inst-real-1',
            role: 'admin',
            institution: { id: 'inst-real-1', name: 'Escola Real' },
          },
          {
            id: 'membership-row-2',
            institutionId: 'inst-real-2',
            role: 'staff',
            institution: { id: 'inst-real-2', name: 'Empresa Real' },
          },
        ],
      })
    )

    const result = await idApi.myInstitutions()

    expect(result).toEqual([
      { id: 'inst-real-1', name: 'Escola Real' },
      { id: 'inst-real-2', name: 'Empresa Real' },
    ])
  })
})
