import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { getStatusSurfaceStyles } from '../LeadStatusDropdown';
import type { Tag } from '../../types';

const DEFAULT_TAG_COLOR = '#94a3b8';

type LeadTagChipsProps = {
    tags?: Tag[];
    /** Collapse the overflow into a "+N" chip; omit to render every tag */
    max?: number;
    size?: 'sm' | 'md';
    className?: string;
};

const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
} as const;

const dotClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
} as const;

/**
 * Read-only tag chips for a lead. Shares the status chip color treatment so
 * tags and statuses read as one system in both themes.
 */
export const LeadTagChips = ({ tags, max, size = 'sm', className = '' }: LeadTagChipsProps) => {
    const { theme } = useAppContext();
    const list = tags ?? [];
    if (list.length === 0) return null;

    const visible = typeof max === 'number' ? list.slice(0, max) : list;
    const hiddenCount = list.length - visible.length;

    return (
        <div className={`flex flex-wrap items-center gap-1 ${className}`}>
            {visible.map((tag) => {
                const color = tag.color || DEFAULT_TAG_COLOR;
                return (
                    <span
                        key={tag.id}
                        title={tag.name}
                        className={`inline-flex max-w-[10rem] items-center rounded-full border font-medium ${sizeClasses[size]}`}
                        style={getStatusSurfaceStyles(color, theme)}
                    >
                        <span
                            className={`${dotClasses[size]} shrink-0 rounded-full`}
                            style={{ backgroundColor: color }}
                            aria-hidden
                        />
                        <span className="truncate">{tag.name}</span>
                    </span>
                );
            })}
            {hiddenCount > 0 && (
                <span
                    title={list.slice(visible.length).map((tag) => tag.name).join(', ')}
                    className={`inline-flex items-center rounded-full border border-gray-300 bg-gray-100 font-medium text-gray-600 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-300 ${sizeClasses[size]}`}
                >
                    +{hiddenCount}
                </span>
            )}
        </div>
    );
};

export default LeadTagChips;
