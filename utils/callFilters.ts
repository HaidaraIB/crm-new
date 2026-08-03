import type { CallFilters } from '../types';

export const DEFAULT_CALL_FILTERS: CallFilters = {
  status: 'all',
  direction: 'All',
  agent: 'All',
  clientId: '',
  hasRecording: false,
  search: '',
};

const STATUS_TO_API: Record<string, string> = {
  all: '',
  ringing: 'ringing',
  answered: 'answered,ended',
  missed: 'missed',
  no_answer: 'no_answer',
  rejected: 'rejected',
};

export function callFiltersToApiParams(filters: CallFilters): {
  status?: string;
  direction?: string;
  my_calls?: boolean;
  has_recording?: boolean;
  search?: string;
  client?: number;
  agent?: number;
} {
  const status = STATUS_TO_API[filters.status] ?? '';
  const direction =
    filters.direction === 'inbound' || filters.direction === 'outbound'
      ? filters.direction
      : undefined;
  const search = filters.search.trim() || undefined;
  const clientId = filters.clientId.trim();
  const client = clientId && /^\d+$/.test(clientId) ? Number(clientId) : undefined;

  let my_calls: boolean | undefined;
  let agent: number | undefined;
  if (filters.agent === 'me') {
    my_calls = true;
  } else if (filters.agent !== 'All' && /^\d+$/.test(filters.agent)) {
    agent = Number(filters.agent);
  }

  return {
    ...(status ? { status } : {}),
    ...(direction ? { direction } : {}),
    ...(my_calls ? { my_calls: true } : {}),
    ...(filters.hasRecording ? { has_recording: true } : {}),
    ...(search ? { search } : {}),
    ...(client != null ? { client } : {}),
    ...(agent != null ? { agent } : {}),
  };
}

/** Params that affect sidebar status_counts (excludes status tab). */
export function callFiltersToCountParams(filters: CallFilters): Omit<
  ReturnType<typeof callFiltersToApiParams>,
  'status'
> {
  const { status: _status, ...rest } = callFiltersToApiParams({
    ...filters,
    status: 'all',
  });
  return rest;
}

/** Read Calls deep-link query into filter state (partial merge). */
export function callFiltersFromSearchParams(
  params: URLSearchParams,
  base: CallFilters = DEFAULT_CALL_FILTERS
): CallFilters {
  const next = { ...base };
  const status = (params.get('status') || '').trim().toLowerCase();
  if (status && (status in STATUS_TO_API || status === 'all')) {
    next.status = status === 'ended' ? 'answered' : status;
  }
  const direction = (params.get('direction') || '').trim().toLowerCase();
  if (direction === 'inbound' || direction === 'outbound') {
    next.direction = direction;
  }
  const agent = (params.get('agent') || '').trim();
  if (agent.toLowerCase() === 'me') {
    next.agent = 'me';
  } else if (/^\d+$/.test(agent)) {
    next.agent = agent;
  }
  const myCalls = (params.get('my_calls') || '').toLowerCase();
  if (myCalls === '1' || myCalls === 'true' || myCalls === 'yes') {
    next.agent = 'me';
  }
  const client = (params.get('client') || params.get('lead') || '').trim();
  if (/^\d+$/.test(client)) {
    next.clientId = client;
  }
  const recording = (params.get('recording') || params.get('has_recording') || '').toLowerCase();
  if (recording === '1' || recording === 'true' || recording === 'yes') {
    next.hasRecording = true;
  }
  const search = (params.get('search') || params.get('q') || '').trim();
  if (search) next.search = search;
  return next;
}

/** Build query object for goToPage / replaceState (omit defaults). */
export function callFiltersToQuery(filters: CallFilters): Record<string, string> {
  const q: Record<string, string> = {};
  if (filters.status && filters.status !== 'all') q.status = filters.status;
  if (filters.direction === 'inbound' || filters.direction === 'outbound') {
    q.direction = filters.direction;
  }
  if (filters.agent === 'me') q.my_calls = '1';
  else if (filters.agent !== 'All' && /^\d+$/.test(filters.agent)) q.agent = filters.agent;
  if (filters.clientId && /^\d+$/.test(filters.clientId)) q.client = filters.clientId;
  if (filters.hasRecording) q.recording = '1';
  if (filters.search.trim()) q.search = filters.search.trim();
  return q;
}

export function replaceCallsUrlQuery(filters: CallFilters): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  const q = callFiltersToQuery(filters);
  const qs = new URLSearchParams(q).toString();
  const next = qs ? `${path}?${qs}` : path;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === next) return;
  window.history.replaceState(window.history.state, '', next);
}
