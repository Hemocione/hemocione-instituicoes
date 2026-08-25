import { ref } from 'vue'

export type Institution = { id: string; name: string }

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
