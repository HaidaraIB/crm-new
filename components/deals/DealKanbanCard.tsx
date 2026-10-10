import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { DealRowActions } from './DealRowActions';
import { formatDealMoney, isDealOverdue } from '../../utils/deals/dealFormatters';
import type { Deal } from '../../types';

type DealKanbanCardProps = {
  deal: Deal;
  onOpen?: (deal: Deal) => void;
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
};

const STATUS_BADGE = 'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap';

const statusBadgeClass = (status: string | undefined): string => {
  const value = (status || '').toLowerCase();
  if (value === 'reservation') return 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/50 dark:text-yellow-100';
  if (value === 'contracted') return 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100';
  if (value === 'closed') return 'bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-100';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
};

export const DealKanbanCard = ({ deal, onOpen, onEdit, onDelete }: DealKanbanCardProps) => {
  const { t } = useAppContext();
  const overdue = isDealOverdue(deal);
  const statusKey = (deal.status || '').toLowerCase();
  const paymentKey = (deal.paymentMethod || '').toLowerCase();

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-3 text-start shadow-sm dark:border-gray-600 dark:bg-dark-card">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="group min-w-0 flex-1 rounded text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => onOpen?.(deal)}
        >
          <p className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-200">{deal.title || deal.clientName || '—'}</p>
          <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300">{deal.clientName || '—'}</p>
        </button>
        {onOpen && onEdit && onDelete ? (
          <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            <DealRowActions
              onView={() => onOpen(deal)}
              onEdit={() => onEdit(deal)}
              onDelete={() => onDelete(deal)}
            />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
        {formatDealMoney(deal.value, deal.currency)}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
        <span className="truncate">{deal.employeeUsername || '—'}</span>
        <span className={overdue ? 'shrink-0 font-medium text-red-600 dark:text-red-400' : 'shrink-0'}>
          {deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : ''}
          {overdue ? ` · ${t('dealOverdue')}` : ''}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {deal.status ? (
          <span className={`${STATUS_BADGE} ${statusBadgeClass(deal.status)}`}>
            {statusKey === 'reservation' ? t('reservation') : statusKey === 'contracted' ? t('contracted') : statusKey === 'closed' ? t('closed') : deal.status}
          </span>
        ) : null}
        {deal.paymentMethod ? (
          <span className={`${STATUS_BADGE} bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100`}>
            {paymentKey === 'cash' ? t('cash') : paymentKey === 'installment' ? t('installment') : deal.paymentMethod}
          </span>
        ) : null}
      </div>
    </div>
  );
};
