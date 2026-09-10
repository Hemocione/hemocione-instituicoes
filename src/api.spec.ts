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

  it('preserves certification data from the institution object', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            institutionId: 'inst-1',
            role: 'admin',
            institution: { id: 'inst-1', name: 'Escola Real', isCertified: true },
          },
        ],
      })
    )

    const result = await idApi.myInstitutions()

    expect(result[0]).toMatchObject({ id: 'inst-1', name: 'Escola Real', isCertified: true })
  })
})

describe('idApi interest campaigns', () => {
  beforeEach(() => {
    token.value = 'test-token'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ campaigns: [] }),
      })
    )
  })

  it('creates an interest campaign with the institution payload', async () => {
    await idApi.createInterestCampaign('inst-1', {
      periodLabel: 'Março 2026',
      startDate: '2026-03-01',
      endDate: '2026-03-07',
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://id-api.test/institutions/inst-1/interest-campaigns',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          periodLabel: 'Março 2026',
          startDate: '2026-03-01',
          endDate: '2026-03-07',
        }),
      })
    )
  })

  it('loads the public campaign without an authorization header', async () => {
    await idApi.getPublicInterestCampaign('campaign-1')

    expect(fetch).toHaveBeenCalledWith(
      'https://id-api.test/interest-campaigns/campaign-1/public'
    )
  })
})
