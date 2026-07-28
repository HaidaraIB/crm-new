import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { KanbanColumnDef } from './types';

type KanbanColumnProps = {
    column: KanbanColumnDef;
    children: React.ReactNode;
    footer?: React.ReactNode;
    emptyLabel?: string;
    isEmpty?: boolean;
    isOver?: boolean;
    bodyClassName?: string;
};

export const KanbanColumn = ({
    column,
    children,
    footer,
    emptyLabel,
    isEmpty = false,
    bodyClassName = '',
}: KanbanColumnProps) => {
    const { setNodeRef, isOver } = useDroppable({ id: String(column.id) });
    const accent = column.color || '#94a3b8';

    return (
        <section
            className={`flex w-[280px] sm:w-[300px] shrink-0 flex-col rounded-xl border bg-gray-50/80 dark:bg-gray-900/40 ${
                isOver
                    ? 'border-primary/60 ring-2 ring-primary/25'
                    : 'border-gray-200 dark:border-gray-700'
            }`}
            aria-label={column.title}
        >
            <header className="sticky top-0 z-10 flex items-center gap-2 rounded-t-xl border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-dark-card/95 backdrop-blur px-3 py-2.5">
                <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/80 dark:ring-black/20"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                />
                <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {column.title}
                </h3>
                {typeof column.count === 'number' && (
                    <span className="shrink-0 rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 tabular-nums">
                        {column.count}
                    </span>
                )}
            </header>

            <div
                ref={setNodeRef}
                className={`flex flex-1 flex-col gap-2 overflow-y-auto custom-scrollbar p-2 min-h-[140px] max-h-[calc(100vh-280px)] ${bodyClassName}`}
            >
                {isEmpty ? (
                    <div
                        className={`flex flex-1 items-center justify-center rounded-lg border border-dashed px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400 ${
                            isOver
                                ? 'border-primary/50 bg-primary/5'
                                : 'border-gray-300 dark:border-gray-600'
                        }`}
                    >
                        {emptyLabel}
                    </div>
                ) : (
                    children
                )}
                {footer}
            </div>
        </section>
    );
};
