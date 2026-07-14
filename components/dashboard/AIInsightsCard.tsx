import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { dashboardSurface } from './dashboardStyles';
import type { ClientAIInsightResponse } from '../../services/api';
import { Button } from '../index';
import { pickInsightText } from '../../utils/aiInsightText';

export type AIInsightCardItem = ClientAIInsightResponse & {
  onView?: () => void;
};

type AIInsightsCardProps = {
  title: string;
  poweredByLabel: string;
  priorityTitle: string;
  scoreLabel: string;
  emptyLabel: string;
  viewLeadLabel: string;
  priority: AIInsightCardItem[];
};

function leadInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function InsightRow({
  item,
  scoreLabel,
  viewLeadLabel,
  language,
}: {
  item: AIInsightCardItem;
  scoreLabel: string;
  viewLeadLabel: string;
  language: string;
}) {
  const summaryText = pickInsightText(item, 'summary', language);
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700/90 bg-gray-50/50 dark:bg-gray-950/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-violet-500/30">
          {leadInitials(item.client_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={item.onView}
              className="font-semibold text-gray-900 dark:text-gray-50 truncate text-start hover:text-primary-600 dark:hover:text-primary-400"
            >
              {item.client_name}
            </button>
            <span className="shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-extrabold tabular-nums bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
              <span className="block text-[9px] font-bold uppercase opacity-90">{scoreLabel}</span>
              <span>{item.ai_score}</span>
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{summaryText}</p>
          {item.onView ? (
            <Button size="sm" variant="secondary" className="mt-3" onClick={item.onView}>
              {viewLeadLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const AIInsightsCard = ({
  title,
  poweredByLabel,
  priorityTitle,
  scoreLabel,
  emptyLabel,
  viewLeadLabel,
  priority,
}: AIInsightsCardProps) => {
  const { language } = useAppContext();
  const uiLanguage = language === 'ar' ? 'ar' : 'en';

  return (
    <div className={`${dashboardSurface} p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">{title}</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">
              {poweredByLabel}
            </span>
          </div>
        </div>
      </div>

      {priority.length === 0 ? (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-950/40 border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">{emptyLabel}</p>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{priorityTitle}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {priority.map((item) => (
              <InsightRow
                key={`priority-${item.id}`}
                item={item}
                scoreLabel={scoreLabel}
                viewLeadLabel={viewLeadLabel}
                language={uiLanguage}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
