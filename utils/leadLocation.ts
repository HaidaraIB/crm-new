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

export type ClientLocationEventTranslationKey =
  | 'leadLocationCleared'
  | 'leadLocationSet'
  | 'leadLocationUpdated';

/** Map API ClientEvent.notes keys to frontend i18n keys. */
export function clientLocationEventTranslationKey(
  notes?: string | null
): ClientLocationEventTranslationKey {
  switch (notes) {
    case 'lead_location_cleared':
      return 'leadLocationCleared';
    case 'lead_location_set':
      return 'leadLocationSet';
    default:
      return 'leadLocationUpdated';
  }
}

export function formatClientLocationPair(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const parts = value.split(',');
  if (parts.length !== 2) return null;
  const lat = Number.parseFloat(parts[0]);
  const lng = Number.parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function clientLocationMapsUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const parts = value.split(',');
  if (parts.length !== 2) return null;
  const lat = Number.parseFloat(parts[0]);
  const lng = Number.parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
