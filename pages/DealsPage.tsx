import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, FilterButton, Pagination, PageLoadingState, PageWrapper, PlusIcon, RefreshButton, TrashIcon, ViewModeToggle, hasActiveFilters, useEntityViewMode } from '../components';
import { BulkActionBar } from '../components/bulk/BulkActionBar';
import { DEFAULT_DEAL_FILTERS } from '../components/drawers/DealsFilterDrawer';
import { DealSummaryBar } from '../components/deals/DealSummaryBar';
import { DealsKanbanView } from '../components/deals/DealsKanbanView';
import { DealsTable } from '../components/deals/DealsTable';
import { useBulkDealAction, useDealPipelines, useDealSummary, useDeals, useDeleteDeal, useUsers } from '../hooks/useQueries';
import { getDealsAPI } from '../services/api';
import { mapApiDeal } from '../utils/deals/dealMapper';
import { dealFiltersToQuery } from '../utils/deals/dealQuery';
import { exportToExcel } from '../utils/exportToExcel';
import { getCompanyDealRoute } from '../utils/routing';
import { usePersistedPageSize } from '../hooks/usePersistedPageSize';
import type { Deal } from '../types';

export const DealsPage = () => {
  const {
    t,
    currentUser,
    dealFilters,
    setDealFilters,
    setIsDealsFilterDrawerOpen,
    setCurrentPage,
    setConfirmDeleteConfig,
    setIsConfirmDeleteModalOpen,
  } = useAppContext();
  const [viewMode, setViewMode] = useEntityViewMode('deals');
  const isBoard = viewMode === 'board';
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize('deals');
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkOwnerValue, setBulkOwnerValue] = useState('');
  const [bulkStageValue, setBulkStageValue] = useState('');
  const [boardRevision, setBoardRevision] = useState(0);
  const [pipelineId, setPipelineId] = useState<number | null>(null);
  const { data: pipelines = [] } = useDealPipelines();
  const pipeline = pipelines.find((item) => item.id === pipelineId) || pipelines.find((item) => item.isDefault) || pipelines[0];
  const query = useMemo(() => dealFiltersToQuery(dealFilters, pipeline?.id), [dealFilters, pipeline?.id]);
  const { data, isLoading, isError, refetch, isFetching } = useDeals(page, { enabled: !isBoard }, pageSize, undefined, undefined, query);
  const { data: summary } = useDealSummary(query);
  const { data: usersResponse } = useUsers();
  const deleteDeal = useDeleteDeal();
  const bulk = useBulkDealAction();
  const users = Array.isArray(usersResponse) ? usersResponse : usersResponse?.results || [];
  const deals: Deal[] = data?.results || [];
  const total = data?.count || 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const isRealEstate = currentUser?.company?.specialization === 'real_estate';

  useEffect(() => { setPage(1); }, [JSON.stringify(query), pageSize]);
  useEffect(() => {
    if (selected.length === 0) {
      setBulkOwnerValue('');
      setBulkStageValue('');
    }
  }, [selected.length]);

  const go = (segment: string, pageName: 'CreateDeal' | 'EditDeal' | 'ViewDeal') => {
    window.history.pushState({}, '', getCompanyDealRoute(currentUser?.company?.name, currentUser?.company?.domain, segment));
    setCurrentPage(pageName);
  };

  const confirmDelete = (ids: number[], name?: string) => {
    setConfirmDeleteConfig({
      title: t('deleteDeal'),
      message: t('confirmDeleteDeal'),
      itemName: name || String(ids.length),
      onConfirm: async () => {
        if (ids.length === 1) await deleteDeal.mutateAsync(ids[0]);
        else await bulk.mutateAsync({ ids, action: 'delete' });
        setSelected([]);
        setBoardRevision((value) => value + 1);
      },
    });
    setIsConfirmDeleteModalOpen(true);
  };

  const exportFiltered = async () => {
    const payload = await getDealsAPI(undefined, undefined, query);
    const rawRows = Array.isArray(payload) ? payload : payload?.results || [];
    const rows = rawRows.map((row: Record<string, unknown>) => mapApiDeal(row));
    exportToExcel(
      rows.map((deal: Deal) => ({
        id: deal.id,
        title: deal.title,
        clientName: deal.clientName,
        stage: deal.pipelineStageName || deal.stage,
        value: deal.value,
        owner: deal.employeeUsername || '',
      })),
      [
        { key: 'id', label: t('dealId') },
        { key: 'title', label: t('dealTitle') },
        { key: 'clientName', label: t('clientName') },
        { key: 'stage', label: t('stage') },
        { key: 'value', label: t('value') },
        { key: 'owner', label: t('dealOwner') },
      ],
      `deals-export-${new Date().toISOString().slice(0, 10)}`,
      t('deals'),
    );
  };

  if (!isBoard && isLoading) {
    return <PageWrapper title={t('deals')}><PageLoadingState label={t('loading')} /></PageWrapper>;
  }
  if (!isBoard && isError) {
    return <PageWrapper title={t('deals')}><p className="p-6 text-red-600">{t('errorLoadingDeals')}</p></PageWrapper>;
  }

  return (
    <PageWrapper
      title={t('deals')}
      actions={
        <>
          <FilterButton onClick={() => setIsDealsFilterDrawerOpen(true)} hasActiveFilters={hasActiveFilters(dealFilters, DEFAULT_DEAL_FILTERS)} />
          <RefreshButton onClick={() => { void refetch(); }} loading={isFetching && !isLoading} />
          <Button variant="secondary" onClick={() => { void exportFiltered(); }}>{t('exportDeals')}</Button>
          <Button onClick={() => go('create-deal', 'CreateDeal')}><PlusIcon className="w-4 h-4" /> {t('createDeal')}</Button>
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <select
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          value={pipeline?.id || ''}
          onChange={(e) => {
            setPipelineId(Number(e.target.value));
            setDealFilters({ ...dealFilters, pipeline: e.target.value });
          }}
        >
          {pipelines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>
      <div className="mb-4"><DealSummaryBar summary={summary} /></div>
      {isBoard ? (
        <DealsKanbanView
          pipeline={pipeline}
          filters={query}
          refreshKey={boardRevision}
          onOpen={(deal) => go(`view-deal/${deal.id}`, 'ViewDeal')}
          onEdit={(deal) => go(`edit-deal/${deal.id}`, 'EditDeal')}
          onDelete={(deal) => confirmDelete([deal.id], deal.clientName)}
        />
      ) : (
        <>
          <DealsTable
            deals={deals}
            isRealEstate={isRealEstate}
            selectedIds={selected}
            onToggle={(id) => setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])}
            onTogglePage={(ids, checked) => setSelected((prev) => checked ? Array.from(new Set([...prev, ...ids])) : prev.filter((id) => !ids.includes(id)))}
            onDelete={(id) => confirmDelete([id], deals.find((deal) => deal.id === id)?.clientName)}
            onEdit={(id) => go(`edit-deal/${id}`, 'EditDeal')}
            onView={(id) => go(`view-deal/${id}`, 'ViewDeal')}
          />
          <Pagination
            page={page}
            totalPages={pageCount}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            disabled={isFetching}
          />
        </>
      )}
      <BulkActionBar selectedCount={selected.length} selectedLabel={t('selectedCount').replace('{count}', String(selected.length))} clearLabel={t('clearSelection')} onClear={() => setSelected([])}>
        <select
          className="!h-8 shrink-0 rounded-full border border-gray-300 bg-white px-3 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-white/10 dark:text-white"
          value={bulkOwnerValue}
          disabled={bulk.isPending}
          onChange={(e) => {
            const value = e.target.value;
            setBulkOwnerValue(value);
            const employee = Number(value);
            if (!employee) return;
            void bulk.mutateAsync({ ids: selected, action: 'assign', employee }).then(() => setSelected([]));
          }}
        >
          <option value="">{t('dealOwner')}</option>
          {users.map((user: { id: number; username?: string; name?: string }) => <option key={user.id} value={user.id}>{user.name || user.username}</option>)}
        </select>
        <select
          className="!h-8 shrink-0 rounded-full border border-gray-300 bg-white px-3 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-white/10 dark:text-white"
          value={bulkStageValue}
          disabled={bulk.isPending}
          onChange={(e) => {
            const value = e.target.value;
            setBulkStageValue(value);
            const stage = pipeline?.stages.find((item) => String(item.id) === value);
            if (!stage || stage.stageType === 'lost') return;
            void bulk.mutateAsync({ ids: selected, action: 'move', pipelineStage: stage.id }).then(() => setSelected([]));
          }}
        >
          <option value="">{t('dealBulkMove')}</option>
          {(pipeline?.stages || []).filter((stage) => stage.stageType !== 'lost').map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
        </select>
        <Button
          variant="danger"
          onClick={() => confirmDelete(selected)}
          disabled={bulk.isPending}
          className="!h-8 shrink-0 whitespace-nowrap !rounded-full px-3"
          title={t('delete')}
        >
          <TrashIcon className="h-4 w-4 shrink-0" />
          {t('delete')}
        </Button>
      </BulkActionBar>
    </PageWrapper>
  );
};
