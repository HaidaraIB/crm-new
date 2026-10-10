import React, { useEffect, useMemo, useState } from 'react';
import { KanbanBoard } from '../kanban';
import { DealKanbanCard } from './DealKanbanCard';
import { DealWonLostModal } from './DealWonLostModal';
import { getDealsAPI, moveDealAPI } from '../../services/api';
import { mapApiDeal } from '../../utils/deals/dealMapper';
import { formatDealMoney } from '../../utils/deals/dealFormatters';
import { useAppContext } from '../../context/AppContext';
import type { Deal, DealPipeline, DealPipelineStage } from '../../types';
import type { DealQueryParams } from '../../services/api';

const PAGE_SIZE = 40;

type DealsKanbanViewProps = {
  pipeline?: DealPipeline;
  filters: DealQueryParams;
  refreshKey?: number;
  onOpen: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
};

export const DealsKanbanView = ({ pipeline, filters, refreshKey = 0, onOpen, onEdit, onDelete }: DealsKanbanViewProps) => {
  const { t } = useAppContext();
  const stages = pipeline?.stages || [];
  const [itemsByColumn, setItemsByColumn] = useState<Record<string, Deal[]>>({});
  const [pending, setPending] = useState<{ deal: Deal; stage: DealPipelineStage } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!stages.length) return;
    Promise.all(stages.map(async (stage) => {
      const data = await getDealsAPI(1, PAGE_SIZE, { ...filters, pipeline: pipeline?.id, stageId: stage.id, outcome: undefined });
      const rows = Array.isArray(data?.results) ? data.results : [];
      return [String(stage.id), rows.map((row: Record<string, unknown>) => mapApiDeal(row))] as const;
    })).then((entries) => {
      if (!cancelled) setItemsByColumn(Object.fromEntries(entries));
    }).catch(() => {
      if (!cancelled) setItemsByColumn({});
    });
    return () => { cancelled = true; };
  }, [pipeline?.id, stages.map((stage) => stage.id).join(','), JSON.stringify(filters), refreshKey]);

  const columns = useMemo(() => stages.map((stage) => ({
    id: stage.id,
    title: stage.name,
    color: stage.color,
    count: itemsByColumn[String(stage.id)]?.length || 0,
  })), [stages, itemsByColumn]);

  const moveLocally = (deal: Deal, stage: DealPipelineStage) => {
    setItemsByColumn((prev) => {
      const next: Record<string, Deal[]> = {};
      Object.entries(prev).forEach(([key, list]) => {
        next[key] = list.filter((item) => item.id !== deal.id);
      });
      const updated = {
        ...deal,
        pipelineStage: stage.id,
        pipelineStageName: stage.name,
        pipelineStageColor: stage.color,
        stageType: stage.stageType,
      };
      next[String(stage.id)] = [updated, ...(next[String(stage.id)] || [])];
      return next;
    });
  };

  const applyMove = async (deal: Deal, stage: DealPipelineStage, extra?: { lostReason?: number; lostNote?: string }) => {
    setSubmitting(true);
    try {
      await moveDealAPI(deal.id, { pipelineStage: stage.id, lostReason: extra?.lostReason, lostNote: extra?.lostNote });
      moveLocally(deal, stage);
      setPending(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <KanbanBoard
        columns={columns}
        itemsByColumn={itemsByColumn}
        getItemId={(deal) => deal.id}
        getColumnId={(deal) => deal.pipelineStage || stages[0]?.id || ''}
        emptyColumnLabel={t('noDealsFound')}
        onMove={({ itemId, toColumnId }) => {
          const deal = Object.values(itemsByColumn).flat().find((item) => String(item.id) === itemId);
          const stage = stages.find((item) => String(item.id) === String(toColumnId));
          if (!deal || !stage) return;
          if (stage.stageType === 'won' || stage.stageType === 'lost') {
            setPending({ deal, stage });
            return;
          }
          return applyMove(deal, stage);
        }}
        renderCard={(deal) => (
          <DealKanbanCard deal={deal} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
        )}
        renderColumnFooter={(column) => {
          const list = itemsByColumn[String(column.id)] || [];
          const total = list.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
          const weighted = list.reduce((sum, deal) => sum + Number(deal.weightedValue || 0), 0);
          return (
            <p className="px-3 pb-2 text-xs text-gray-600 dark:text-gray-300 tabular-nums">
              {formatDealMoney(total)} · {t('dealWeighted')} {formatDealMoney(weighted)}
            </p>
          );
        }}
      />
      <DealWonLostModal
        stage={pending?.stage || null}
        submitting={submitting}
        onClose={() => setPending(null)}
        onConfirm={(payload) => pending && applyMove(pending.deal, pending.stage, payload)}
      />
    </>
  );
};
