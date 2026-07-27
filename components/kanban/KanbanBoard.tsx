import React, { useMemo, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCorners,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardShell } from './KanbanCardShell';
import type { KanbanBoardProps, KanbanColumnId } from './types';

const toKey = (id: KanbanColumnId) => String(id);

export function KanbanBoard<TItem>({
    columns,
    itemsByColumn,
    getItemId,
    getColumnId,
    renderCard,
    onMove,
    disabled = false,
    isItemDisabled,
    emptyColumnLabel = '',
    dragInstructionsLabel = '',
    movingAnnounceLabel = '',
    renderColumnFooter,
    className = '',
    columnBodyClassName = '',
}: KanbanBoardProps<TItem>) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [announce, setAnnounce] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor),
    );

    const itemLookup = useMemo(() => {
        const map = new Map<string, TItem>();
        for (const items of Object.values(itemsByColumn)) {
            for (const item of items) {
                map.set(String(getItemId(item)), item);
            }
        }
        return map;
    }, [itemsByColumn, getItemId]);

    const findColumnForItem = (itemId: string): KanbanColumnId | null => {
        const item = itemLookup.get(itemId);
        if (item) return getColumnId(item);
        for (const col of columns) {
            const list = itemsByColumn[toKey(col.id)] || [];
            if (list.some((i) => String(getItemId(i)) === itemId)) {
                return col.id;
            }
        }
        return null;
    };

    const resolveDropColumn = (overId: string | number | undefined): KanbanColumnId | null => {
        if (overId == null) return null;
        const overKey = String(overId);
        if (columns.some((c) => toKey(c.id) === overKey)) {
            return overKey;
        }
        return findColumnForItem(overKey);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(String(event.active.id));
    };

    const handleDragOver = (_event: DragOverEvent) => {
        // Column highlight is handled by useDroppable isOver inside KanbanColumn.
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const itemId = String(event.active.id);
        setActiveId(null);

        const fromColumnId = findColumnForItem(itemId);
        const toColumnId = resolveDropColumn(event.over?.id);

        if (fromColumnId == null || toColumnId == null) return;
        if (toKey(fromColumnId) === toKey(toColumnId)) return;

        if (movingAnnounceLabel) {
            setAnnounce(movingAnnounceLabel);
        }

        try {
            await onMove({ itemId, fromColumnId, toColumnId });
        } finally {
            // Clear announce after a beat so screen readers pick up the change.
            window.setTimeout(() => setAnnounce(''), 800);
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const activeItem = activeId ? itemLookup.get(activeId) ?? null : null;

    return (
        <div className={className}>
            {dragInstructionsLabel ? (
                <p className="sr-only">{dragInstructionsLabel}</p>
            ) : null}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
                {announce}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
                    {columns.map((column) => {
                        const colKey = toKey(column.id);
                        const items = itemsByColumn[colKey] || [];
                        return (
                            <KanbanColumn
                                key={colKey}
                                column={column}
                                emptyLabel={emptyColumnLabel}
                                isEmpty={items.length === 0}
                                footer={renderColumnFooter?.(column)}
                                bodyClassName={columnBodyClassName}
                            >
                                {items.map((item) => {
                                    const id = String(getItemId(item));
                                    const itemDisabled =
                                        disabled || Boolean(isItemDisabled?.(item));
                                    return (
                                        <KanbanCardShell
                                            key={id}
                                            id={id}
                                            disabled={itemDisabled}
                                        >
                                            {renderCard(item, {
                                                isDragging: activeId === id,
                                                disabled: itemDisabled,
                                            })}
                                        </KanbanCardShell>
                                    );
                                })}
                            </KanbanColumn>
                        );
                    })}
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeItem
                        ? renderCard(activeItem, { isDragging: true, disabled: false })
                        : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
