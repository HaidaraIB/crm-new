import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { TableHorizontalScroll } from '../index';
import { DealRowActions } from './DealRowActions';
import { formatDealMoney, isDealOverdue } from '../../utils/deals/dealFormatters';
import { withLatinDigits } from '../../utils/dateUtils';
import type { Deal } from '../../types';

type DealsTableProps = {
  deals: Deal[];
  isRealEstate: boolean;
  selectedIds: number[];
  onToggle: (id: number) => void;
  onTogglePage: (ids: number[], selected: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onView: (id: number) => void;
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', withLatinDigits({ year: 'numeric', month: 'short', day: 'numeric' }));
};

export const DealsTable = ({
  deals,
  isRealEstate,
  selectedIds,
  onToggle,
  onTogglePage,
  onDelete,
  onEdit,
  onView,
}: DealsTableProps) => {
  const { t } = useAppContext();
  const pageIds = deals.map((deal) => deal.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  return (
    <TableHorizontalScroll scrollClassName="-mx-4 sm:mx-0 rounded-lg">
      <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full text-sm text-center rtl:text-right text-gray-800 dark:text-gray-100 min-w-[1100px]">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onTogglePage(pageIds, e.target.checked)}
                  aria-label={t('selectAll')}
                />
              </th>
              <th className="px-4 py-3">{t('dealTitle')}</th>
              <th className="px-4 py-3">{t('clientName')}</th>
              {isRealEstate && <th className="px-4 py-3 hidden lg:table-cell">{t('project')}</th>}
              <th className="px-4 py-3">{t('stage')}</th>
              <th className="px-4 py-3">{t('value')}</th>
              <th className="px-4 py-3 hidden md:table-cell">{t('dealOwner')}</th>
              <th className="px-4 py-3 hidden lg:table-cell">{t('dealExpectedClose')}</th>
              <th className="px-4 py-3">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
            {deals.length === 0 ? (
              <tr>
                <td colSpan={isRealEstate ? 9 : 8} className="px-4 py-12 text-center">{t('noDealsFound')}</td>
              </tr>
            ) : deals.map((deal) => (
              <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selectedIds.includes(deal.id)} onChange={() => onToggle(deal.id)} aria-label={deal.title} />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  <button
                    type="button"
                    onClick={() => onView(deal.id)}
                    title={deal.title || deal.clientName}
                    className="mx-auto block w-full max-w-[220px] truncate text-sm font-medium text-gray-900 transition-colors hover:text-primary-700 focus:outline-none dark:text-white dark:hover:text-primary-200"
                  >
                    {deal.title || deal.clientName}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{deal.clientName || '-'}</td>
                {isRealEstate && <td className="px-4 py-3 hidden lg:table-cell">{deal.projectName || '-'}</td>}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: deal.pipelineStageColor || '#94a3b8' }} />
                    {deal.pipelineStageName || deal.stage}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatDealMoney(deal.value, deal.currency)}</td>
                <td className="px-4 py-3 hidden md:table-cell">{deal.employeeUsername || '-'}</td>
                <td className={`px-4 py-3 hidden lg:table-cell ${isDealOverdue(deal) ? 'text-red-600 font-medium' : ''}`}>
                  {formatDate(deal.expectedCloseDate)}
                  {isDealOverdue(deal) ? ` · ${t('dealOverdue')}` : ''}
                </td>
                <td className="px-4 py-3">
                  <DealRowActions
                    onView={() => onView(deal.id)}
                    onEdit={() => onEdit(deal.id)}
                    onDelete={() => onDelete(deal.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableHorizontalScroll>
  );
};
