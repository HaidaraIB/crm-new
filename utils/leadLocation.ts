/** Build API body fields for optional lead map location (both or neither). */
export function buildLeadLocationApiBody(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined
): { location_latitude: number | null; location_longitude: number | null } {
  const latStr = latitude != null && String(latitude).trim() !== '' ? String(latitude).trim() : '';
  const lngStr = longitude != null && String(longitude).trim() !== '' ? String(longitude).trim() : '';
  if (!latStr && !lngStr) {
    return { location_latitude: null, location_longitude: null };
  }
  const latNum = Number(latStr);
  const lngNum = Number(lngStr);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return { location_latitude: null, location_longitude: null };
  }
  return { location_latitude: latNum, location_longitude: lngNum };
}

export const DEFAULT_MAP_CENTER = { lat: 33.3152, lng: 44.3661 } as const;

export function parseLeadCoordinate(
  value: string | number | null | undefined
): number | null {
  if (value == null || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}
