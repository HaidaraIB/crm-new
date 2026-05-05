import React from 'react';
import { dashboardSurface } from './dashboardStyles';
import { DashboardMenuItem, DashboardWidgetMenu } from './DashboardWidgetMenu';

export type HotLeadItem = {
  id: number;
  name: string;
  assignedUser: string;
  stage: string;
  score: number;
  bucket: 'hot' | 'warm' | 'cold';
  notes: string;
  stageColor?: string;
  onView: () => void;
};

type HotLeadsCardProps = {
  title: string;
  scoreLabel: string;
  emptyLabel: string;
  viewLeadLabel: string;
  leads: HotLeadItem[];
  menuItems?: DashboardMenuItem[];
  menuAriaLabel: string;
};

function leadInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const bucketClass: Record<HotLeadItem['bucket'], string> = {
  hot: 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-orange-500/25',
  warm: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 shadow-md',
  cold: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
};

export const HotLeadsCard = ({
  title,
  scoreLabel,
  emptyLabel,
  viewLeadLabel,
  leads,
  menuItems = [],
  menuAriaLabel,
}: HotLeadsCardProps) => {
  return (
    <div className={`${dashboardSurface} p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">{title}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{scoreLabel}</p>
        </div>
        {menuItems.length > 0 ? <DashboardWidgetMenu items={menuItems} ariaLabel={menuAriaLabel} /> : null}
      </div>
      {leads.length === 0 ? (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-950/40 border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">{emptyLabel}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="group rounded-2xl border border-gray-100 dark:border-gray-700/90 bg-gray-50/50 dark:bg-gray-950/30 p-4 hover:bg-white hover:shadow-lg hover:shadow-gray-200/60 dark:hover:bg-gray-800/70 dark:hover:shadow-none transition-all duration-300"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 text-sm font-bold text-white shadow-lg shadow-primary-500/30">
                  {leadInitials(lead.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-50 truncate">{lead.name}</p>
                    <span className={`shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-extrabold tabular-nums leading-tight text-center ${bucketClass[lead.bucket]}`}>
                      <span className="block text-[9px] font-bold uppercase opacity-90">{scoreLabel}</span>
                      <span>{lead.score}</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{lead.assignedUser}</p>
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-sm mt-2"
                    style={{ backgroundColor: lead.stageColor || '#6366f1' }}
                  >
                    {lead.stage}
                  </span>
                  {lead.notes ? (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{lead.notes}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={lead.onView}
                    className="mt-3 w-full rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 py-2 text-xs font-bold text-white shadow-md shadow-primary-500/25 opacity-95 group-hover:opacity-100 transition-opacity"
                  >
                    {viewLeadLabel}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
