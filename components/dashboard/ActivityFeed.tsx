import React from 'react';
import { dashboardSurface } from './dashboardStyles';
import { DashboardMenuItem, DashboardWidgetMenu } from './DashboardWidgetMenu';

export type ActivityFeedItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
};

type ActivityFeedProps = {
  title: string;
  items: ActivityFeedItem[];
  emptyLabel: string;
  className?: string;
  menuItems?: DashboardMenuItem[];
  menuAriaLabel: string;
};

export const ActivityFeed = ({ title, items, emptyLabel, className = '', menuItems = [], menuAriaLabel }: ActivityFeedProps) => {
  return (
    <div className={`${dashboardSurface} p-5 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">{title}</h2>
        {menuItems.length > 0 ? <DashboardWidgetMenu items={menuItems} ariaLabel={menuAriaLabel} /> : null}
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-950/40 border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">{emptyLabel}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pe-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700/70"
            >
              <div className="flex items-start gap-3">
                <span className="mt-2 h-9 w-1 rounded-full bg-gradient-to-b from-primary-500 to-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.subtitle}</p>
                  <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-1.5 uppercase tracking-wide">
                    {item.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
