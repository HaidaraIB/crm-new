import type { ReactNode } from 'react';

export type EntityViewMode = 'table' | 'board';

export type KanbanColumnId = string | number;

export type KanbanColumnDef = {
    id: KanbanColumnId;
    title: string;
    color?: string;
    /** Total items in this column (may exceed currently loaded cards). */
    count?: number;
};

export type KanbanMoveEvent = {
    itemId: string;
    fromColumnId: KanbanColumnId;
    toColumnId: KanbanColumnId;
};

export type KanbanBoardProps<TItem> = {
    columns: KanbanColumnDef[];
    /** Items grouped by column id (stringified). */
    itemsByColumn: Record<string, TItem[]>;
    getItemId: (item: TItem) => string | number;
    getColumnId: (item: TItem) => KanbanColumnId;
    renderCard: (item: TItem, meta: { isDragging: boolean; disabled: boolean }) => ReactNode;
    onMove: (event: KanbanMoveEvent) => void | Promise<void>;
    /** When true, cards cannot be dragged. */
    disabled?: boolean;
    isItemDisabled?: (item: TItem) => boolean;
    emptyColumnLabel?: string;
    dropHintLabel?: string;
    dragInstructionsLabel?: string;
    movingAnnounceLabel?: string;
    renderColumnFooter?: (column: KanbanColumnDef) => ReactNode;
    className?: string;
    /** Extra class on each column body scroll area. */
    columnBodyClassName?: string;
};
