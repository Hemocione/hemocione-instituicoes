export const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  counter_proposed: 'Contraproposta recebida',
  counter_proposal_declined: 'Contraproposta recusada',
  accepted: 'Aceito',
  awaiting_technical_visit: 'Aguardando visita técnica',
  technical_visit_confirmed: 'Visita técnica confirmada',
  scheduled: 'Agendado',
  rejected: 'Rejeitado',
  cancelled: 'Cancelado',
}

export const terminalStatuses = new Set([
  'scheduled',
  'rejected',
  'cancelled',
  'counter_proposal_declined',
])

export function statusLabel(status: string): string {
  return statusLabels[status] ?? status
}

export type StatusTone = 'success' | 'warn' | 'danger' | 'info' | 'neutral'

const statusTones: Record<string, StatusTone> = {
  pending: 'neutral',
  counter_proposed: 'warn',
  counter_proposal_declined: 'danger',
  accepted: 'info',
  awaiting_technical_visit: 'warn',
  technical_visit_confirmed: 'info',
  scheduled: 'success',
  rejected: 'danger',
  cancelled: 'danger',
}

export function statusTone(status: string): StatusTone {
  return statusTones[status] ?? 'neutral'
}
