import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { Button, SectionLoadingState } from '../index';
import { KanbanBoard, type KanbanColumnDef, type KanbanMoveEvent } from '../kanban';
import { LeadKanbanCard, type LeadKanbanCardModel } from './LeadKanbanCard';
import { getLeadsAPI, patchLeadAPI } from '../../services/api';
import { queryKeys } from '../../hooks/useQueries';
import { normalizeLead } from '../../utils/normalizeLead';
import { resolvePrimaryPhone } from '../../utils/resolvePrimaryPhone';
import type { LeadApiFilters, Status } from '../../types';
import { getLocalizedApiErrorMessage } from '../../utils/apiErrorMessage';

const COLUMN_PAGE_SIZE = 30;

type LeadKanbanCardModelWithMeta = LeadKanbanCardModel & {
    statusId: number;
    statusName: string;
};

type LeadsKanbanViewProps = {
    baseFilters: LeadApiFilters;
    statuses: Status[];
    statusCounts?: Record<string, number>;
    users: Array<{ id: number; name?: string; username?: string }>;
    canDrag: boolean;
    canOpenLead: boolean;
    onOpenLead: (lead: LeadKanbanCardModel) => void;
    getStatusLabel: (statusName: string) => string;
    enabled?: boolean;
    showPhoneActions?: boolean;
    onSms?: (lead: LeadKanbanCardModel, phone: string) => void;
    onWhatsApp?: (lead: LeadKanbanCardModel, phone: string) => void;
};

const toLeadCard = (
    raw: any,
    fallbackStatusId?: number,
    fallbackStatusName?: string,
): LeadKanbanCardModelWithMeta => {
    const normalized = normalizeLead(raw);
    const phoneNumbers = normalized.phone_numbers || normalized.phoneNumbers || [];
    const statusIdRaw = normalized.status;
    const statusId =
        typeof statusIdRaw === 'number'
            ? statusIdRaw
            : fallbackStatusId != null
              ? fallbackStatusId
              : Number(statusIdRaw) || 0;
    const statusName =
        normalized.status_name ||
        fallbackStatusName ||
        (typeof statusIdRaw === 'string' ? statusIdRaw : '') ||
        '';

    return {
        ...normalized,
        id: normalized.id,
        name: normalized.name,
        phoneNumbers,
        phone: resolvePrimaryPhone({
            phone: normalized.phone_number || normalized.phone || '',
            phoneNumbers,
        }),
        type: normalized.type || '',
        priority: normalized.priority || '',
        assignedTo: normalized.assigned_to ?? normalized.assignedTo ?? 0,
        assigned_to: normalized.assigned_to,
        assigned_to_username: normalized.assigned_to_username,
        budget: typeof normalized.budget === 'number' ? normalized.budget : Number(normalized.budget) || 0,
        communicationWay:
            normalized.communication_way_name ||
            normalized.communication_way ||
            normalized.communicationWay ||
            '',
        createdAt: normalized.created_at || normalized.createdAt || '',
        status: statusName,
        statusId,
        statusName,
        leadCompanyName: normalized.leadCompanyName ?? normalized.lead_company_name,
        profession: normalized.profession,
        source: normalized.source || 'manual',
        campaign: normalized.campaign || null,
        campaign_name: normalized.campaign_name || null,
    };
};

