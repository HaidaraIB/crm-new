import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../Button';
import { FieldActionRow } from '../FieldActionRow';
import { AutoDirTextarea } from '../Input';
import { formatDealMoney } from '../../utils/deals/dealFormatters';
import { formatDateTimeToLocal } from '../../utils/dateUtils';
import type { Deal, DealEvent, DealLineItem } from '../../types';

const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400';

const EmptyState = ({ message, action }: { message: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center dark:border-gray-600">
    <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
    {action}
  </div>
);

const formatWhen = (value?: string | null) => {
  if (!value) return '';
  const formatted = formatDateTimeToLocal(value);
  return formatted || value;
};

export const DealLineItemsSection = ({
  deal,
  onEdit,
}: {
  deal: Deal;
  onEdit: () => void;
}) => {
  const { t } = useAppContext();
  const items = deal.lineItems || [];
  if (items.length === 0) {
    return (
      <EmptyState
        message={t('dealNoLineItems')}
        action={<Button type="button" variant="secondary" onClick={onEdit}>{t('editDeal')}</Button>}
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <th className="px-1 py-2 text-start font-medium">{t('dealTitle')}</th>
            <th className="px-1 py-2 text-end font-medium">{t('dealQuantity')}</th>
            <th className="px-1 py-2 text-end font-medium">{t('dealUnitPrice')}</th>
            <th className="px-1 py-2 text-end font-medium">{t('value')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <LineItemRow key={item.id || item.name} item={item} currency={deal.currency} />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 dark:border-gray-700">
            <td colSpan={3} className="px-1 py-3 text-end text-sm font-medium text-gray-600 dark:text-gray-300">{t('value')}</td>
            <td className="px-1 py-3 text-end text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{formatDealMoney(deal.value, deal.currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const LineItemRow = ({ item, currency }: { item: DealLineItem; currency?: string }) => (
  <tr className="border-b border-gray-100 last:border-0 dark:border-gray-800">
    <td className="px-1 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
    <td className="px-1 py-3 text-end tabular-nums text-gray-700 dark:text-gray-200">{item.quantity}</td>
    <td className="px-1 py-3 text-end tabular-nums text-gray-700 dark:text-gray-200">{formatDealMoney(item.unitPrice, currency)}</td>
    <td className="px-1 py-3 text-end font-medium tabular-nums text-gray-900 dark:text-white">{formatDealMoney(item.lineTotal, currency)}</td>
  </tr>
);

const eventTitleKey = (eventType: string) => {
  if (eventType === 'note') return 'dealEventNote' as const;
  if (eventType === 'stage_change') return 'dealEventStage' as const;
  if (eventType === 'won') return 'dealEventWon' as const;
  if (eventType === 'lost') return 'dealEventLost' as const;
  if (eventType === 'reopened') return 'dealEventReopened' as const;
  if (eventType === 'assigned') return 'dealEventAssigned' as const;
  return 'dealEventUpdated' as const;
};

const eventDotClass = (eventType: string) => {
  if (eventType === 'won') return 'bg-emerald-500';
  if (eventType === 'lost') return 'bg-red-500';
  if (eventType === 'reopened') return 'bg-amber-500';
  if (eventType === 'stage_change') return 'bg-sky-500';
  if (eventType === 'note') return 'bg-gray-400 dark:bg-gray-300';
  return 'bg-gray-400';
};

export const DealActivitySection = ({
  events,
  note,
  saving,
  onNoteChange,
  onAddNote,
}: {
  events: DealEvent[];
  note: string;
  saving: boolean;
  onNoteChange: (value: string) => void;
  onAddNote: () => void;
}) => {
  const { t, language } = useAppContext();
  const arrow = language === 'ar' ? '←' : '→';
  return (
    <div className="space-y-5">
      <FieldActionRow action={<Button type="button" disabled={!note.trim() || saving} onClick={onAddNote}>{t('dealAddNote')}</Button>}>
        <AutoDirTextarea value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder={t('dealNotePlaceholder')} rows={2} className={fieldClass} />
      </FieldActionRow>
      {events.length === 0 ? <EmptyState message={t('dealNoActivity')} /> : (
        <ol className="space-y-4">
          {events.map((event) => {
            const transition = event.oldValue && event.newValue && event.eventType !== 'note'
              ? `${event.oldValue} ${arrow} ${event.newValue}`
              : '';
            const detail = event.eventType === 'note'
              ? event.newValue
              : transition || (event.eventType === 'lost' ? '' : event.newValue);
            const reason = event.eventType === 'lost' ? event.reason : '';
            return (
              <li key={event.id} className="flex gap-3">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${eventDotClass(event.eventType)}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t(eventTitleKey(event.eventType))}</p>
                  {detail ? <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">{detail}</p> : null}
                  {reason ? <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200">{reason}</p> : null}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {[event.createdByName, formatWhen(event.createdAt)].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export const DealTasksSection = ({
  tasks,
  note,
  saving,
  onNoteChange,
  onAdd,
}: {
  tasks: { id: number; notes?: string; reminder_date?: string; created_at?: string }[];
  note: string;
  saving: boolean;
  onNoteChange: (value: string) => void;
  onAdd: () => void;
}) => {
  const { t } = useAppContext();
  return (
    <div className="space-y-4">
      <FieldActionRow action={<Button type="button" disabled={!note.trim() || saving} onClick={onAdd}>{t('dealCreateTask')}</Button>}>
        <AutoDirTextarea value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder={t('dealNotePlaceholder')} rows={2} className={fieldClass} />
      </FieldActionRow>
      {tasks.length === 0 ? <EmptyState message={t('dealNoTasks')} /> : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
          {tasks.map((task) => (
            <li key={task.id} className="px-4 py-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{task.notes || '—'}</p>
              {formatWhen(task.reminder_date || task.created_at) ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatWhen(task.reminder_date || task.created_at)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
