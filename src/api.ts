import { token, logout, redirectToLogin } from './auth'

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
    throw new Error(`request failed: ${response.status} ${path}`)
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
  institution: { id: string; name: string }
}

export const idApi = {
  async myInstitutions() {
    const memberships: InstitutionMembership[] = await authedFetch(
      import.meta.env.VITE_HEMOCIONE_ID_API_URL,
      '/users/me/institutions'
    )
    return memberships.map((membership) => ({
      id: membership.institution.id,
      name: membership.institution.name,
    }))
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
