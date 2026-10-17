/**
 * Report periods. Presets resolve to whole-day (date-only) bounds in the *company* timezone, which the
 * API reads as [00:00 start day, end of end day]. A custom period carries `YYYY-MM-DDTHH:mm` values that
 * the API also reads in the company timezone, so the browser's own timezone never leaks into a report.
 */

export type PeriodPreset =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'thisYear';

export const PERIOD_PRESETS: PeriodPreset[] = [
  'today',
  'yesterday',
  'thisWeek',
  'last7',
  'last30',
  'thisMonth',
  'lastMonth',
  'thisQuarter',
  'thisYear',
];

export type ReportPeriod = {
  preset: PeriodPreset | 'custom';
  /** Only meaningful when preset === 'custom'; `YYYY-MM-DDTHH:mm` (company-local). */
  start: string;
  end: string;
};

export const DEFAULT_REPORT_PERIOD: ReportPeriod = { preset: 'last30', start: '', end: '' };

const pad = (n: number) => String(n).padStart(2, '0');
const toYmd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const fromYmd = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const addDays = (ymd: string, n: number) => {
  const d = fromYmd(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return toYmd(d);
};

export function safeTimeZone(tz?: string | null): string {
  const name = (tz || 'UTC').trim() || 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: name });
    return name;
  } catch {
    return 'UTC';
  }
}

/** Calendar date (YYYY-MM-DD) of `now` in the given IANA zone. */
export function todayInZone(tz: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTimeZone(tz),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function resolvePreset(preset: PeriodPreset, tz: string, now: Date = new Date()): { start: string; end: string } {
  const today = todayInZone(tz, now);
  const d = fromYmd(today);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday': {
      const y = addDays(today, -1);
      return { start: y, end: y };
    }
    case 'thisWeek': {
      const mondayOffset = (d.getUTCDay() + 6) % 7;
      return { start: addDays(today, -mondayOffset), end: today };
    }
    case 'last7':
      return { start: addDays(today, -6), end: today };
    case 'last30':
      return { start: addDays(today, -29), end: today };
    case 'thisMonth':
      return { start: toYmd(new Date(Date.UTC(year, month, 1))), end: today };
    case 'lastMonth':
      return {
        start: toYmd(new Date(Date.UTC(year, month - 1, 1))),
        end: toYmd(new Date(Date.UTC(year, month, 0))),
      };
    case 'thisQuarter':
      return { start: toYmd(new Date(Date.UTC(year, Math.floor(month / 3) * 3, 1))), end: today };
    case 'thisYear':
      return { start: toYmd(new Date(Date.UTC(year, 0, 1))), end: today };
  }
}

export function resolvePeriod(period: ReportPeriod, tz: string, now?: Date): { start: string; end: string } {
  if (period.preset === 'custom') return { start: period.start, end: period.end };
  return resolvePreset(period.preset, tz, now);
}

/** `datetime-local` value for the start/end of a day, to seed the custom pickers from a preset. */
export function toDatetimeLocal(ymd: string, endOfDay: boolean): string {
  return ymd.length > 10 ? ymd : `${ymd}T${endOfDay ? '23:59' : '00:00'}`;
}

export function isValidCustomRange(start: string, end: string): boolean {
  if (!start || !end) return false;
  const s = Date.parse(start);
  const e = Date.parse(end);
  return Number.isFinite(s) && Number.isFinite(e) && e > s && e - s <= 2 * 366 * 86400_000;
}

export function periodFromSearch(search: URLSearchParams): ReportPeriod {
  const preset = search.get('preset');
  if (preset && (PERIOD_PRESETS as string[]).includes(preset)) {
    return { preset: preset as PeriodPreset, start: '', end: '' };
  }
  const start = search.get('start') || '';
  const end = search.get('end') || '';
  if (isValidCustomRange(start, end)) return { preset: 'custom', start, end };
  return DEFAULT_REPORT_PERIOD;
}

export function periodToSearch(period: ReportPeriod, into: URLSearchParams): void {
  into.delete('preset');
  into.delete('start');
  into.delete('end');
  if (period.preset === 'custom') {
    into.set('start', period.start);
    into.set('end', period.end);
  } else {
    into.set('preset', period.preset);
  }
}
