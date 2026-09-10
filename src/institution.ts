import { ref } from 'vue'

export type Institution = {
  id: string
  name: string
  [key: string]: unknown
}

export const institutions = ref<Institution[]>([])
export const activeInstitutionId = ref<string | null>(
  localStorage.getItem('active_institution_id')
)

export function setInstitutions(list: Institution[]) {
  institutions.value = list
  const stillValid = list.some((institution) => institution.id === activeInstitutionId.value)
  if (!stillValid) {
    if (list[0]) {
      setActiveInstitution(list[0].id)
    } else {
      activeInstitutionId.value = null
      localStorage.removeItem('active_institution_id')
    }
  }
}

export function setActiveInstitution(id: string) {
  activeInstitutionId.value = id
  localStorage.setItem('active_institution_id', id)
}

export function activeInstitution() {
  return institutions.value.find((i) => i.id === activeInstitutionId.value) ?? null
}

export function institutionHasCertification(institution: Institution | null | undefined): boolean {
  if (!institution) return false

  const statusValues = [institution.certificationStatus, institution.sealStatus]
  const certification = institution.certification
  const nestedCertification =
    certification && typeof certification === 'object' ? (certification as Record<string, unknown>) : null
  const nestedStatus = nestedCertification?.status ?? nestedCertification?.certificationStatus
  const normalizedStatuses = statusValues
    .concat(nestedStatus)
    .filter((status): status is string => typeof status === 'string')
    .map((status) => status.toLowerCase())

  return (
    institution.isCertified === true ||
    institution.certified === true ||
    institution.hasCertification === true ||
    institution.hasCertificationSeal === true ||
    certification === true ||
    nestedCertification?.isGranted === true ||
    nestedCertification?.granted === true ||
    normalizedStatuses.some((status) => ['granted', 'certified', 'approved', 'active'].includes(status))
  )
}
