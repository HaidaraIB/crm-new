/** Sentinel values that mean "no filter applied" for a field. */
const INACTIVE_SENTINELS = new Set(['', 'All', 'all']);

/**
 * Whether a single filter field value is considered active
 * (not empty and not the "All" sentinel).
 */
export function isFilterActive(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return !INACTIVE_SENTINELS.has(trimmed);
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

type FilterRecord = object;

/**
 * Count how many filter fields differ from their defaults / are active.
 * Prefer `defaults` when provided so empty strings and "All" stay inactive.
 */
export function countActiveFilters<T extends FilterRecord>(
  filters: T,
  defaults?: Partial<T>,
): number {
  return (Object.keys(filters) as Array<keyof T & string>).reduce((count, key) => {
    const value = (filters as Record<string, unknown>)[key];
    if (defaults && Object.prototype.hasOwnProperty.call(defaults, key)) {
      const def = (defaults as Record<string, unknown>)[key];
      if (value === def) return count;
      if (!isFilterActive(value) && !isFilterActive(def)) return count;
      return count + 1;
    }
    return count + (isFilterActive(value) ? 1 : 0);
  }, 0);
}

export function hasActiveFilters<T extends FilterRecord>(
  filters: T,
  defaults?: Partial<T>,
): boolean {
  return countActiveFilters(filters, defaults) > 0;
}

export function areFiltersEqual<T extends FilterRecord>(a: T, b: T): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) return false;
  }
  return true;
}
