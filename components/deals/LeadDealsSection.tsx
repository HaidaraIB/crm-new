import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button, Card } from '../index';
import { useDeals } from '../../hooks/useQueries';
import { formatDealMoney } from '../../utils/deals/dealFormatters';
import { getCompanyDealRoute } from '../../utils/routing';
import type { Deal } from '../../types';

export const LeadDealsSection = ({ leadId }: { leadId: number }) => {
  const { t, currentUser, setCurrentPage, setSelectedLeadForDeal } = useAppContext();
  const { data } = useDeals(undefined, undefined, undefined, undefined, undefined, { client: leadId });
  const deals: Deal[] = Array.isArray(data) ? data : data?.results || [];
  const open = (segment: string, page: 'ViewDeal' | 'CreateDeal') => {
    window.history.pushState({}, '', getCompanyDealRoute(currentUser?.company?.name, currentUser?.company?.domain, segment));
    setCurrentPage(page);
  };

  return (
    <Card>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{t('deals')}</h3>
          <Button type="button" onClick={() => { setSelectedLeadForDeal(leadId); open('create-deal', 'CreateDeal'); }}>{t('createDeal')}</Button>
        </div>
        {deals.length === 0 && <p className="text-sm text-gray-500">{t('noDealsFound')}</p>}
        <div className="space-y-2">
          {deals.map((deal) => (
            <button key={deal.id} type="button" onClick={() => open(`view-deal/${deal.id}`, 'ViewDeal')} className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-start text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/40">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-gray-900 hover:text-primary-700 dark:text-white dark:hover:text-primary-200">{deal.title || deal.clientName}</span>
                <span className="shrink-0 text-gray-500">{deal.pipelineStageName || deal.stage}</span>
              </span>
              <span className="shrink-0 tabular-nums">{formatDealMoney(deal.value, deal.currency)}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};
