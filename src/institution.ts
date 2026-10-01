import { ref } from 'vue'

export type Institution = {
  id: string
  name: string
  kind?: 'school' | 'university' | 'company'
  role?: string
  logo?: string
  banner?: string
  [key: string]: unknown
}

export const institutions = ref<Institution[]>([])
const ACTIVE_INSTITUTION_KEY = 'active_institution_id'

export const activeInstitutionId = ref<string | null>(
  localStorage.getItem(ACTIVE_INSTITUTION_KEY)
)

// Another tab switched the institution: follow it, so every open tab shows the same context.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== ACTIVE_INSTITUTION_KEY) return
    activeInstitutionId.value = event.newValue
  })
}

export function setInstitutions(list: Institution[]) {
  institutions.value = list
  const stillValid = list.some((institution) => institution.id === activeInstitutionId.value)
  if (!stillValid) {
    if (list[0]) {
      setActiveInstitution(list[0].id)
    } else {
      activeInstitutionId.value = null
      localStorage.removeItem(ACTIVE_INSTITUTION_KEY)
    }
  }
}

export function setActiveInstitution(id: string) {
  activeInstitutionId.value = id
  localStorage.setItem(ACTIVE_INSTITUTION_KEY, id)
}

export function activeInstitution() {
  return institutions.value.find((i) => i.id === activeInstitutionId.value) ?? null
}

export function institutionHasCertification(institution: Institution | null | undefined): boolean {
  if (!institution) return false

  return institution.hasCollectionBadge === true || institution.certificationStatus === 'certified'
}
