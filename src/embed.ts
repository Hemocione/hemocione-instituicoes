const EMBEDDED_KEY = 'hemocione_embedded'

// The app opens this site in an iframe with ?iframed=true. The router drops the
// query on navigation, so the flag is kept for the browser session.
export function detectEmbedded(win: Window = window): boolean {
  let inIframe: boolean
  try {
    inIframe = win.self !== win.top
  } catch {
    inIframe = true
  }
  const flagged = new URLSearchParams(win.location.search).get('iframed') === 'true'
  try {
    if (flagged) win.sessionStorage.setItem(EMBEDDED_KEY, '1')
    return inIframe || flagged || win.sessionStorage.getItem(EMBEDDED_KEY) === '1'
  } catch {
    return inIframe || flagged
  }
}

const embedded = typeof window === 'undefined' ? false : detectEmbedded()

// Embedded in the app: the app owns the session, so this site shows no logout.
export function isEmbedded(): boolean {
  return embedded
}
