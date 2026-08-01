import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { MarqueeText } from '../MarqueeText';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';

export type TodoKanbanItem = {
    /** Unique board id, e.g. `42` or `client-task-7` */
    boardId: string;
    entityType: 'deal_task' | 'client_task';
    entityId: number;
    stageId: number;
    stageName: string;
    clientName: string;
    notes?: string;
    reminderDate?: string | null;
    dealStage?: string | null;
    employeeUsername?: string | null;
};

type TodoKanbanCardProps = {
    item: TodoKanbanItem;
    formatDealStage?: (stage: string | null | undefined) => string;
    onOpen?: (item: TodoKanbanItem) => void;
};

const TYPE_BADGE =
    'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap';

export const TodoKanbanCard = ({
    item,
    formatDealStage,
    onOpen,
}: TodoKanbanCardProps) => {
    const { t, language } = useAppContext();

    const typeLabel =
        item.entityType === 'client_task'
            ? t('action') || 'Action'
            : t('dealTask') || 'Deal Task';

    const formattedReminder = item.reminderDate
        ? (() => {
              try {
                  const date = new Date(item.reminderDate);
                  if (Number.isNaN(date.getTime())) return String(item.reminderDate);
                  return date.toLocaleDateString(
                      language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
                      withLatinDigits({
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                      }),
                  );
              } catch {
                  return String(item.reminderDate);
              }
          })()
        : null;

    const dealStageLabel =
        item.dealStage && formatDealStage ? formatDealStage(item.dealStage) : item.dealStage;

    return (
        <div
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-dark-card p-3 text-start shadow-sm hover:border-primary/40 hover:shadow transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={
                onOpen
                    ? (e) => {
                          e.stopPropagation();
                          onOpen(item);
                      }
                    : undefined
            }
            onKeyDown={
                onOpen
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpen(item);
                          }
                      }
                    : undefined
            }
        >
            <div className="flex items-start justify-between gap-2 min-w-0">
                <MarqueeText
                    text={item.clientName || '—'}
                    className="min-w-0 flex-1"
                    contentClassName="text-sm font-semibold text-gray-900 dark:text-gray-100"
                />
                <span
                    className={`${TYPE_BADGE} ${
                        item.entityType === 'client_task'
                            ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200'
                            : 'bg-primary/10 text-primary-700 dark:text-primary-200'
                    }`}
                >
                    {typeLabel}
                </span>
            </div>

            {item.notes ? (
                <p className="mt-1.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                    {item.notes}
                </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {dealStageLabel ? (
                    <span className={`${TYPE_BADGE} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>
                        {dealStageLabel}
                    </span>
                ) : null}
                {item.employeeUsername ? (
                    <span className="truncate text-[11px] text-gray-500 dark:text-gray-400 max-w-full">
                        {item.employeeUsername}
                    </span>
                ) : null}
            </div>

            {formattedReminder ? (
                <p
                    className={`mt-2 text-[11px] tabular-nums ${
                        item.reminderDate && new Date(item.reminderDate).getTime() < Date.now()
                            ? 'text-rose-600 dark:text-rose-400 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    {formattedReminder}
                </p>
            ) : null}
        </div>
    );
};