export const LeadsKanbanView = ({
    baseFilters,
    statuses,
    statusCounts,
    users,
    canDrag,
    canOpenLead,
    onOpenLead,
    getStatusLabel,
    enabled = true,
    showPhoneActions = false,
    onSms,
    onWhatsApp,
}: LeadsKanbanViewProps) => {
    const { t, setAlertMessage, setAlertVariant, setIsAlertModalOpen } = useAppContext();
    const queryClient = useQueryClient();

    const visibleStatuses = useMemo(() => statuses.filter((s) => !s.isHidden), [statuses]);

    const filtersKey = useMemo(() => JSON.stringify(baseFilters), [baseFilters]);
    const statusIdsKey = useMemo(
        () => visibleStatuses.map((s) => s.id).join(','),
        [visibleStatuses],
    );

    const [itemsByColumn, setItemsByColumn] = useState<
        Record<string, LeadKanbanCardModelWithMeta[]>
    >({});
    const [columnPages, setColumnPages] = useState<Record<string, number>>({});
    const [hasMoreByColumn, setHasMoreByColumn] = useState<Record<string, boolean>>({});
    const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});
    const [movingId, setMovingId] = useState<string | null>(null);

    /** Bumps when filters/statuses change so page-1 queries can re-seed local state. */
    const seedToken = `${filtersKey}|${statusIdsKey}`;
    const seededTokenRef = useRef('');

    useEffect(() => {
        seededTokenRef.current = '';
        setItemsByColumn({});
        setColumnPages({});
        setHasMoreByColumn({});
        setLoadingMore({});
    }, [seedToken]);

    const columnQueries = useQueries({
        queries: visibleStatuses.map((status) => {
            const filters: LeadApiFilters = { ...baseFilters, status: status.name };
            return {
                queryKey: [...queryKeys.leads(filters, 1, COLUMN_PAGE_SIZE), 'kanban'] as const,
                queryFn: () => getLeadsAPI(filters, 1, COLUMN_PAGE_SIZE),
                enabled: enabled && visibleStatuses.length > 0,
                staleTime: 60 * 1000,
            };
        }),
    });

    const dataStamp = columnQueries.map((q) => q.dataUpdatedAt).join('|');

    useEffect(() => {
        if (!enabled) return;
        if (seededTokenRef.current === seedToken) return;
        if (visibleStatuses.length === 0) return;
        if (!columnQueries.every((q) => q.isSuccess || q.isError)) return;

        const nextItems: Record<string, LeadKanbanCardModelWithMeta[]> = {};
        const nextHasMore: Record<string, boolean> = {};

        visibleStatuses.forEach((status, index) => {
            const query = columnQueries[index];
            const colKey = String(status.id);
            if (!query?.isSuccess || !query.data) {
                nextItems[colKey] = [];
                nextHasMore[colKey] = false;
                return;
            }
            nextItems[colKey] = (query.data.results || []).map((raw: any) =>
                toLeadCard(raw, status.id, status.name),
            );
            nextHasMore[colKey] = Boolean(query.data.next);
        });

        setItemsByColumn(nextItems);
        setHasMoreByColumn(nextHasMore);
        setColumnPages({});
        seededTokenRef.current = seedToken;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataStamp, enabled, seedToken]);

    const columns: KanbanColumnDef[] = useMemo(
        () =>
            visibleStatuses.map((status) => ({
                id: status.id,
                title: getStatusLabel(status.name),
                color: status.color,
                count: statusCounts?.[status.name] ?? itemsByColumn[String(status.id)]?.length ?? 0,
            })),
        [visibleStatuses, getStatusLabel, statusCounts, itemsByColumn],
    );

    const isInitialLoading =
        enabled &&
        visibleStatuses.length > 0 &&
        seededTokenRef.current !== seedToken &&
        columnQueries.some((q) => q.isLoading || q.isFetching);

    const handleLoadMore = useCallback(
        async (column: KanbanColumnDef) => {
            const status = visibleStatuses.find((s) => String(s.id) === String(column.id));
            if (!status) return;
            const colKey = String(status.id);
            if (loadingMore[colKey]) return;

            const currentPage = columnPages[colKey] ?? 1;
            const nextPage = currentPage + 1;
            setLoadingMore((prev) => ({ ...prev, [colKey]: true }));
            try {
                const filters: LeadApiFilters = { ...baseFilters, status: status.name };
                const data = await queryClient.fetchQuery({
                    queryKey: [...queryKeys.leads(filters, nextPage, COLUMN_PAGE_SIZE), 'kanban'] as const,
                    queryFn: () => getLeadsAPI(filters, nextPage, COLUMN_PAGE_SIZE),
                });
                const results = (data?.results || []).map((raw: any) =>
                    toLeadCard(raw, status.id, status.name),
                );
                setItemsByColumn((prev) => {
                    const existing = prev[colKey] || [];
                    const existingIds = new Set(existing.map((l) => l.id));
                    return {
                        ...prev,
                        [colKey]: [...existing, ...results.filter((l) => !existingIds.has(l.id))],
                    };
                });
                setHasMoreByColumn((prev) => ({ ...prev, [colKey]: Boolean(data?.next) }));
                setColumnPages((prev) => ({ ...prev, [colKey]: nextPage }));
            } catch (error: any) {
                setAlertMessage(getLocalizedApiErrorMessage(error, t, 'errorLoadingLeads'));
                setAlertVariant('error');
                setIsAlertModalOpen(true);
            } finally {
                setLoadingMore((prev) => ({ ...prev, [colKey]: false }));
            }
        },
        [
            visibleStatuses,
            loadingMore,
            columnPages,
            baseFilters,
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
            const toStatus = visibleStatuses.find((s) => String(s.id) === toKey);
            if (!toStatus) return;

            const leadId = Number(itemId);
            let moved: LeadKanbanCardModelWithMeta | undefined;

            setItemsByColumn((prev) => {
                const fromList = prev[fromKey] || [];
                const toList = prev[toKey] || [];
                moved = fromList.find((l) => l.id === leadId);
                if (!moved) return prev;
                const updated: LeadKanbanCardModelWithMeta = {
                    ...moved,
                    statusId: toStatus.id,
                    statusName: toStatus.name,
                    status: toStatus.name,
                };
                return {
                    ...prev,
                    [fromKey]: fromList.filter((l) => l.id !== leadId),
                    [toKey]: [updated, ...toList.filter((l) => l.id !== leadId)],
                };
            });

            setMovingId(itemId);
            try {
                await patchLeadAPI(leadId, { status: toStatus.id });
                // Refresh counts / table caches without re-seeding board columns (keeps load-more + optimistic UI).
                queryClient.invalidateQueries({ queryKey: ['leadStatusCounts'] });
                queryClient.invalidateQueries({ queryKey: ['leads'] });
                queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
                queryClient.invalidateQueries({ queryKey: queryKeys.clientEvents(leadId) });
            } catch (error: any) {
                setItemsByColumn((prev) => {
                    if (!moved) return prev;
                    const fromList = prev[fromKey] || [];
                    const toList = prev[toKey] || [];
                    return {
                        ...prev,
                        [toKey]: toList.filter((l) => l.id !== leadId),
                        [fromKey]: [moved!, ...fromList.filter((l) => l.id !== leadId)],
                    };
                });
                setAlertMessage(getLocalizedApiErrorMessage(error, t, 'kanbanMoveFailed'));
                setAlertVariant('error');
                setIsAlertModalOpen(true);
            } finally {
                setMovingId(null);
            }
        },
        [
            visibleStatuses,
            queryClient,
            setAlertMessage,
            setAlertVariant,
            setIsAlertModalOpen,
            t,
        ],
    );

    const userNameById = useMemo(() => {
        const map = new Map<number, string>();
        for (const u of users) {
            map.set(u.id, u.name || u.username || String(u.id));
        }
        return map;
    }, [users]);

    if (!enabled) return null;

    if (visibleStatuses.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('kanbanNoStatuses')}
            </div>
        );
    }

    if (isInitialLoading) {
        return <SectionLoadingState label={t('loadingLeads')} />;
    }

    return (
        <KanbanBoard<LeadKanbanCardModelWithMeta>
            columns={columns}
            itemsByColumn={itemsByColumn}
            getItemId={(lead) => lead.id}
            getColumnId={(lead) => lead.statusId}
            disabled={!canDrag}
            isItemDisabled={(lead) => movingId === String(lead.id)}
            emptyColumnLabel={t('kanbanEmptyColumn')}
            dragInstructionsLabel={t('kanbanDragInstructions')}
            movingAnnounceLabel={t('kanbanMoving')}
            onMove={handleMove}
            renderCard={(lead) => {
                const assignedId = (lead as any).assigned_to || lead.assignedTo;
                const assigneeName =
                    (assignedId ? userNameById.get(Number(assignedId)) : null) ||
                    lead.assigned_to_username ||
                    null;
                return (
                    <LeadKanbanCard
                        lead={lead}
                        assigneeName={assigneeName}
                        onOpen={canOpenLead ? onOpenLead : undefined}
                        showPhoneActions={showPhoneActions}
                        onSms={onSms ? (phone) => onSms(lead, phone) : undefined}
                        onWhatsApp={onWhatsApp ? (phone) => onWhatsApp(lead, phone) : undefined}
                    />
                );
            }}
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
