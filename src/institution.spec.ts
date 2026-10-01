import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('setInstitutions', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('resets the active institution when the persisted id is not in the new list', async () => {
    localStorage.setItem('active_institution_id', 'stale-membership-row-id')
    const { institutions, activeInstitutionId, setInstitutions } = await import('./institution')

    setInstitutions([
      { id: 'inst-real-1', name: 'Escola Real' },
      { id: 'inst-real-2', name: 'Empresa Real' },
    ])

    expect(institutions.value).toHaveLength(2)
    expect(activeInstitutionId.value).toBe('inst-real-1')
  })

  it('keeps the persisted active institution when it is still in the new list', async () => {
    localStorage.setItem('active_institution_id', 'inst-real-2')
    const { activeInstitutionId, setInstitutions } = await import('./institution')

    setInstitutions([
      { id: 'inst-real-1', name: 'Escola Real' },
      { id: 'inst-real-2', name: 'Empresa Real' },
    ])

    expect(activeInstitutionId.value).toBe('inst-real-2')
  })
})

describe('active institution sync across tabs', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('updates the active institution when another tab changes it', async () => {
    localStorage.setItem('active_institution_id', 'inst-real-1')
    const { activeInstitutionId } = await import('./institution')

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'active_institution_id', newValue: 'inst-real-2' })
    )

    expect(activeInstitutionId.value).toBe('inst-real-2')
  })

  it('ignores storage events for other keys', async () => {
    localStorage.setItem('active_institution_id', 'inst-real-1')
    const { activeInstitutionId } = await import('./institution')

    window.dispatchEvent(new StorageEvent('storage', { key: 'other_key', newValue: 'x' }))

    expect(activeInstitutionId.value).toBe('inst-real-1')
  })
})
