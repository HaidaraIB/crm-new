import React from 'react';
import { useDraggable } from '@dnd-kit/core';

type KanbanCardShellProps = {
    id: string;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
};

/**
 * Source card stays in place while dragging; visual movement is handled by DragOverlay.
 * Applying transform here would expand the horizontal scroll container off-screen.
 */
export const KanbanCardShell = ({
    id,
    disabled = false,
    children,
    className = '',
}: KanbanCardShellProps) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id,
        disabled,
    });

    return (
        <div
            ref={setNodeRef}
            className={`touch-manipulation ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${
                isDragging ? 'opacity-40 ring-2 ring-primary/40 rounded-lg' : ''
            } ${className}`}
            {...(disabled ? {} : { ...listeners, ...attributes })}
        >
            {children}
        </div>
    );
};
