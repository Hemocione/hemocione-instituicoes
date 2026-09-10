import { token, logout, redirectToLogin } from './auth'
import type { Institution } from './institution'

export class ApiError extends Error {
  readonly status: number
  readonly path: string

  constructor(status: number, path: string) {
    super(`request failed: ${status} ${path}`)
    this.status = status
    this.path = path
    this.name = 'ApiError'
  }
}

async function authedFetch(baseUrl: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token.value}`,
    },
  })

  if (response.status === 401) {
    logout()
    redirectToLogin()
    throw new Error('unauthorized')
  }

  if (!response.ok) {
    throw new ApiError(response.status, path)
  }

  return response.json()
}

async function publicFetch(baseUrl: string, path: string) {
  const response = await fetch(`${baseUrl}${path}`)

  if (!response.ok) {
    throw new ApiError(response.status, path)
  }

  return response.json()
}

export type EventBranding = { banner?: string; logo?: string; address?: string }

export const coletaApi = {
  listCollectionRequests(institutionId: string, status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return authedFetch(
      import.meta.env.VITE_HEMOCIONE_COLETA_URL,
      `/api/v1/institutions/${institutionId}/collection-requests${query}`
    )
  },

  updateEventBranding(institutionId: string, requestId: string, branding: EventBranding) {
    return authedFetch(
      import.meta.env.VITE_HEMOCIONE_COLETA_URL,
      `/api/v1/institutions/${institutionId}/collection-requests/${requestId}/event-branding`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      }
    )
  },
}

type InstitutionMembership = {
  institutionId: string
  role: string
  institution: Institution
}

export type InterestCampaignPayload = {
  periodLabel: string
  startDate: string
  endDate: string
}

export type InterestCampaign = {
  id: string
  periodLabel: string
  startDate: string
  endDate: string
  status: string
  [key: string]: unknown
}

export type PublicInterestCampaign = {
  institutionName: string
  institutionLogoUrl?: string
  institutionBannerUrl?: string
  periodLabel: string
  questionText: string
  isAcceptingResponses: boolean
}

export const idApi = {
  async myInstitutions() {
    const memberships: InstitutionMembership[] = await authedFetch(
      import.meta.env.VITE_HEMOCIONE_ID_API_URL,
      '/users/me/institutions'
    )
    return memberships.map((membership) => ({
      ...membership.institution,
      id: membership.institution.id,
      name: membership.institution.name,
    }))
  },

  listInterestCampaigns(institutionId: string): Promise<InterestCampaign[]> {
    return authedFetch(
      import.meta.env.VITE_HEMOCIONE_ID_API_URL,
      `/institutions/${institutionId}/interest-campaigns`
    ).then((data: unknown) => {
      if (Array.isArray(data)) return data as InterestCampaign[]
      if (data && typeof data === 'object') {
        const container = data as Record<string, unknown>
        const campaigns = container.campaigns ?? container.items
        if (Array.isArray(campaigns)) return campaigns as InterestCampaign[]
      }
      return []
    })
  },

  createInterestCampaign(institutionId: string, payload: InterestCampaignPayload) {
    return authedFetch(
      import.meta.env.VITE_HEMOCIONE_ID_API_URL,
      `/institutions/${institutionId}/interest-campaigns`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
  },

  cancelInterestCampaign(institutionId: string, campaignId: string) {
    return authedFetch(
      import.meta.env.VITE_HEMOCIONE_ID_API_URL,
      `/institutions/${institutionId}/interest-campaigns/${campaignId}/cancel`,
      { method: 'PUT' }
    )
  },

  getPublicInterestCampaign(campaignId: string): Promise<PublicInterestCampaign> {
    return publicFetch(
      import.meta.env.VITE_HEMOCIONE_ID_API_URL,
      `/interest-campaigns/${campaignId}/public`
    )
  },

  respondToInterestCampaign(campaignId: string, daysAvailable: string[]) {
    return authedFetch(
      import.meta.env.VITE_HEMOCIONE_ID_API_URL,
      `/interest-campaigns/${campaignId}/respond`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysAvailable }),
      }
    )
  },
}

export const digitalEventApi = {
  listEvents(institutionId: string) {
    return authedFetch(
      import.meta.env.VITE_HEMOCIONE_DIGITAL_EVENT_URL,
      `/api/v1/event?institutionId=${encodeURIComponent(institutionId)}`
    )
  },
}
