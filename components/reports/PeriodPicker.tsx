import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { dashboardSurface } from '../dashboard/dashboardStyles';
import type { TKey } from '../../utils/reportLabels';
import {
  PERIOD_PRESETS,
  type PeriodPreset,
  type ReportPeriod,
  isValidCustomRange,
  resolvePeriod,
  toDatetimeLocal,
} from '../../utils/reportPeriod';

const PRESET_KEYS: Record<PeriodPreset, TKey> = {
  today: 'today',
  yesterday: 'yesterday',
  thisWeek: 'thisWeek',
  last7: 'last7Days',
  last30: 'last30Days',
  thisMonth: 'thisMonth',
  lastMonth: 'reportLastMonth',
  thisQuarter: 'reportThisQuarter',
  thisYear: 'reportThisYear',
};

/** Format a company-local `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` string without involving the browser timezone. */
export function formatLocalMoment(value: string, locale: string): string {
  const hasTime = value.length > 10;
  const d = new Date(`${value}${hasTime ? '' : 'T00:00'}:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(locale, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(hasTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

type Props = {
  period: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
  compare: boolean;
  onCompareChange: (compare: boolean) => void;
  timeZone: string;
};

export const PeriodPicker = ({ period, onChange, compare, onCompareChange, timeZone }: Props) => {
  const { t, language } = useAppContext();
  const locale = language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
  const resolved = useMemo(() => resolvePeriod(period, timeZone), [period, timeZone]);

  const [customOpen, setCustomOpen] = useState(period.preset === 'custom');
  const [draftStart, setDraftStart] = useState(toDatetimeLocal(resolved.start, false));
  const [draftEnd, setDraftEnd] = useState(toDatetimeLocal(resolved.end, true));
  const [error, setError] = useState(false);

  // Keep the custom inputs in step with the active period (preset chips, URL changes).
  useEffect(() => {
    setDraftStart(toDatetimeLocal(resolved.start, false));
    setDraftEnd(toDatetimeLocal(resolved.end, true));
    setError(false);
  }, [resolved.start, resolved.end]);

  const applyCustom = () => {
    if (!isValidCustomRange(draftStart, draftEnd)) {
      setError(true);
      return;
    }
    setError(false);
    onChange({ preset: 'custom', start: draftStart, end: draftEnd });
  };

  const chip = (active: boolean) =>
    `h-9 rounded-full px-3.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-primary-600 text-white shadow-sm'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
    }`;

  const fieldCls =
    'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

  return (
    <div className={`${dashboardSurface} p-4 sm:p-5 space-y-3`}>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('reportPeriod')}>
        {PERIOD_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={chip(period.preset === p)}
            aria-pressed={period.preset === p}
            onClick={() => {
              setCustomOpen(false);
              onChange({ preset: p, start: '', end: '' });
            }}
          >
            {t(PRESET_KEYS[p])}
          </button>
        ))}
        <button
          type="button"
          className={chip(period.preset === 'custom' || customOpen)}
          aria-pressed={period.preset === 'custom'}
          aria-expanded={customOpen}
          onClick={() => setCustomOpen((v) => !v)}
        >
          {t('reportCustomRange')}
        </button>
      </div>

      {customOpen ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('reportStartDateTime')}
            <input
              type="datetime-local"
              className={`${fieldCls} mt-1`}
              value={draftStart}
              max={draftEnd || undefined}
              onChange={(e) => setDraftStart(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('reportEndDateTime')}
            <input
              type="datetime-local"
              className={`${fieldCls} mt-1`}
              value={draftEnd}
              min={draftStart || undefined}
              onChange={(e) => setDraftEnd(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={applyCustom}
            className="h-10 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {t('apply')}
          </button>
          {error ? (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400 sm:col-span-3">
              {t('reportInvalidRange')}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-700/70">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold tabular-nums">
            <bdi>{formatLocalMoment(resolved.start, locale)}</bdi> – <bdi>{formatLocalMoment(resolved.end, locale)}</bdi>
          </span>
          <bdi className="text-xs text-gray-400" dir="ltr">
            {timeZone}
          </bdi>
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            checked={compare}
            onChange={(e) => onCompareChange(e.target.checked)}
          />
          {t('reportComparePrevious')}
        </label>
      </div>
    </div>
  );
};
