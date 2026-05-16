import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { dashboardSurface } from './dashboardStyles';
import { DashboardMenuItem, DashboardWidgetMenu } from './DashboardWidgetMenu';
import { withLatinDigits } from '../../utils/latinNumerals';

export type FunnelItem = {
  name: string;
  value: number;
};

type ConversionFunnelProps = {
  title: string;
  items: FunnelItem[];
  menuItems?: DashboardMenuItem[];
  menuAriaLabel: string;
};

const STAGE_STYLES = [
  { bar: 'bg-indigo-500 dark:bg-indigo-400', ring: 'ring-indigo-500/30' },
  { bar: 'bg-violet-500 dark:bg-violet-400', ring: 'ring-violet-500/30' },
  { bar: 'bg-blue-500 dark:bg-blue-400', ring: 'ring-blue-500/30' },
  { bar: 'bg-emerald-500 dark:bg-emerald-400', ring: 'ring-emerald-500/30' },
] as const;

const formatCount = (n: number) =>
  n.toLocaleString(undefined, withLatinDigits({ maximumFractionDigits: 0 }));

const formatPercent = (n: number) =>
  n.toLocaleString(undefined, withLatinDigits({ maximumFractionDigits: 1, minimumFractionDigits: 0 }));

export const ConversionFunnel = ({ title, items, menuItems = [], menuAriaLabel }: ConversionFunnelProps) => {
  const { language, t } = useAppContext();
  const isRtl = language === 'ar';

  const maxValue = useMemo(() => Math.max(...items.map((i) => i.value), 1), [items]);

  const rows = useMemo(() => {
    return items.map((item, index) => {
      const pctOfTotal = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
      const prev = index > 0 ? items[index - 1].value : null;
      const stepRate = prev != null && prev > 0 ? (item.value / prev) * 100 : null;
      const dropOff = stepRate != null ? 100 - stepRate : null;
      const barWidth = maxValue > 0 ? Math.max((item.value / maxValue) * 100, item.value > 0 ? 4 : 0) : 0;
      return { ...item, pctOfTotal, stepRate, dropOff, barWidth, style: STAGE_STYLES[index % STAGE_STYLES.length] };
    });
  }, [items, maxValue]);

  return (
    <div className={`${dashboardSurface} p-5 sm:p-6`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700/80">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">{title}</h2>
        {menuItems.length > 0 ? <DashboardWidgetMenu items={menuItems} ariaLabel={menuAriaLabel} /> : null}
      </div>

      <ul className="space-y-5" role="list" aria-label={title}>
        {rows.map((row, index) => (
          <li key={`${row.name}-${index}`}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{row.name}</span>
              <div className="flex items-baseline gap-2 shrink-0 tabular-nums">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCount(row.value)}</span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {formatPercent(row.pctOfTotal)}% {t('funnelOfTotal')}
                </span>
              </div>
            </div>

            <div
              className="h-3 w-full rounded-full bg-gray-200/90 dark:bg-gray-700/80 overflow-hidden"
              role="progressbar"
              aria-valuenow={row.value}
              aria-valuemin={0}
              aria-valuemax={maxValue}
              aria-label={`${row.name}: ${formatCount(row.value)}`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${row.style.bar} ${row.value > 0 ? `ring-1 ring-inset ${row.style.ring}` : ''}`}
                style={{
                  width: `${row.barWidth}%`,
                  marginInlineStart: isRtl ? 'auto' : undefined,
                }}
              />
            </div>

            {row.dropOff != null && row.dropOff > 0 && items[index - 1]?.value > 0 ? (
              <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400/90">
                {t('dropOff')}: {formatPercent(row.dropOff)}%
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};
