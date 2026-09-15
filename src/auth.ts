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

// extraQuery travels as part of the redirect URL through the cross-origin login
// handoff (e.g. resume_days), where in-memory state would not survive.
export function redirectToLogin(extraQuery?: Record<string, string>) {
  const target =
    extraQuery && Object.keys(extraQuery).length
      ? `${window.location.pathname}?${new URLSearchParams(extraQuery).toString()}`
      : window.location.pathname
  const redirectUrl = encodeURIComponent(`${window.location.origin}${target}`)
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

// Removes ?token from the address bar before validation starts: the token must
// not stay in the URL/history when validation fails either.
// This also runs before the router is created — createWebHistory() snapshots
// window.location and the router replays that snapshot on install, which would
// put ?token back. router.ts imports this module, so this code runs before
// createWebHistory().
function consumeTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const candidate = params.get('token')
  if (!candidate) return null

  params.delete('token')
  const query = params.toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  )
  return candidate
}

const tokenFromUrl = consumeTokenFromUrl()

export async function initAuth(): Promise<void> {
  if (tokenFromUrl) {
    const valid = await validateToken(tokenFromUrl)
    if (valid) {
      setToken(tokenFromUrl)
      return
    }
  }

  if (token.value) {
    const valid = await validateToken(token.value)
    if (!valid) logout()
  }
}
