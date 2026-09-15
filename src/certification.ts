import type { InterestCampaign } from './api'
import { institutionHasCertification, type Institution } from './institution'

export type CertificationStatus = 'certified' | 'in-progress' | 'unverified'

export function effectiveCampaignStatus(campaign: InterestCampaign) {
  const status = campaign.effectiveStatus
  return String(typeof status === 'string' ? status : campaign.status).toLowerCase()
}

export function getCertificationStatus(
  institution: Institution | null | undefined,
  campaigns: InterestCampaign[]
): CertificationStatus {
  if (institutionHasCertification(institution)) return 'certified'
  if (campaigns.some((campaign) => ['scheduled', 'active'].includes(effectiveCampaignStatus(campaign)))) {
    return 'in-progress'
  }
  return 'unverified'
}

export function certificationStatusLabel(status: CertificationStatus) {
  return status === 'certified'
    ? 'Selo concedido'
    : status === 'in-progress'
      ? 'Em processo de certificação'
      : 'Não verificado'
}

export function certificationStatusTone(status: CertificationStatus) {
  return status === 'certified' ? 'success' : status === 'in-progress' ? 'info' : 'neutral'
}
