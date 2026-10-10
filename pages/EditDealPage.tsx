import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PageBackButton, PageLoadingState, PageWrapper } from '../components';
import { DealForm } from '../components/deals/DealForm';
import { useDeal, useUpdateDeal } from '../hooks/useQueries';
import { createDealLineItemAPI, deleteDealLineItemAPI, updateDealLineItemAPI } from '../services/api';
import { toLineItemPayload, type DealWritePayload } from '../utils/deals/dealMapper';
import { extractEditDealIdFromPath, getCompanyDealRoute, goToPreviousPage } from '../utils/routing';
import type { DealLineItem } from '../types';

export const EditDealPage = () => {
  const { t, setCurrentPage, currentUser } = useAppContext();
  const dealId = extractEditDealIdFromPath(window.location.pathname) || undefined;
  const { data: deal, isLoading } = useDeal(dealId);
  const updateDeal = useUpdateDeal();

  const goView = () => {
    if (!dealId) return;
    window.history.pushState({}, '', getCompanyDealRoute(currentUser?.company?.name, currentUser?.company?.domain, `view-deal/${dealId}`));
    setCurrentPage('ViewDeal');
  };
  const goBack = () => goToPreviousPage(goView);
  const pageTitle = (
    <div className="flex min-w-0 items-center gap-3">
      <PageBackButton fallback={goView} onClick={goBack} />
      <span className="truncate">{t('editDeal')}</span>
    </div>
  );

  const syncItems = async (id: number, nextItems: DealLineItem[]) => {
    const existing = deal?.lineItems || [];
    const kept = new Set(nextItems.filter((item) => item.id).map((item) => item.id as number));
    for (const item of existing) {
      if (item.id && !kept.has(item.id)) await deleteDealLineItemAPI(id, item.id);
    }
    for (const item of nextItems) {
      const payload = toLineItemPayload(item);
      if (item.id) await updateDealLineItemAPI(id, item.id, payload);
      else await createDealLineItemAPI(id, payload);
    }
  };

  const handleSubmit = async (payload: DealWritePayload, items: DealLineItem[]) => {
    if (!dealId) return;
    await updateDeal.mutateAsync({ id: dealId, data: payload });
    await syncItems(dealId, items);
    goView();
  };

  if (isLoading) return <PageWrapper title={pageTitle}><PageLoadingState label={t('loading')} /></PageWrapper>;
  if (!deal) return <PageWrapper title={pageTitle}><p className="p-6">{t('dealNotFound')}</p></PageWrapper>;

  return (
    <PageWrapper title={pageTitle}>
      <DealForm initial={deal} submitting={updateDeal.isPending} onSubmit={handleSubmit} onCancel={goBack} />
    </PageWrapper>
  );
};
