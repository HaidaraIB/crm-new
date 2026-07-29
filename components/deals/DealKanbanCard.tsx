import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { MarqueeText } from '../MarqueeText';
import type { Deal } from '../../types';
import { withLatinDigits } from '../../utils/dateUtils';

export type DealKanbanCardModel = Deal & {
    project_name?: string | null;
    unit_code?: string | null;
};

type DealKanbanCardProps = {
    deal: DealKanbanCardModel;
    isRealEstate?: boolean;
    onOpen?: (deal: DealKanbanCardModel) => void;
};

const STATUS_BADGE =
    'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap';

const formatStatus = (status: string | undefined, t: (key: any) => string): string => {
    if (!status) return '-';
    const statusLower = status.toLowerCase();
    const statusMap: Record<string, string> = {
        reservation: t('reservation') || 'Reservation',
        contracted: t('contracted') || 'Contracted',
        closed: t('closed') || 'Closed',
    };
    return statusMap[statusLower] || status;
};

const statusBadgeClass = (status: string | undefined): string => {
    const s = (status || '').toLowerCase();
    if (s === 'reservation') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    if (s === 'contracted') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (s === 'closed') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
};

const formatPaymentMethod = (method: string | undefined, t: (key: any) => string): string => {
    if (!method) return '';
    const methodLower = method.toLowerCase();
    const methodMap: Record<string, string> = {
        cash: t('cash') || 'Cash',
        installment: t('installment') || 'Installment',
    };
    return methodMap[methodLower] || method;
};

export const DealKanbanCard = ({
    deal,
    isRealEstate = false,
    onOpen,
}: DealKanbanCardProps) => {
    const { t } = useAppContext();

    const formattedValue = (() => {
        const num = Number(deal.value);
        if (Number.isNaN(num)) return '-';
        const formatted = num.toLocaleString('en-US', withLatinDigits({
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }));
        return formatted.replace(/\.0+$/, '');
    })();

    const projectLabel =
        (deal.project_name && String(deal.project_name).trim()) ||
        (typeof deal.project === 'string' ? deal.project : '') ||
        '';
    const unitLabel =
        (deal.unit_code && String(deal.unit_code).trim()) ||
        (typeof deal.unit === 'string' ? deal.unit : '') ||
        '';
    const subtitle = [projectLabel, unitLabel].filter(Boolean).join(' · ');
    const paymentLabel = formatPaymentMethod(deal.paymentMethod, t);

    return (
        <div
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-dark-card p-3 text-start shadow-sm hover:border-primary/40 hover:shadow transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={
                onOpen
                    ? (e) => {
                          e.stopPropagation();
                          onOpen(deal);
                      }
                    : undefined
            }
            onKeyDown={
                onOpen
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpen(deal);
                          }
                      }
                    : undefined
            }
        >
            <div className="flex items-start justify-between gap-2 min-w-0">
                <MarqueeText
                    text={deal.clientName || '—'}
                    className="min-w-0 flex-1"
                    contentClassName="text-sm font-semibold text-gray-900 dark:text-gray-100"
                />
                <span className="shrink-0 text-[11px] font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                    #{deal.id}
                </span>
            </div>

            {isRealEstate && subtitle ? (
                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                    {subtitle}
                </p>
            ) : null}

            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                {formattedValue}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {deal.status ? (
                    <span className={`${STATUS_BADGE} ${statusBadgeClass(deal.status)}`}>
                        {formatStatus(deal.status, t)}
                    </span>
                ) : null}
                {paymentLabel ? (
                    <span className={`${STATUS_BADGE} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>
                        {paymentLabel}
                    </span>
                ) : null}
            </div>
        </div>
    );
};
