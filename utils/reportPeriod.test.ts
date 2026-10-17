import { describe, expect, it } from 'vitest';
import { formatDuration, percentChange } from './reportFormat';
import {
  DEFAULT_REPORT_PERIOD,
  isValidCustomRange,
  periodFromSearch,
  periodToSearch,
  resolvePeriod,
  resolvePreset,
  todayInZone,
} from './reportPeriod';

// 2026-10-17 is a Saturday. 23:30 UTC is already Oct 18 in Baghdad (UTC+3).
const lateUtc = new Date('2026-10-17T23:30:00Z');

describe('company-timezone presets', () => {
  it('uses the company calendar day, not the browser or UTC day', () => {
    expect(todayInZone('UTC', lateUtc)).toBe('2026-10-17');
    expect(todayInZone('Asia/Baghdad', lateUtc)).toBe('2026-10-18');
  });

  it('resolves common presets', () => {
    const now = new Date('2026-10-17T12:00:00Z');
    expect(resolvePreset('today', 'UTC', now)).toEqual({ start: '2026-10-17', end: '2026-10-17' });
    expect(resolvePreset('yesterday', 'UTC', now)).toEqual({ start: '2026-10-16', end: '2026-10-16' });
    expect(resolvePreset('last7', 'UTC', now)).toEqual({ start: '2026-10-11', end: '2026-10-17' });
    expect(resolvePreset('last30', 'UTC', now)).toEqual({ start: '2026-09-18', end: '2026-10-17' });
    expect(resolvePreset('thisMonth', 'UTC', now)).toEqual({ start: '2026-10-01', end: '2026-10-17' });
    expect(resolvePreset('lastMonth', 'UTC', now)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(resolvePreset('thisQuarter', 'UTC', now)).toEqual({ start: '2026-10-01', end: '2026-10-17' });
    expect(resolvePreset('thisYear', 'UTC', now)).toEqual({ start: '2026-01-01', end: '2026-10-17' });
  });

  it('starts the week on Monday', () => {
    expect(resolvePreset('thisWeek', 'UTC', new Date('2026-10-17T12:00:00Z')).start).toBe('2026-10-12');
    expect(resolvePreset('thisWeek', 'UTC', new Date('2026-10-12T12:00:00Z')).start).toBe('2026-10-12');
  });

  it('crosses month and year boundaries', () => {
    const jan = new Date('2026-01-03T12:00:00Z');
    expect(resolvePreset('lastMonth', 'UTC', jan)).toEqual({ start: '2025-12-01', end: '2025-12-31' });
    expect(resolvePreset('last7', 'UTC', jan).start).toBe('2025-12-28');
  });

  it('falls back to UTC for an unknown timezone', () => {
    expect(todayInZone('Not/AZone', lateUtc)).toBe('2026-10-17');
  });
});

describe('custom ranges and the URL', () => {
  it('passes custom datetimes through untouched (the API reads them in company time)', () => {
    const period = { preset: 'custom' as const, start: '2026-10-01T14:00', end: '2026-10-15T09:30' };
    expect(resolvePeriod(period, 'Asia/Baghdad')).toEqual({ start: period.start, end: period.end });
  });

  it('validates ranges', () => {
    expect(isValidCustomRange('2026-10-01T14:00', '2026-10-15T09:30')).toBe(true);
    expect(isValidCustomRange('2026-10-15T09:30', '2026-10-01T14:00')).toBe(false);
    expect(isValidCustomRange('2026-10-01T14:00', '2026-10-01T14:00')).toBe(false);
    expect(isValidCustomRange('', '2026-10-01T14:00')).toBe(false);
    expect(isValidCustomRange('2020-01-01T00:00', '2026-10-01T00:00')).toBe(false); // over 2 years
  });

  it('round-trips presets and custom ranges, ignoring junk', () => {
    const preset = new URLSearchParams();
    periodToSearch({ preset: 'last7', start: '', end: '' }, preset);
    expect(periodFromSearch(preset)).toEqual({ preset: 'last7', start: '', end: '' });

    const custom = new URLSearchParams('preset=last7');
    periodToSearch({ preset: 'custom', start: '2026-10-01T14:00', end: '2026-10-15T09:30' }, custom);
    expect(custom.get('preset')).toBeNull();
    expect(periodFromSearch(custom)).toEqual({ preset: 'custom', start: '2026-10-01T14:00', end: '2026-10-15T09:30' });

    expect(periodFromSearch(new URLSearchParams('preset=bogus'))).toEqual(DEFAULT_REPORT_PERIOD);
    expect(periodFromSearch(new URLSearchParams('start=x&end=y'))).toEqual(DEFAULT_REPORT_PERIOD);
  });
});

describe('duration formatting', () => {
  const t = (key: string) => ({ reportUnitDay: 'd', reportUnitHour: 'h', reportUnitMinute: 'm', reportUnitSecond: 's' })[key] ?? key;

  it('formats across magnitudes', () => {
    expect(formatDuration(0, t)).toBe('0s');
    expect(formatDuration(45, t)).toBe('45s');
    expect(formatDuration(125, t)).toBe('2m 5s');
    expect(formatDuration(900, t)).toBe('15m');
    expect(formatDuration(3600, t)).toBe('1h');
    expect(formatDuration(3 * 3600 + 20 * 60, t)).toBe('3h 20m');
    expect(formatDuration(2 * 86400 + 5 * 3600, t)).toBe('2d 5h');
  });

  it('shows a dash when there is no value', () => {
    expect(formatDuration(null, t)).toBe('—');
    expect(formatDuration(undefined, t)).toBe('—');
    expect(formatDuration(Number.NaN, t)).toBe('—');
  });

  it('computes period-over-period change safely', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(null, 5)).toBeNull();
  });
});
