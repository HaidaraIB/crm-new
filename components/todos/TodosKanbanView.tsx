import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { SectionLoadingState } from '../index';
import { KanbanBoard, type KanbanColumnDef, type KanbanMoveEvent } from '../kanban';
import { TodoKanbanCard, type TodoKanbanItem } from './TodoKanbanCard';
import { patchTaskAPI, patchClientTaskAPI } from '../../services/api';
import { queryKeys } from '../../hooks/useQueries';
import type { Stage } from '../../types';
import { getLocalizedApiErrorMessage } from '../../utils/apiErrorMessage';

type TodosKanbanViewProps = {
    items: TodoKanbanItem[];
    stages: Stage[];
    canDrag?: boolean;
    isLoading?: boolean;
    onOpenItem?: (item: TodoKanbanItem) => void;
    formatDealStage?: (stage: string | null | undefined) => string;
    enabled?: boolean;
};

export const TodosKanbanView = ({
    items,
    stages,
    canDrag = true,
    isLoading = false,
    onOpenItem,
    formatDealStage,
    enabled = true,
}: TodosKanbanViewProps) => {
    const { t, setAlertMessage, setAlertVariant, setIsAlertModalOpen } = useAppContext();
    const queryClient = useQueryClient();
    const [localItems, setLocalItems] = useState<TodoKanbanItem[]>(items);
    const [movingId, setMovingId] = useState<string | null>(null);

    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    const columns: KanbanColumnDef[] = useMemo(
        () =>
            stages.map((stage) => ({
                id: stage.id,
                title: stage.name,
                color: stage.color,
                count: localItems.filter((item) => item.stageId === stage.id).length,
            })),
        [stages, localItems],
    );

    const itemsByColumn = useMemo(() => {
        const map: Record<string, TodoKanbanItem[]> = {};
        for (const stage of stages) {
            map[String(stage.id)] = [];
        }
        for (const item of localItems) {
            const key = String(item.stageId);
            if (!map[key]) map[key] = [];
            map[key].push(item);
        }
        return map;
    }, [localItems, stages]);

    const handleMove = useCallback(
        async ({ itemId, fromColumnId, toColumnId }: KanbanMoveEvent) => {
            if (String(fromColumnId) === String(toColumnId)) return;

            const toStageId = Number(toColumnId);
            const toStage = stages.find((s) => s.id === toStageId);
            if (!toStage) return;

            const boardId = String(itemId);
            const previous = localItems.find((i) => i.boardId === boardId);
            if (!previous) return;
            const snapshot: TodoKanbanItem = { ...previous };

            setLocalItems((prev) =>
                prev.map((i) =>
                    i.boardId === boardId
                        ? { ...i, stageId: toStage.id, stageName: toStage.name }
                        : i,
                ),
            );

            setMovingId(boardId);
            try {
                if (previous.entityType === 'deal_task') {
                    await patchTaskAPI(previous.entityId, { stage: toStage.id });
                    queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
                    queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
                } else {
                    await patchClientTaskAPI(previous.entityId, { stage: toStage.id });
                    queryClient.invalidateQueries({ queryKey: queryKeys.clientTasks });
                }
            } catch (error: any) {
                setLocalItems((prev) =>
                    prev.map((i) => (i.boardId === boardId ? snapshot : i)),
                );
                setAlertMessage(getLocalizedApiErrorMessage(error, t, 'kanbanMoveTodoFailed'));
                setAlertVariant('error');
                setIsAlertModalOpen(true);
            } finally {
                setMovingId(null);
            }
        },
        [
            stages,
            localItems,
            queryClient,
            setAlertMessage,
            setAlertVariant,
            setIsAlertModalOpen,
            t,
        ],
    );

    if (!enabled) return null;

    if (isLoading) {
        return <SectionLoadingState label={t('loading')} />;
    }

    if (stages.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('kanbanNoStages')}
            </div>
        );
    }

    return (
        <KanbanBoard<TodoKanbanItem>
            columns={columns}
            itemsByColumn={itemsByColumn}
            getItemId={(item) => item.boardId}
            getColumnId={(item) => item.stageId}
            disabled={!canDrag}
            isItemDisabled={(item) => movingId === item.boardId}
            emptyColumnLabel={t('kanbanEmptyTodoColumn')}
            dragInstructionsLabel={t('kanbanDragTodoInstructions')}
            movingAnnounceLabel={t('kanbanMoving')}
            onMove={handleMove}
            renderCard={(item) => (
                <TodoKanbanCard
                    item={item}
                    formatDealStage={formatDealStage}
                    onOpen={onOpenItem}
                />
            )}
        />
    );
};
