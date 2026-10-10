import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PageBackButton, PageWrapper } from '../components';
import { DealForm } from '../components/deals/DealForm';
import { useCreateDeal } from '../hooks/useQueries';
import { createDealLineItemAPI } from '../services/api';
import { toLineItemPayload } from '../utils/deals/dealMapper';
import { getCompanyDealRoute, goToPreviousPage } from '../utils/routing';
import type { DealLineItem } from '../types';
import type { DealWritePayload } from '../utils/deals/dealMapper';

export const CreateDealPage = () => {
  const { t, setCurrentPage, currentUser, selectedLeadForDeal, setSelectedLeadForDeal } = useAppContext();
  const createDeal = useCreateDeal();
  const goDeals = () => {
    window.history.pushState({}, '', getCompanyDealRoute(currentUser?.company?.name, currentUser?.company?.domain, 'deals'));
    setCurrentPage('Deals');
  };
  const goBack = () => goToPreviousPage(goDeals);

  const handleSubmit = async (payload: DealWritePayload, items: DealLineItem[]) => {
    const created = await createDeal.mutateAsync(payload);
    for (const item of items) {
      await createDealLineItemAPI(created.id, toLineItemPayload(item));
    }
    setSelectedLeadForDeal(null);
    window.history.pushState({}, '', getCompanyDealRoute(currentUser?.company?.name, currentUser?.company?.domain, `view-deal/${created.id}`));
    setCurrentPage('ViewDeal');
  };

  return (
    <PageWrapper
      title={
        <div className="flex min-w-0 items-center gap-3">
          <PageBackButton fallback={goDeals} onClick={goBack} />
          <span className="truncate">{t('createDeal')}</span>
        </div>
      }
    >
      <DealForm
        initial={selectedLeadForDeal ? { id: 0, client: selectedLeadForDeal, leadId: selectedLeadForDeal, title: '', clientName: '', paymentMethod: 'cash', status: 'reservation', stage: 'in_progress', value: 0 } : null}
        submitting={createDeal.isPending}
        onSubmit={handleSubmit}
        onCancel={goBack}
      />
    </PageWrapper>
  );
};
