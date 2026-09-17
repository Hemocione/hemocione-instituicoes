import { describe, expect, it } from 'vitest'
import { pickFeaturedEvent, isEventOngoing, computeSubscriptionTrend } from './eventWindows'

const NOW = new Date('2026-09-16T12:00:00Z')

function event(overrides: Partial<{ _id: string; name: string; slug: string; startAt: string; endAt: string }>) {
  return {
    _id: 'e1',
    name: 'Evento',
    slug: 'evento',
    startAt: '2026-09-16T10:00:00Z',
    endAt: '2026-09-16T14:00:00Z',
    ...overrides,
  }
}

describe('isEventOngoing', () => {
  it('é true quando now está entre startAt e endAt', () => {
    expect(isEventOngoing(event({}), NOW)).toBe(true)
  })
  it('é false quando o evento já terminou', () => {
    expect(isEventOngoing(event({ endAt: '2026-09-16T11:00:00Z' }), NOW)).toBe(false)
  })
  it('é false quando o evento ainda não começou', () => {
    expect(isEventOngoing(event({ startAt: '2026-09-16T13:00:00Z' }), NOW)).toBe(false)
  })
})

describe('pickFeaturedEvent', () => {
  it('retorna null para lista vazia', () => {
    expect(pickFeaturedEvent([], NOW)).toBeNull()
  })

  it('prioriza um evento em andamento sobre um futuro', () => {
    const ongoing = event({ _id: 'ongoing' })
    const upcoming = event({ _id: 'upcoming', startAt: '2026-09-17T10:00:00Z', endAt: '2026-09-17T14:00:00Z' })
    expect(pickFeaturedEvent([upcoming, ongoing], NOW)?._id).toBe('ongoing')
  })

  it('entre dois em andamento, escolhe o de startAt mais antigo', () => {
    const a = event({ _id: 'a', startAt: '2026-09-16T09:00:00Z' })
    const b = event({ _id: 'b', startAt: '2026-09-16T11:00:00Z' })
    expect(pickFeaturedEvent([b, a], NOW)?._id).toBe('a')
  })

  it('sem evento em andamento, escolhe o futuro mais próximo', () => {
    const near = event({ _id: 'near', startAt: '2026-09-17T09:00:00Z', endAt: '2026-09-17T12:00:00Z' })
    const far = event({ _id: 'far', startAt: '2026-09-20T09:00:00Z', endAt: '2026-09-20T12:00:00Z' })
    expect(pickFeaturedEvent([far, near], NOW)?._id).toBe('near')
  })

  it('ignora eventos já encerrados quando não há nenhum em andamento nem futuro', () => {
    const past = event({ startAt: '2026-09-10T09:00:00Z', endAt: '2026-09-10T12:00:00Z' })
    expect(pickFeaturedEvent([past], NOW)).toBeNull()
  })
})

describe('computeSubscriptionTrend', () => {
  it('conta inscritos na última hora e na hora anterior', () => {
    const subscribers = [
      { createdAt: '2026-09-16T11:45:00Z' },
      { createdAt: '2026-09-16T11:50:00Z' },
      { createdAt: '2026-09-16T10:30:00Z' },
      { createdAt: '2026-09-16T08:00:00Z' },
    ]
    expect(computeSubscriptionTrend(subscribers, NOW)).toEqual({ lastHour: 2, previousHour: 1 })
  })

  it('retorna zeros quando não há inscritos nas janelas', () => {
    expect(computeSubscriptionTrend([], NOW)).toEqual({ lastHour: 0, previousHour: 0 })
  })
})
