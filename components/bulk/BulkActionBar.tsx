import React, { ReactNode } from 'react';
import { Button } from './Button';

export type BulkActionBarProps = {
  selectedCount: number;
  selectedLabel: string;
  clearLabel: string;
  onClear: () => void;
  children?: ReactNode;
  className?: string;
};

/**
 * Sticky bar shown when a list has an active multi-select selection.
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  selectedLabel,
  clearLabel,
  onClear,
  children,
  className = '',
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div
      className={`sticky bottom-4 z-[80] mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg dark:border-gray-700 dark:bg-dark-card ${className}`}
      role="toolbar"
      aria-label={selectedLabel}
    >
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedLabel}</p>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button variant="ghost" onClick={onClear} title={clearLabel}>
          {clearLabel}
        </Button>
      </div>
    </div>
  );
};
