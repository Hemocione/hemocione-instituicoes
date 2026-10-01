import { describe, expect, it } from 'vitest'
import { routeAfterInstitutionSwitch } from './institutionRouting'

const institutions = [
  { id: 'inst-a', name: 'A', role: 'admin' },
  { id: 'inst-b', name: 'B', role: 'staff' },
  { id: 'inst-c', name: 'C', role: 'admin' },
]

function route(name: string, params: Record<string, string> = {}, query = {}) {
  return { name, params, query }
}

describe('routeAfterInstitutionSwitch', () => {
  it('swaps the institution id in institution-scoped routes', () => {
    expect(routeAfterInstitutionSwitch(route('certification', { institutionId: 'inst-a' }), 'inst-b', institutions)).toEqual({
      name: 'certification',
      params: { institutionId: 'inst-b' },
      query: {},
    })
  })

  it('keeps the route when the url already matches the new institution', () => {
    expect(routeAfterInstitutionSwitch(route('certification', { institutionId: 'inst-b' }), 'inst-b', institutions)).toBeNull()
  })

  it('sends a request detail back to the dashboard, because the request belongs to the old institution', () => {
    expect(routeAfterInstitutionSwitch(route('request-detail', { id: 'req-1' }), 'inst-b', institutions)).toEqual({ name: 'dashboard' })
  })

  it('sends members to the dashboard when the new institution role is not admin', () => {
    expect(routeAfterInstitutionSwitch(route('members', { institutionId: 'inst-a' }), 'inst-b', institutions)).toEqual({ name: 'dashboard' })
  })

  it('keeps members when the new institution role is admin', () => {
    expect(routeAfterInstitutionSwitch(route('members', { institutionId: 'inst-a' }), 'inst-c', institutions)).toEqual({
      name: 'members',
      params: { institutionId: 'inst-c' },
      query: {},
    })
  })

  it('keeps routes without institution context', () => {
    expect(routeAfterInstitutionSwitch(route('dashboard'), 'inst-b', institutions)).toBeNull()
  })

  it('does nothing when there is no new institution', () => {
    expect(routeAfterInstitutionSwitch(route('certification', { institutionId: 'inst-a' }), null, institutions)).toBeNull()
  })
})
