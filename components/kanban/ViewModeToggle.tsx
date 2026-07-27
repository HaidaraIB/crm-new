import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { ListIcon } from '../icons';
import type { EntityViewMode } from './types';

const BoardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        {...props}
    >
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="10" rx="1" />
    </svg>
);

type ViewModeToggleProps = {
    value: EntityViewMode;
    onChange: (mode: EntityViewMode) => void;
    className?: string;
};

export const ViewModeToggle = ({ value, onChange, className = '' }: ViewModeToggleProps) => {
    const { t } = useAppContext();

    const baseBtn =
        'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
    const activeBtn = 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm';
    const inactiveBtn =
        'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200';

    return (
        <div
            role="group"
            aria-label={t('viewModeToggle') || 'View mode'}
            className={`inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 p-0.5 shrink-0 ${className}`}
        >
            <button
                type="button"
                aria-pressed={value === 'table'}
                onClick={() => onChange('table')}
                className={`${baseBtn} ${value === 'table' ? activeBtn : inactiveBtn}`}
                title={t('viewModeTable') || 'Table'}
            >
                <ListIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('viewModeTable') || 'Table'}</span>
            </button>
            <button
                type="button"
                aria-pressed={value === 'board'}
                onClick={() => onChange('board')}
                className={`${baseBtn} ${value === 'board' ? activeBtn : inactiveBtn}`}
                title={t('viewModeBoard') || 'Board'}
            >
                <BoardIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('viewModeBoard') || 'Board'}</span>
            </button>
        </div>
    );
};
