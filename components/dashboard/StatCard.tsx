import React, { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { dashboardSurface } from './dashboardStyles';

type Accent = 'orange' | 'blue' | 'emerald' | 'rose' | 'indigo' | 'teal' | 'amber' | 'violet';

const ACCENTS: Record<
  Accent,
  { blob: string; blobText: string; stroke: string; fillFrom: string; fillTo: string; pillUp: string; pillDown: string }
> = {
  orange: {
    blob: 'from-orange-400 via-rose-400 to-red-500',
    blobText: 'text-white',
    stroke: '#f97316',
    fillFrom: '#fb923c',
    fillTo: '#fb923c',
    pillUp: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
    pillDown: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-900/35 dark:text-rose-300 dark:ring-rose-900',
  },
  blue: {
    blob: 'from-blue-500 via-indigo-500 to-primary-600',
    blobText: 'text-white',
    stroke: '#3b82f6',
    fillFrom: '#6366f1',
    fillTo: '#3b82f6',
    pillUp: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
    pillDown: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-900/35 dark:text-rose-300 dark:ring-rose-900',
  },
  emerald: {
    blob: 'from-emerald-400 via-teal-500 to-cyan-600',
    blobText: 'text-white',
    stroke: '#10b981',
    fillFrom: '#34d399',
    fillTo: '#10b981',
    pillUp: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
    pillDown: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-900/35 dark:text-rose-300 dark:ring-rose-900',
  },
  rose: {
    blob: 'from-rose-400 via-red-400 to-orange-500',
    blobText: 'text-white',
    stroke: '#f43f5e',
    fillFrom: '#fb7185',
    fillTo: '#f43f5e',
    pillUp: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
    pillDown: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-900/35 dark:text-rose-300 dark:ring-rose-900',
  },
  indigo: {
    blob: 'from-indigo-500 via-violet-500 to-purple-600',
    blobText: 'text-white',
    stroke: '#6366f1',
    fillFrom: '#8b5cf6',
    fillTo: '#6366f1',
    pillUp: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
    pillDown: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-900/35 dark:text-rose-300 dark:ring-rose-900',
  },
  teal: {
    blob: 'from-teal-400 via-cyan-500 to-blue-600',
    blobText: 'text-white',
    stroke: '#14b8a6',
    fillFrom: '#2dd4bf',
    fillTo: '#0d9488',
    pillUp: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
    pillDown: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-900/35 dark:text-rose-300 dark:ring-rose-900',
  },
  amber: {
    blob: 'from-amber-400 via-orange-500 to-yellow-500',
    blobText: 'text-white',
    stroke: '#f59e0b',
    fillFrom: '#fcd34d',
    fillTo: '#f59e0b',
    pillUp: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
    pillDown: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-900/35 dark:text-rose-300 dark:ring-rose-900',
  },
  violet: {
    blob: 'from-violet-500 via-purple-600 to-blue-700',
    blobText: 'text-white',
    stroke: '#7c3aed',
    fillFrom: '#a78bfa',
    fillTo: '#6366f1',
    pillUp: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
    pillDown: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-900/35 dark:text-rose-300 dark:ring-rose-900',
  },
};

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  deltaLabel?: string;
  deltaPositive?: boolean;
  trendData?: number[];
  icon?: React.ReactNode;
  accent?: Accent;
  onClick?: () => void;
};

export const StatCard = ({
  title,
  value,
  subtitle,
  deltaLabel,
  deltaPositive = true,
  trendData = [],
  icon,
  accent = 'blue',
  onClick,
}: StatCardProps) => {
  const uid = useId().replace(/:/g, '');
  const chartData = trendData.map((n, i) => ({ i, value: n }));
  const palette = ACCENTS[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left ${dashboardSurface} p-5 sm:p-5 hover:shadow-2xl hover:shadow-primary-500/10 dark:hover:ring-primary-500/25 transition-all duration-300 disabled:cursor-default disabled:hover:shadow-xl`}
      disabled={!onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
            {deltaLabel ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  deltaPositive ? palette.pillUp : palette.pillDown
                }`}
              >
                {deltaPositive ? '↑' : '↓'} {deltaLabel}
              </span>
            ) : null}
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-50 mt-2 tracking-tight tabular-nums">
            {value}
          </p>
          {subtitle ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p> : null}
        </div>
        {icon ? (
          <div
            className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${palette.blob} ${palette.blobText} shadow-lg shadow-black/15 flex items-center justify-center`}
          >
            {icon}
          </div>
        ) : null}
      </div>
      {chartData.length > 1 ? (
        <div className="h-14 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="8%" stopColor={palette.fillFrom} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={palette.fillTo} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={palette.stroke}
                strokeWidth={2}
                fill={`url(#spark-${uid})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: palette.stroke }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </button>
  );
};
