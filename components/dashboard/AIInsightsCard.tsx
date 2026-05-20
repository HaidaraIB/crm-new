import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { dashboardSurface } from './dashboardStyles';
import type { ClientAIInsightResponse } from '../../services/api';
import { Button, Loader } from '../index';
import { withLatinDigits } from '../../utils/dateUtils';

export type AIInsightCardItem = ClientAIInsightResponse & {
  onView?: () => void;
};

type AIInsightsCardProps = {
  title: string;
  poweredByLabel: string;
  pendingTitle: string;
  priorityTitle: string;
  scoreLabel: string;
  emptyLabel: string;
  viewLeadLabel: string;
  approveLabel: string;
  dismissLabel: string;
  suggestedDateLabel: string;
  pending: AIInsightCardItem[];
  priority: AIInsightCardItem[];
  onApprove: (id: number) => void;
  onDismiss: (id: number) => void;
  approvingId?: number | null;
  dismissingId?: number | null;
};

function leadInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatReminderDate(iso: string | null, locale: string, emptyLabel: string): string {
  if (!iso) return emptyLabel;
  try {
    return withLatinDigits(
      new Date(iso).toLocaleString(locale === 'ar' ? 'ar' : 'en', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    );
  } catch {
    return emptyLabel;
  }
}

function InsightRow({
  item,
  scoreLabel,
  viewLeadLabel,
  suggestedDateLabel,
  approveLabel,
  dismissLabel,
  showActions,
  onApprove,
  onDismiss,
  approving,
  dismissing,
  locale,
}: {
  item: AIInsightCardItem;
  scoreLabel: string;
  viewLeadLabel: string;
  suggestedDateLabel: string;
  approveLabel: string;
  dismissLabel: string;
  showActions: boolean;
  onApprove: (id: number) => void;
  onDismiss: (id: number) => void;
  approving: boolean;
  dismissing: boolean;
  locale: string;
}) {
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{item.summary}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {suggestedDateLabel}: {formatReminderDate(item.suggested_reminder_date, locale, emptyDateLabel)}
          </p>
          {showActions ? (
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => onApprove(item.id)}
                disabled={approving || dismissing}
              >
                {approving ? <Loader className="h-3 w-3" /> : approveLabel}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onDismiss(item.id)} disabled={approving || dismissing}>
                {dismissing ? <Loader className="h-3 w-3" /> : dismissLabel}
              </Button>
              {item.onView ? (
                <Button size="sm" variant="secondary" onClick={item.onView}>
                  {viewLeadLabel}
                </Button>
              ) : null}
            </div>
          ) : item.onView ? (
            <Button size="sm" variant="secondary" className="mt-2" onClick={item.onView}>
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
  pendingTitle,
  priorityTitle,
  scoreLabel,
  emptyLabel,
  viewLeadLabel,
  approveLabel,
  dismissLabel,
  suggestedDateLabel,
  pending,
  priority,
  onApprove,
  onDismiss,
  approvingId,
  dismissingId,
}: AIInsightsCardProps) => {
  const { language, t } = useAppContext();
  const locale = language === 'ar' ? 'ar' : 'en';
  const emptyDateLabel = t('notAvailable');
  const hasContent = pending.length > 0 || priority.length > 0;

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

      {!hasContent ? (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-950/40 border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">{emptyLabel}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{pendingTitle}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {pending.map((item) => (
                  <InsightRow
                    key={`pending-${item.id}`}
                    item={item}
                    scoreLabel={scoreLabel}
                    viewLeadLabel={viewLeadLabel}
                    suggestedDateLabel={suggestedDateLabel}
                    approveLabel={approveLabel}
                    dismissLabel={dismissLabel}
                    showActions
                    onApprove={onApprove}
                    onDismiss={onDismiss}
                    approving={approvingId === item.id}
                    dismissing={dismissingId === item.id}
                    locale={locale}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {priority.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{priorityTitle}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {priority.map((item) => (
                  <InsightRow
                    key={`priority-${item.id}`}
                    item={item}
                    scoreLabel={scoreLabel}
                    viewLeadLabel={viewLeadLabel}
                    suggestedDateLabel={suggestedDateLabel}
                    approveLabel={approveLabel}
                    dismissLabel={dismissLabel}
                    showActions={item.status === 'pending'}
                    onApprove={onApprove}
                    onDismiss={onDismiss}
                    approving={approvingId === item.id}
                    dismissing={dismissingId === item.id}
                    locale={locale}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
