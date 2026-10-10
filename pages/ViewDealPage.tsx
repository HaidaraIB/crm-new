import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { Button, Card, PageBackButton, PageLoadingState, PageWrapper } from '../components';
import { DealActivitySection, DealLineItemsSection, DealTasksSection } from '../components/deals/DealDetailSections';
import { DealWonLostModal } from '../components/deals/DealWonLostModal';
import { useAddDealNote, useCreateTask, useDeal, useDealPipelines, useDealTimeline, useMoveDeal, useStages, useTasks } from '../hooks/useQueries';
import { markDealWonAPI, reopenDealAPI } from '../services/api';
import { formatDealMoney, textOnStageColor } from '../utils/deals/dealFormatters';
import { PAGE_TAB_ACTIVE, PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';
import { extractViewDealIdFromPath, getCompanyDealRoute, getCompanyViewLeadRoute } from '../utils/routing';
import type { DealPipelineStage } from '../types';

export const ViewDealPage = () => {
  const { t, setCurrentPage, currentUser } = useAppContext();
  const queryClient = useQueryClient();
  const dealId = extractViewDealIdFromPath(window.location.pathname) || undefined;
  const { data: deal, isLoading } = useDeal(dealId);
  const { data: pipelines = [] } = useDealPipelines();
  const { data: timeline = [] } = useDealTimeline(dealId);
  const { data: tasksData } = useTasks();
  const { data: stagesData } = useStages();
  const moveDeal = useMoveDeal();
  const addNote = useAddDealNote();
  const createTask = useCreateTask();
  const [tab, setTab] = useState<'overview' | 'items' | 'activity' | 'tasks'>('overview');
  const [note, setNote] = useState('');
  const [pendingStage, setPendingStage] = useState<DealPipelineStage | null>(null);
  const [taskNote, setTaskNote] = useState('');

  const company = currentUser?.company;
  const goDeals = () => {
    window.history.pushState({}, '', getCompanyDealRoute(company?.name, company?.domain, 'deals'));
    setCurrentPage('Deals');
  };
  const pageTitle = (label: React.ReactNode) => (
    <div className="flex min-w-0 items-center gap-3">
      <PageBackButton fallback={goDeals} />
      <span className="truncate">{label}</span>
    </div>
  );
  const go = (segment: string, page: 'Deals' | 'EditDeal' | 'ViewLead') => {
    const route = page === 'ViewLead'
      ? getCompanyViewLeadRoute(company?.name, company?.domain, deal?.client, company?.specialization)
      : getCompanyDealRoute(company?.name, company?.domain, segment);
    window.history.pushState({}, '', route);
    setCurrentPage(page);
  };

  if (isLoading) return <PageWrapper title={pageTitle(t('deals'))}><PageLoadingState label={t('loading')} /></PageWrapper>;
  if (!deal) return <PageWrapper title={pageTitle(t('deals'))}><p className="p-6">{t('dealNotFound')}</p></PageWrapper>;

  const pipeline = pipelines.find((item) => item.id === deal.pipeline) || pipelines.find((item) => item.isDefault);
  const stages = pipeline?.stages || [];
  const wonStage = stages.find((stage) => stage.stageType === 'won') || null;
  const lostStage = stages.find((stage) => stage.stageType === 'lost') || null;
  const tasks = (Array.isArray(tasksData) ? tasksData : tasksData?.results || []).filter((task: { deal?: number }) => task.deal === deal.id);
  const leadStages = Array.isArray(stagesData) ? stagesData : stagesData?.results || [];

  const moveTo = async (stage: DealPipelineStage, extra?: { lostReason?: number; lostNote?: string }) => {
    if (stage.stageType === 'won' && !extra) {
      await markDealWonAPI(deal.id);
      return;
    }
    await moveDeal.mutateAsync({ id: deal.id, pipelineStage: stage.id, lostReason: extra?.lostReason, lostNote: extra?.lostNote });
  };

  return (
    <PageWrapper
      title={pageTitle(deal.title || deal.clientName)}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => go(`edit-deal/${deal.id}`, 'EditDeal')}>{t('editDeal')}</Button>
          {deal.stageType !== 'won' && <Button onClick={() => wonStage && setPendingStage(wonStage)} disabled={!wonStage}>{t('dealMarkWon')}</Button>}
          {deal.stageType !== 'lost' && <Button variant="secondary" onClick={() => lostStage && setPendingStage(lostStage)} disabled={!lostStage}>{t('dealMarkLost')}</Button>}
          {deal.stageType !== 'open' && <Button variant="secondary" onClick={async () => { await reopenDealAPI(deal.id); await queryClient.invalidateQueries({ queryKey: ['deal'] }); await queryClient.invalidateQueries({ queryKey: ['deals'] }); await queryClient.invalidateQueries({ queryKey: ['dealSummary'] }); }}>{t('dealReopen')}</Button>}
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <p className="text-3xl font-semibold tabular-nums text-gray-900 dark:text-white">{formatDealMoney(deal.value, deal.currency)}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t('dealOwner')}: <span className="font-medium text-gray-900 dark:text-white">{deal.employeeUsername || '-'}</span>
        </p>
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto overflow-y-hidden pb-1">
        {stages.map((stage) => {
          const active = deal.pipelineStage === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => {
                if (stage.id === deal.pipelineStage) return;
                if (stage.stageType === 'won' || stage.stageType === 'lost') setPendingStage(stage);
                else void moveTo(stage);
              }}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
                active
                  ? ''
                  : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
              }`}
              style={active ? { backgroundColor: stage.color, borderColor: stage.color, color: textOnStageColor(stage.color) } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? 'currentColor' : stage.color }} />
              {stage.name}
            </button>
          );
        })}
      </div>
      <div className="mb-4 flex gap-4 overflow-x-auto overflow-y-hidden border-b border-gray-200 dark:border-gray-700">
        {(['overview', 'items', 'activity', 'tasks'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`whitespace-nowrap px-1 py-3 text-sm ${tab === key ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}
          >
            {t(key === 'overview' ? 'dealOverview' : key === 'items' ? 'dealLineItems' : key === 'activity' ? 'dealActivity' : 'dealTasksTab')}
          </button>
        ))}
      </div>
      {tab === 'overview' && (
        <Card>
          <dl className="grid grid-cols-1 gap-4 p-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-gray-600 dark:text-gray-300">{t('dealLinkedLead')}</dt>
              <dd className="mt-1">
                <button type="button" className="font-medium text-primary-700 hover:underline dark:text-primary-300" onClick={() => deal.client && go('', 'ViewLead')}>{deal.clientName || '-'}</button>
              </dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-300">{t('status')}</dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-white">{deal.status === 'reservation' ? t('reservation') : deal.status === 'contracted' ? t('contracted') : deal.status === 'closed' ? t('closed') : deal.status}</dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-300">{t('paymentMethod')}</dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-white">{deal.paymentMethod === 'cash' ? t('cash') : deal.paymentMethod === 'installment' ? t('installment') : deal.paymentMethod}</dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-300">{t('dealExpectedClose')}</dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-white">{deal.expectedCloseDate || '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-300">{t('dealProbability')}</dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-white">{deal.probability ?? deal.stageProbability ?? 0}%</dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-300">{t('dealWeighted')}</dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-white">{formatDealMoney(deal.weightedValue, deal.currency)}</dd>
            </div>
            {deal.projectName && (
              <div>
                <dt className="text-gray-600 dark:text-gray-300">{t('project')}</dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-white">{deal.projectName}</dd>
              </div>
            )}
            {deal.unitCode && (
              <div>
                <dt className="text-gray-600 dark:text-gray-300">{t('unit')}</dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-white">{deal.unitCode}</dd>
              </div>
            )}
            {deal.lostReasonName && (
              <div>
                <dt className="text-gray-600 dark:text-gray-300">{t('dealLostReasons')}</dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-white">{deal.lostReasonName}</dd>
              </div>
            )}
            {deal.description && <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-100 md:col-span-2">{deal.description}</p>}
          </dl>
        </Card>
      )}
      {tab === 'items' && (
        <Card>
          <div className="p-4">
            <DealLineItemsSection deal={deal} onEdit={() => go(`edit-deal/${deal.id}`, 'EditDeal')} />
          </div>
        </Card>
      )}
      {tab === 'activity' && (
        <Card>
          <div className="p-4">
            <DealActivitySection
              events={timeline}
              note={note}
              saving={addNote.isPending}
              onNoteChange={setNote}
              onAddNote={async () => { await addNote.mutateAsync({ id: deal.id, body: note.trim() }); setNote(''); }}
            />
          </div>
        </Card>
      )}
      {tab === 'tasks' && (
        <Card>
          <div className="p-4">
            <DealTasksSection
              tasks={tasks}
              note={taskNote}
              saving={createTask.isPending}
              onNoteChange={setTaskNote}
              onAdd={async () => {
                if (!leadStages[0]) return;
                await createTask.mutateAsync({ deal: deal.id, stage: leadStages[0].id, notes: taskNote.trim() });
                setTaskNote('');
              }}
            />
          </div>
        </Card>
      )}
      <DealWonLostModal
        stage={pendingStage}
        submitting={moveDeal.isPending}
        onClose={() => setPendingStage(null)}
        onConfirm={async (payload) => {
          if (!pendingStage) return;
          if (pendingStage.stageType === 'won') await markDealWonAPI(deal.id);
          else await moveTo(pendingStage, payload);
          await queryClient.invalidateQueries({ queryKey: ['deal'] });
          await queryClient.invalidateQueries({ queryKey: ['deals'] });
          await queryClient.invalidateQueries({ queryKey: ['dealSummary'] });
          setPendingStage(null);
        }}
      />
    </PageWrapper>
  );
};
