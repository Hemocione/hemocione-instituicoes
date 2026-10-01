import type { LocationQuery, RouteLocationRaw, RouteParamsGeneric, RouteRecordNameGeneric } from 'vue-router'
import type { Institution } from './institution'

type CurrentRoute = {
  name?: RouteRecordNameGeneric | null
  params: RouteParamsGeneric
  query: LocationQuery
}

export function routeAfterInstitutionSwitch(
  route: CurrentRoute,
  institutionId: string | null,
  institutions: Institution[]
): RouteLocationRaw | null {
  if (!institutionId) return null

  // A request belongs to one institution, so its detail page has no equivalent in the new one.
  if (route.name === 'request-detail') return { name: 'dashboard' }

  const routeInstitutionId = route.params.institutionId
  if (typeof routeInstitutionId !== 'string' || routeInstitutionId === institutionId) return null

  if (route.name === 'members') {
    const role = institutions.find((institution) => institution.id === institutionId)?.role
    if (role !== 'admin') return { name: 'dashboard' }
  }

  return {
    name: route.name ?? undefined,
    params: { ...route.params, institutionId },
    query: route.query,
  } as RouteLocationRaw
}
