import posthog from 'posthog-js'
import type { Router } from 'vue-router'

type AnalyticsProperties = Record<string, unknown>

let enabled = false

// Without VITE_POSTHOG_KEY (tests, local dev) every function here is a no-op.
export function initAnalytics(router: Router) {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
  })
  enabled = true

  router.afterEach((to) => {
    posthog.capture('$pageview', { $current_url: window.location.href, route_name: to.name })
  })
}

type TokenClaims = { id?: string; email?: string; givenName?: string }

// Reads the claims only to name the analytics person. The API validates the token, not this function.
function readTokenClaims(token: string): TokenClaims | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodeURIComponent(escape(json))) as TokenClaims
  } catch {
    return null
  }
}

export function identifyFromToken(token: string | null) {
  if (!enabled || !token) return
  const claims = readTokenClaims(token)
  if (!claims?.id) return
  posthog.identify(claims.id, { email: claims.email, name: claims.givenName })
}

export function resetAnalytics() {
  if (!enabled) return
  posthog.reset()
}

// beforeNavigation sends the event at once, because a full-page redirect drops the batch queue.
export function track(event: string, properties: AnalyticsProperties = {}, options: { beforeNavigation?: boolean } = {}) {
  if (!enabled) return
  posthog.capture(event, properties, options.beforeNavigation ? { send_instantly: true } : undefined)
}
