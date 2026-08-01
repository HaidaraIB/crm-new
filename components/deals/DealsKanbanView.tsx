import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { Button, SectionLoadingState } from '../index';
import { KanbanBoard, type KanbanColumnDef, type KanbanMoveEvent } from '../kanban';
import { DealKanbanCard, type DealKanbanCardModel } from './DealKanbanCard';
import { getDealsAPI, patchDealAPI } from '../../services/api';
import { queryKeys } from '../../hooks/useQueries';
import type { Deal, DealFilters } from '../../types';
import { getLocalizedApiErrorMessage } from '../../utils/apiErrorMessage';

const COLUMN_PAGE_SIZE = 30;

export const DEAL_STAGE_ORDER: Deal['stage'][] = [
    'in_progress',
    'on_hold',
    'won',
    'lost',
    'cancelled',
];

export const DEAL_STAGE_COLORS: Record<string, string> = {
    in_progress: '#3b82f6',
    on_hold: '#eab308',
    won: '#22c55e',
    lost: '#ef4444',
    cancelled: '#a855f7',
};

type DealsKanbanViewProps = {
    search?: string;
    dealFilters: DealFilters;
    isRealEstate: boolean;
    canDrag?: boolean;
    onOpenDeal: (deal: DealKanbanCardModel) => void;
    getStageLabel: (stage: string) => string;
    enabled?: boolean;
};

const normalizeDeal = (raw: any): DealKanbanCardModel => {
    let clientName = '';
    if (raw.client_name) clientName = raw.client_name;
    else if (raw.clientName) clientName = raw.clientName;
    else if (typeof raw.client === 'object' && raw.client?.name) clientName = raw.client.name;

    let projectName = '';
    if (raw.project_name) projectName = raw.project_name;
    else if (typeof raw.project === 'object' && raw.project?.name) projectName = raw.project.name;
    else if (typeof raw.project === 'string') projectName = raw.project;

    let unitCode = '';
    if (raw.unit_code) unitCode = raw.unit_code;
    else if (typeof raw.unit === 'object' && raw.unit?.code) unitCode = raw.unit.code;
    else if (typeof raw.unit === 'string') unitCode = raw.unit;

    return {
        ...raw,
        id: raw.id,
        clientName,
        project: projectName,
        unit: unitCode,
        project_name: projectName || raw.project_name,
        unit_code: unitCode || raw.unit_code,
        paymentMethod: raw.payment_method || raw.paymentMethod || '',
        status: raw.status || '',
        stage: raw.stage,
        value: typeof raw.value === 'number' ? raw.value : Number(raw.value) || 0,
        startDate: raw.start_date || raw.startDate || null,
        closedDate: raw.closed_date || raw.closedDate || null,
        startedBy: raw.started_by || raw.startedBy || null,
        closedBy: raw.closed_by || raw.closedBy || null,
        client: typeof raw.client === 'number' ? raw.client : raw.client?.id,
        employee: typeof raw.employee === 'number' ? raw.employee : raw.employee?.id,
    };
};

const matchesClientFilters = (
    deal: DealKanbanCardModel,
    filters: DealFilters,
    isRealEstate: boolean,
): boolean => {
    if (filters.status && filters.status !== 'All') {
        if ((deal.status || '') !== filters.status) return false;
    }
    if (filters.paymentMethod && filters.paymentMethod !== 'All') {
        if ((deal.paymentMethod || '') !== filters.paymentMethod) return false;
    }
    if (isRealEstate && filters.unit && filters.unit !== 'All') {
        if ((deal.unit || '') !== filters.unit) return false;
    }
    if (isRealEstate && filters.project && filters.project !== 'All') {
        if ((deal.project || '') !== filters.project) return false;
    }
    if (filters.valueMin) {
        const minValue = parseFloat(filters.valueMin);
        if (!Number.isNaN(minValue) && (deal.value || 0) < minValue) return false;
    }
    if (filters.valueMax) {
        const maxValue = parseFloat(filters.valueMax);
        if (!Number.isNaN(maxValue) && (deal.value || 0) > maxValue) return false;
    }
    return true;
};

