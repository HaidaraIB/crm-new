import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { dashboardSurface } from '../dashboard/dashboardStyles';
import { formatDuration, percentChange } from '../../utils/reportFormat';
import type { ReportMeta } from '../../services/reportsTypes';

export const ReportCard = ({
  title,
  hint,
  action,
  children,
  className = '',
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`${dashboardSurface} p-5 sm:p-6 ${className}`}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 tracking-tight">{title}</h3>
        {hint ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">{hint}</p> : null}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-950/30 py-10 px-6 text-center">
    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{message}</p>
  </div>
);

export const ReportSkeleton = () => (
  <div className="space-y-4 animate-pulse" aria-hidden>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
    <div className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800" />
  </div>
);

export const ReportError = ({ onRetry }: { onRetry: () => void }) => {
  const { t } = useAppContext();
  return (
    <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-6 text-center">
      <p className="text-sm font-semibold text-red-700 dark:text-red-300">{t('reportLoadFailed')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
      >
        {t('retry')}
      </button>
    </div>
  );
};

/** Change vs. the previous period. `lowerIsBetter` flips the colour (e.g. response time). */
export const DeltaBadge = ({
  current,
  previous,
  lowerIsBetter = false,
}: {
  current: number | null | undefined;
  previous: number | null | undefined;
  lowerIsBetter?: boolean;
}) => {
  const { t } = useAppContext();
  const change = percentChange(current, previous);
  if (change == null) return null;
  const flat = Math.abs(change) < 0.05;
  const good = lowerIsBetter ? change < 0 : change > 0;
  const tone = flat
    ? 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
    : good
      ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300'
      : 'text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300';
  const arrow = flat ? '' : change > 0 ? '▲ ' : '▼ ';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}
      title={t('reportVsPrevious')}
      dir="ltr"
    >
      {arrow}
      {Math.abs(change).toLocaleString('en-US', { maximumFractionDigits: 1 })}%
    </span>
  );
};

export const KpiTile = ({
  label,
  value,
  sub,
  delta,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  delta?: React.ReactNode;
  onClick?: () => void;
}) => {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 leading-snug">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight tabular-nums leading-none">{value}</p>
      <div className="mt-2 flex min-h-[1.5rem] flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {delta}
        {sub}
      </div>
    </>
  );
  const cls = `${dashboardSurface} h-full p-5 text-start flex flex-col`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:ring-2 hover:ring-primary-400/50 transition`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
};

/** A response time as "4m" with the other basis underneath: business first, raw wall-clock second. */
export const ResponseTimeCell = ({
  business,
  wall,
}: {
  business: number | null | undefined;
  wall: number | null | undefined;
}) => {
  const { t } = useAppContext();
  if (business == null && wall == null) return <span className="text-gray-400">—</span>;
  const differs = business != null && wall != null && Math.abs(business - wall) >= 60;
  return (
    <div className="leading-tight">
      <div className="font-semibold tabular-nums" title={t('reportBusinessTime')}>
        {formatDuration(business ?? wall, t)}
      </div>
      {differs ? (
        <div className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums" title={t('reportWallTime')}>
          {formatDuration(wall, t)} {t('reportRaw')}
        </div>
      ) : null}
    </div>
  );
};

/** Shown whenever part of the period rests on history reconstructed from old activity logs. */
export const DataQualityBanner = ({ meta }: { meta?: ReportMeta }) => {
  const { t } = useAppContext();
  const dq = meta?.data_quality;
  if (!dq?.has_backfilled) return null;
  const share = Math.round(dq.backfilled_share * 100);
  return (
    <div
      role="note"
      className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
    >
      {t('reportBackfilledNotice').replace('{percent}', String(share))}
    </div>
  );
};
