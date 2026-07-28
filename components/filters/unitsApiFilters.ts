/**
 * Pick only unit filter fields the API accepts so React Query keys
 * do not refetch when client-only fields change.
 */
export function toUnitsApiFilters(filters?: Record<string, unknown> | null): {
  project?: string;
  bedrooms?: string;
} | undefined {
  if (!filters) return undefined;
  const api: { project?: string; bedrooms?: string } = {};
  const project = filters.project;
  if (project != null && String(project).trim() && String(project) !== 'All') {
    api.project = String(project);
  }
  const bedrooms = filters.bedrooms;
  if (bedrooms != null && String(bedrooms).trim() && String(bedrooms) !== 'All') {
    api.bedrooms = String(bedrooms);
  }
  return Object.keys(api).length ? api : undefined;
}
