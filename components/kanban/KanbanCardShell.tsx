import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

type KanbanCardShellProps = {
    id: string;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
};

export const KanbanCardShell = ({
    id,
    disabled = false,
    children,
    className = '',
}: KanbanCardShellProps) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id,
        disabled,
    });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 20 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`touch-manipulation ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${
                isDragging ? 'ring-2 ring-primary/40 rounded-lg' : ''
            } ${className}`}
            {...(disabled ? {} : { ...listeners, ...attributes })}
        >
            {children}
        </div>
    );
};
