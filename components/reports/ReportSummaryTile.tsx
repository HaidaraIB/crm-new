import React from 'react';
import { dashboardSurface } from '../dashboard/dashboardStyles';

export type ReportTileAccent = 'indigo' | 'blue' | 'emerald' | 'violet';

const TILE_BLOBS: Record<ReportTileAccent, string> = {
  indigo: 'from-indigo-500 via-violet-500 to-purple-600',
  blue: 'from-blue-500 via-indigo-500 to-primary-600',
  emerald: 'from-emerald-400 via-teal-500 to-cyan-600',
  violet: 'from-violet-500 via-purple-600 to-blue-700',
};

type ReportSummaryTileProps = {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: ReportTileAccent;
};

export const ReportSummaryTile = ({ title, value, icon, accent = 'indigo' }: ReportSummaryTileProps) => (
  <div className={`${dashboardSurface} p-5 sm:p-6 hover:shadow-2xl hover:shadow-primary-500/10 dark:hover:ring-primary-500/20 transition-all duration-300`}>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-50 mt-2 tracking-tight tabular-nums">
          {value}
        </p>
      </div>
      {icon ? (
        <div
          className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${TILE_BLOBS[accent]} text-white shadow-lg shadow-black/15 flex items-center justify-center`}
        >
          <span className="[&_svg]:w-6 [&_svg]:h-6 sm:[&_svg]:w-7 sm:[&_svg]:h-7">{icon}</span>
        </div>
      ) : null}
    </div>
  </div>
);
