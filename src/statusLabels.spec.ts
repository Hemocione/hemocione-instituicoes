import { describe, it, expect } from 'vitest'
import { statusTone } from './statusLabels'

describe('statusTone', () => {
  it('maps terminal-positive status to success', () => {
    expect(statusTone('scheduled')).toBe('success')
  })

  it('maps terminal-negative statuses to danger', () => {
    expect(statusTone('rejected')).toBe('danger')
    expect(statusTone('cancelled')).toBe('danger')
    expect(statusTone('counter_proposal_declined')).toBe('danger')
  })

  it('maps the initial pending status to neutral', () => {
    expect(statusTone('pending')).toBe('neutral')
  })

  it('maps action-required statuses to warn', () => {
    expect(statusTone('counter_proposed')).toBe('warn')
    expect(statusTone('awaiting_technical_visit')).toBe('warn')
  })

  it('maps in-progress statuses to info', () => {
    expect(statusTone('accepted')).toBe('info')
    expect(statusTone('technical_visit_confirmed')).toBe('info')
  })

  it('falls back to neutral for unknown statuses', () => {
    expect(statusTone('something_unmapped')).toBe('neutral')
  })

  it('falls back to neutral for inherited Object.prototype properties', () => {
    expect(statusTone('toString')).toBe('neutral')
    expect(statusTone('__proto__')).toBe('neutral')
  })
})
