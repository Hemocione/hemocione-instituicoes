import { beforeEach, describe, expect, it } from 'vitest'
import { detectEmbedded } from './embed'

function fakeWindow(search: string, inIframe: boolean) {
  const self = {} as Window
  return {
    self,
    top: inIframe ? ({} as Window) : self,
    location: { search } as Location,
    sessionStorage: window.sessionStorage,
  } as unknown as Window
}

describe('detectEmbedded', () => {
  beforeEach(() => sessionStorage.clear())

  it('é embutido dentro de um iframe', () => {
    expect(detectEmbedded(fakeWindow('', true))).toBe(true)
  })

  it('é embutido com ?iframed=true e lembra disso na navegação', () => {
    expect(detectEmbedded(fakeWindow('?iframed=true', false))).toBe(true)
    expect(detectEmbedded(fakeWindow('', false))).toBe(true)
  })

  it('não é embutido no acesso direto', () => {
    expect(detectEmbedded(fakeWindow('', false))).toBe(false)
  })
})
