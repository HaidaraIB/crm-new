import React from 'react';
import { dashboardSurface } from './dashboardStyles';
import { DashboardMenuItem, DashboardWidgetMenu } from './DashboardWidgetMenu';

export type TeamGoalRow = {
  id: number;
  name: string;
  progress: number;
  target: number;
};

type TeamGoalsProps = {
  title: string;
  targetLabel: string;
  rows: TeamGoalRow[];
  emptyLabel: string;
  menuItems?: DashboardMenuItem[];
  menuAriaLabel: string;
};

export const TeamGoals = ({ title, targetLabel, rows, emptyLabel, menuItems = [], menuAriaLabel }: TeamGoalsProps) => {
  return (
    <div className={`${dashboardSurface} p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">{title}</h2>
        {menuItems.length > 0 ? <DashboardWidgetMenu items={menuItems} ariaLabel={menuAriaLabel} /> : null}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-950/40 border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">{emptyLabel}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const pct = Math.min(100, Math.round((row.progress / Math.max(1, row.target)) * 100));
            return (
              <div key={row.id} className="rounded-xl border border-gray-100 dark:border-gray-700/70 bg-gray-50/40 dark:bg-gray-950/20 px-3 py-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{row.name}</p>
                  <p className="text-xs font-bold text-primary-700 dark:text-primary-300 whitespace-nowrap tabular-nums">
                    {row.progress}/{row.target} <span className="font-normal text-gray-500 dark:text-gray-400">{targetLabel}</span>
                  </p>
                </div>
                <div className="w-full h-2.5 rounded-full bg-gray-200/90 dark:bg-gray-800 overflow-hidden ring-1 ring-gray-100 dark:ring-gray-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 via-violet-500 to-blue-600 shadow-sm"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
