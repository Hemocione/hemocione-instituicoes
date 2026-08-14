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
