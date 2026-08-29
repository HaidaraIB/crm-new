import type { ArrivalFilters, LeadArrival } from '../types';

export const DEFAULT_ARRIVAL_FILTERS: ArrivalFilters = {
  status: 'all',
  date: '',
  mine: false,
  search: '',
};

/** Fields the drawer owns. `status` (toolbar chips) and `search` (search bar) are
 * visible on the page already, so neither may light up the drawer's active dot. */
export const DEFAULT_ARRIVAL_DRAWER_FILTERS: Pick<ArrivalFilters, 'date' | 'mine'> = {
  date: '',
  mine: false,
};

/**
 * Query params `/lead-arrivals/` understands. `search` is filtered client-side and is
 * deliberately excluded so it never lands in a React Query key the API ignores.
 */
export function arrivalFiltersToApiParams(filters: ArrivalFilters): {
  status?: 'waiting' | 'acknowledged' | 'escalated';
  date?: string;
  mine?: boolean;
} {
  return {
    ...(filters.status !== 'all' ? { status: filters.status } : {}),
    ...(filters.date ? { date: filters.date } : {}),
    ...(filters.mine ? { mine: true } : {}),
  };
}

/** Digits-only comparison for phones so "0770 123" still matches "+964770123…". */
export function matchesArrivalSearch(arrival: LeadArrival, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  if ((arrival.client_name || '').toLowerCase().includes(query)) return true;
  const phone = arrival.client_phone || '';
  if (phone.toLowerCase().includes(query)) return true;
  const queryDigits = query.replace(/\D/g, '');
  if (!queryDigits) return false;
  return phone.replace(/\D/g, '').includes(queryDigits);
}
