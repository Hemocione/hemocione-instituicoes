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

export const coletaApi = {
  listCollectionRequests(institutionId: string, status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return authedFetch(
      import.meta.env.VITE_HEMOCIONE_COLETA_URL,
      `/api/v1/institutions/${institutionId}/collection-requests${query}`
    )
  },
}

export const idApi = {
  myInstitutions() {
    return authedFetch(import.meta.env.VITE_HEMOCIONE_ID_API_URL, '/users/me/institutions')
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