export const DealsKanbanView = ({
    search,
    dealFilters,
    isRealEstate,
    canDrag = true,
    onOpenDeal,
    getStageLabel,
    enabled = true,
}: DealsKanbanViewProps) => {
    const { t, setAlertMessage, setAlertVariant, setIsAlertModalOpen } = useAppContext();
    const queryClient = useQueryClient();

    const searchKey = search?.trim() || '';
    const filtersKey = useMemo(
        () =>
            JSON.stringify({
                search: searchKey,
                status: dealFilters.status,
                paymentMethod: dealFilters.paymentMethod,
                unit: dealFilters.unit,
                project: dealFilters.project,
                valueMin: dealFilters.valueMin,
                valueMax: dealFilters.valueMax,
            }),
        [searchKey, dealFilters],
    );

    const [itemsByColumn, setItemsByColumn] = useState<Record<string, DealKanbanCardModel[]>>({});
    const [columnPages, setColumnPages] = useState<Record<string, number>>({});
    const [hasMoreByColumn, setHasMoreByColumn] = useState<Record<string, boolean>>({});
    const [countsByColumn, setCountsByColumn] = useState<Record<string, number>>({});
    const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});
    const [movingId, setMovingId] = useState<string | null>(null);

    const seedToken = filtersKey;
    const seededTokenRef = useRef('');

    useEffect(() => {
        seededTokenRef.current = '';
        setItemsByColumn({});
        setColumnPages({});
        setHasMoreByColumn({});
        setCountsByColumn({});
        setLoadingMore({});
    }, [seedToken]);

    const columnQueries = useQueries({
        queries: DEAL_STAGE_ORDER.map((stage) => ({
            queryKey: [...queryKeys.deals(1, COLUMN_PAGE_SIZE, searchKey, stage), 'kanban'] as const,
            queryFn: () =>
                getDealsAPI(1, COLUMN_PAGE_SIZE, {
                    ...(searchKey ? { search: searchKey } : {}),
                    stage,
                }),
            enabled: enabled,
            staleTime: 60 * 1000,
        })),
    });

    const dataStamp = columnQueries.map((q) => q.dataUpdatedAt).join('|');

    useEffect(() => {
        if (!enabled) return;
        if (seededTokenRef.current === seedToken) return;
        if (!columnQueries.every((q) => q.isSuccess || q.isError)) return;

        const nextItems: Record<string, DealKanbanCardModel[]> = {};
        const nextHasMore: Record<string, boolean> = {};
        const nextCounts: Record<string, number> = {};

        DEAL_STAGE_ORDER.forEach((stage, index) => {
            const query = columnQueries[index];
            if (!query?.isSuccess || !query.data) {
                nextItems[stage] = [];
                nextHasMore[stage] = false;
                nextCounts[stage] = 0;
                return;
            }
            const mapped = (query.data.results || [])
                .map(normalizeDeal)
                .filter((d) => matchesClientFilters(d, dealFilters, isRealEstate));
            nextItems[stage] = mapped;
            nextHasMore[stage] = Boolean(query.data.next);
            nextCounts[stage] = query.data.count ?? mapped.length;
        });

        setItemsByColumn(nextItems);
        setHasMoreByColumn(nextHasMore);
        setCountsByColumn(nextCounts);
        setColumnPages({});
        seededTokenRef.current = seedToken;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataStamp, enabled, seedToken]);

    const columns: KanbanColumnDef[] = useMemo(
        () =>
            DEAL_STAGE_ORDER.map((stage) => ({
                id: stage,
                title: getStageLabel(stage),
                color: DEAL_STAGE_COLORS[stage],
                count: countsByColumn[stage] ?? itemsByColumn[stage]?.length ?? 0,
            })),
        [getStageLabel, countsByColumn, itemsByColumn],
    );

    const isInitialLoading =
        enabled &&
        seededTokenRef.current !== seedToken &&
        columnQueries.some((q) => q.isLoading || q.isFetching);

    const handleLoadMore = useCallback(
        async (column: KanbanColumnDef) => {
            const stage = String(column.id);
            if (loadingMore[stage]) return;

            const currentPage = columnPages[stage] ?? 1;
            const nextPage = currentPage + 1;
            setLoadingMore((prev) => ({ ...prev, [stage]: true }));
            try {
                const data = await queryClient.fetchQuery({
                    queryKey: [
                        ...queryKeys.deals(nextPage, COLUMN_PAGE_SIZE, searchKey, stage),
                        'kanban',
                    ] as const,
                    queryFn: () =>
                        getDealsAPI(nextPage, COLUMN_PAGE_SIZE, {
                            ...(searchKey ? { search: searchKey } : {}),
                            stage,
                        }),
                });
                const results = (data?.results || [])
                    .map(normalizeDeal)
                    .filter((d) => matchesClientFilters(d, dealFilters, isRealEstate));
                setItemsByColumn((prev) => {
                    const existing = prev[stage] || [];
                    const existingIds = new Set(existing.map((d) => d.id));
                    return {
                        ...prev,
                        [stage]: [...existing, ...results.filter((d) => !existingIds.has(d.id))],
                    };
                });
                setHasMoreByColumn((prev) => ({ ...prev, [stage]: Boolean(data?.next) }));
                setColumnPages((prev) => ({ ...prev, [stage]: nextPage }));
                if (typeof data?.count === 'number') {
                    setCountsByColumn((prev) => ({ ...prev, [stage]: data.count }));
                }
            } catch (error: any) {
                setAlertMessage(getLocalizedApiErrorMessage(error, t, 'errorLoadingDeals'));
                setAlertVariant('error');
                setIsAlertModalOpen(true);
            } finally {
                setLoadingMore((prev) => ({ ...prev, [stage]: false }));
            }
        },
        [
            loadingMore,
            columnPages,
            searchKey,
            dealFilters,
            isRealEstate,
            queryClient,
            setAlertMessage,
            setAlertVariant,
            setIsAlertModalOpen,
            t,
        ],
    );

    const handleMove = useCallback(
        async ({ itemId, fromColumnId, toColumnId }: KanbanMoveEvent) => {
            if (String(fromColumnId) === String(toColumnId)) return;

            const fromKey = String(fromColumnId);
            const toKey = String(toColumnId);
            if (!DEAL_STAGE_ORDER.includes(toKey as Deal['stage'])) return;

            const dealId = Number(itemId);
            let moved: DealKanbanCardModel | undefined;

            setItemsByColumn((prev) => {
                const fromList = prev[fromKey] || [];
                const toList = prev[toKey] || [];
                moved = fromList.find((d) => d.id === dealId);
                if (!moved) return prev;
                const updated: DealKanbanCardModel = {
                    ...moved,
                    stage: toKey as Deal['stage'],
                };
                return {
                    ...prev,
                    [fromKey]: fromList.filter((d) => d.id !== dealId),
                    [toKey]: [updated, ...toList.filter((d) => d.id !== dealId)],
                };
            });
            setCountsByColumn((prev) => ({
                ...prev,
                [fromKey]: Math.max(0, (prev[fromKey] ?? 1) - 1),
                [toKey]: (prev[toKey] ?? 0) + 1,
            }));

            setMovingId(itemId);
            try {
                await patchDealAPI(dealId, { stage: toKey });
                queryClient.invalidateQueries({ queryKey: ['deals'] });
            } catch (error: any) {
                setItemsByColumn((prev) => {
                    if (!moved) return prev;
                    const fromList = prev[fromKey] || [];
                    const toList = prev[toKey] || [];
                    return {
                        ...prev,
                        [toKey]: toList.filter((d) => d.id !== dealId),
                        [fromKey]: [moved!, ...fromList.filter((d) => d.id !== dealId)],
                    };
                });
                setCountsByColumn((prev) => ({
                    ...prev,
                    [fromKey]: (prev[fromKey] ?? 0) + 1,
                    [toKey]: Math.max(0, (prev[toKey] ?? 1) - 1),
                }));
                setAlertMessage(getLocalizedApiErrorMessage(error, t, 'kanbanMoveDealFailed'));
                setAlertVariant('error');
                setIsAlertModalOpen(true);
            } finally {
                setMovingId(null);
            }
        },
        [queryClient, setAlertMessage, setAlertVariant, setIsAlertModalOpen, t],
    );

    if (!enabled) return null;

    if (isInitialLoading) {
        return <SectionLoadingState label={t('loading')} />;
    }

    return (
        <KanbanBoard<DealKanbanCardModel>
            columns={columns}
            itemsByColumn={itemsByColumn}
            getItemId={(deal) => deal.id}
            getColumnId={(deal) => deal.stage}
            disabled={!canDrag}
            isItemDisabled={(deal) => movingId === String(deal.id)}
            emptyColumnLabel={t('kanbanEmptyDealColumn')}
            dragInstructionsLabel={t('kanbanDragDealInstructions')}
            movingAnnounceLabel={t('kanbanMoving')}
            onMove={handleMove}
            renderCard={(deal) => (
                <DealKanbanCard
                    deal={deal}
                    isRealEstate={isRealEstate}
                    onOpen={onOpenDeal}
                />
            )}
            renderColumnFooter={(column) => {
                const colKey = String(column.id);
                if (!hasMoreByColumn[colKey]) return null;
                return (
                    <Button
                        type="button"
                        variant="secondary"
                        className="w-full mt-1"
                        disabled={Boolean(loadingMore[colKey])}
                        loading={Boolean(loadingMore[colKey])}
                        onClick={() => handleLoadMore(column)}
                    >
                        {t('kanbanLoadMore')}
                    </Button>
                );
            }}
        />
    );
};
