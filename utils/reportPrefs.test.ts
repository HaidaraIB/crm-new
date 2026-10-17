import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// loadReportPrefs / saveReportPrefs only touch window.localStorage, so a tiny in-memory stand-in is enough.
function installStorage(initial: Record<string, string> = {}, failing = false) {
  const data = { ...initial };
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => {
        if (failing) throw new Error('blocked');
        return k in data ? data[k] : null;
      },
      setItem: (k: string, v: string) => {
        if (failing) throw new Error('blocked');
        data[k] = v;
      },
    },
  };
  return data;
}

const KEY = 'loop.reports.prefs.v1:7';

describe('report preferences', () => {
  let prefs: typeof import('./reportPrefsStore');
  beforeEach(async () => {
    prefs = await import('./reportPrefsStore');
  });
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('round-trips a saved view', () => {
    installStorage();
    prefs.saveReportPrefs(7, {
      tab: 'response-time',
      period: { preset: 'custom', start: '2026-09-29T00:00', end: '2026-10-10T18:00' },
      compare: true,
      filters: { userIds: [3], statusIds: [], sources: ['whatsapp'], campaignIds: [], channelIds: [], leadTypes: [] },
      basis: 'wall',
      employeeSort: 'touch_rate',
    });
    expect(prefs.loadReportPrefs(7)).toEqual({
      tab: 'response-time',
      period: { preset: 'custom', start: '2026-09-29T00:00', end: '2026-10-10T18:00' },
      compare: true,
      filters: { userIds: [3], statusIds: [], sources: ['whatsapp'], campaignIds: [], channelIds: [], leadTypes: [] },
      basis: 'wall',
      employeeSort: 'touch_rate',
    });
  });

  it('keeps each user separate', () => {
    installStorage();
    prefs.saveReportPrefs(7, { tab: 'calls' });
    prefs.saveReportPrefs(8, { tab: 'deals' });
    expect(prefs.loadReportPrefs(7).tab).toBe('calls');
    expect(prefs.loadReportPrefs(8).tab).toBe('deals');
  });

  it('merges a partial save instead of wiping the rest', () => {
    installStorage();
    prefs.saveReportPrefs(7, { tab: 'leads', basis: 'wall' });
    prefs.saveReportPrefs(7, { employeeSort: 'calls' });
    expect(prefs.loadReportPrefs(7)).toMatchObject({ tab: 'leads', basis: 'wall', employeeSort: 'calls' });
  });

  it('drops invalid stored values instead of trusting them', () => {
    installStorage({
      [KEY]: JSON.stringify({
        tab: 42,
        period: { preset: 'custom', start: '2026-10-10T00:00', end: '2026-10-01T00:00' }, // end before start
        compare: 'yes',
        filters: { userIds: ['a'], sources: [1], leadTypes: ['hot'] },
        basis: 'whenever',
      }),
    });
    const got = prefs.loadReportPrefs(7);
    expect(got.tab).toBeUndefined();
    expect(got.period).toBeUndefined();
    expect(got.compare).toBeUndefined();
    expect(got.basis).toBeUndefined();
    expect(got.filters).toEqual({ userIds: [], statusIds: [], sources: [], campaignIds: [], channelIds: [], leadTypes: ['hot'] });
  });

  it('survives corrupt JSON and unavailable storage without throwing', () => {
    installStorage({ [KEY]: '{not json' });
    expect(prefs.loadReportPrefs(7)).toEqual({});
    installStorage({}, true);
    expect(prefs.loadReportPrefs(7)).toEqual({});
    expect(() => prefs.saveReportPrefs(7, { tab: 'leads' })).not.toThrow();
  });
});
