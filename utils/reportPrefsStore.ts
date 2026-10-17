import type { ReportFilters } from '../types';
import { DEFAULT_REPORT_FILTERS } from './reportFilters';
import { PERIOD_PRESETS, isValidCustomRange, type ReportPeriod } from './reportPeriod';

/**
 * Per-user, per-browser memory of how someone last used Reports (tab, period, compare, filters and a
 * couple of view toggles). It is a convenience, never the source of truth: everything is validated on
 * read, storage failures (private mode, blocked storage) are swallowed, and a shared link with explicit
 * tab/period parameters always wins over it.
 */
export type ReportPrefs = {
  tab?: string;
  period?: ReportPeriod;
  compare?: boolean;
  filters?: ReportFilters;
  basis?: 'business' | 'wall';
  employeeSort?: string;
};

const storageKey = (userId: number | string | undefined) => `loop.reports.prefs.v1:${userId ?? 'anon'}`;

const isNumberList = (v: unknown): v is number[] => Array.isArray(v) && v.every((x) => typeof x === 'number');
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

function sanitizeFilters(v: any): ReportFilters | undefined {
  if (!v || typeof v !== 'object') return undefined;
  return {
    userIds: isNumberList(v.userIds) ? v.userIds : DEFAULT_REPORT_FILTERS.userIds,
    statusIds: isNumberList(v.statusIds) ? v.statusIds : DEFAULT_REPORT_FILTERS.statusIds,
    sources: isStringList(v.sources) ? v.sources : DEFAULT_REPORT_FILTERS.sources,
    campaignIds: isNumberList(v.campaignIds) ? v.campaignIds : DEFAULT_REPORT_FILTERS.campaignIds,
    channelIds: isNumberList(v.channelIds) ? v.channelIds : DEFAULT_REPORT_FILTERS.channelIds,
    leadTypes: isStringList(v.leadTypes) ? v.leadTypes : DEFAULT_REPORT_FILTERS.leadTypes,
  };
}

function sanitizePeriod(v: any): ReportPeriod | undefined {
  if (!v || typeof v !== 'object') return undefined;
  if (v.preset === 'custom') {
    return isValidCustomRange(v.start, v.end) ? { preset: 'custom', start: v.start, end: v.end } : undefined;
  }
  return (PERIOD_PRESETS as string[]).includes(v.preset) ? { preset: v.preset, start: '', end: '' } : undefined;
}

export function loadReportPrefs(userId: number | string | undefined): ReportPrefs {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const v = JSON.parse(raw);
    return {
      tab: typeof v.tab === 'string' ? v.tab : undefined,
      period: sanitizePeriod(v.period),
      compare: typeof v.compare === 'boolean' ? v.compare : undefined,
      filters: sanitizeFilters(v.filters),
      basis: v.basis === 'business' || v.basis === 'wall' ? v.basis : undefined,
      employeeSort: typeof v.employeeSort === 'string' ? v.employeeSort : undefined,
    };
  } catch {
    return {};
  }
}

export function saveReportPrefs(userId: number | string | undefined, patch: Partial<ReportPrefs>): void {
  try {
    const next = { ...loadReportPrefs(userId), ...patch };
    window.localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    /* storage unavailable: the page simply won't remember */
  }
}
