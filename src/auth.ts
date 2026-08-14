import { ref } from 'vue'
import { config } from './config'

const TOKEN_KEY = 'hemocione_token'

export const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))

export function isAuthenticated() {
  return !!token.value
}

export function setToken(value: string) {
  token.value = value
  localStorage.setItem(TOKEN_KEY, value)
}

export function logout() {
  token.value = null
  localStorage.removeItem(TOKEN_KEY)
}

export function redirectToLogin() {
  const redirectUrl = encodeURIComponent(window.location.href.split('?')[0])
  window.location.href = `${config.hemocioneIdUrl}?redirect=${redirectUrl}`
}

export async function validateToken(candidate: string): Promise<boolean> {
  try {
    const response = await fetch(`${config.hemocioneIdApiUrl}/users/validate-token`, {
      headers: { Authorization: `Bearer ${candidate}` },
    })
    return response.ok
  } catch {
    return false
  }
}

export async function initAuth(): Promise<void> {
  const params = new URLSearchParams(window.location.search)
  const tokenFromQuery = params.get('token')

  if (tokenFromQuery) {
    const valid = await validateToken(tokenFromQuery)
    if (valid) {
      setToken(tokenFromQuery)
      params.delete('token')
      const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
      window.history.replaceState({}, '', cleanUrl)
      return
    }
  }

  if (token.value) {
    const valid = await validateToken(token.value)
    if (!valid) logout()
  }
}
