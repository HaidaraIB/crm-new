import React from 'react';
import { dashboardSurface } from './dashboardStyles';
import { DashboardMenuItem, DashboardWidgetMenu } from './DashboardWidgetMenu';

export type MissionItem = {
  id: string;
  label: string;
  value: number;
  tone: 'red' | 'orange' | 'blue' | 'purple';
  onClick?: () => void;
};

type MissionBarProps = {
  title: string;
  items: MissionItem[];
  menuItems?: DashboardMenuItem[];
  menuAriaLabel: string;
};

const toneClasses: Record<MissionItem['tone'], string> = {
  red: 'bg-gradient-to-br from-rose-50 to-red-50 text-rose-800 border-rose-100/80 shadow-inner dark:from-rose-950/40 dark:to-red-950/30 dark:text-rose-200 dark:border-rose-900/50',
  orange:
    'bg-gradient-to-br from-orange-50 to-amber-50 text-orange-900 border-orange-100/80 shadow-inner dark:from-orange-950/40 dark:to-amber-950/30 dark:text-orange-200 dark:border-orange-900/50',
  blue: 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-900 border-blue-100/80 shadow-inner dark:from-blue-950/40 dark:to-indigo-950/30 dark:text-blue-200 dark:border-blue-900/50',
  purple:
    'bg-gradient-to-br from-violet-50 to-purple-50 text-violet-900 border-violet-100/80 shadow-inner dark:from-violet-950/40 dark:to-purple-950/30 dark:text-violet-200 dark:border-violet-900/50',
};

export const MissionBar = ({ title, items, menuItems = [], menuAriaLabel }: MissionBarProps) => {
  return (
    <div className={`${dashboardSurface} p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{title}</h2>
        {menuItems.length > 0 ? <DashboardWidgetMenu items={menuItems} ariaLabel={menuAriaLabel} /> : null}
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${toneClasses[item.tone]}`}
          >
            <span className="text-sm font-semibold">{item.label}</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-white/90 dark:bg-gray-950/40 text-xs font-extrabold tabular-nums shadow-sm">
              {item.value}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
