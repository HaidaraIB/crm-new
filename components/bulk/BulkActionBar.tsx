import React, { ReactNode } from 'react';
import { Button } from '../Button';
import { XIcon } from '../icons';

export type BulkActionBarProps = {
  selectedCount: number;
  selectedLabel: string;
  clearLabel: string;
  onClear: () => void;
  children?: ReactNode;
  className?: string;
  /** Short CTA, e.g. “Select all 134”. */
  statusActionLabel?: string;
  /** Longer tooltip for the CTA. */
  statusActionTitle?: string;
  onStatusAction?: () => void;
  /** Chip shown after expanding to every matching row. */
  badgeLabel?: string;
};

/**
 * Compact floating command bar for multi-select.
 * Sized to its content and inset past the sidebar on desktop (logical start).
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  selectedLabel,
  clearLabel,
  onClear,
  children,
  className = '',
  statusActionLabel,
  statusActionTitle,
  onStatusAction,
  badgeLabel,
}) => {
  if (selectedCount <= 0) return null;

  const countText = String(selectedCount);
  const selectedWord = selectedLabel.includes(countText)
    ? selectedLabel.replace(countText, '').trim()
    : selectedLabel;

  return (
    <div
      className={`pointer-events-none fixed inset-x-3 bottom-4 z-[80] flex justify-center md:start-[calc(16rem+0.75rem)] ${className}`}
    >
      <div
        className="pointer-events-auto flex w-max max-w-full items-center gap-2 overflow-x-auto rounded-full border border-gray-200 bg-white/95 p-1.5 ps-2 shadow-2xl shadow-black/20 ring-1 ring-black/5 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/95 dark:shadow-black/60 dark:ring-white/10 sm:gap-2.5 sm:ps-2.5"
        role="toolbar"
        aria-label={selectedLabel}
      >
        <div className="flex shrink-0 items-center gap-2 ps-1">
          <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2 text-sm font-bold tabular-nums text-white">
            {selectedCount}
          </span>
          {selectedWord ? (
            <span className="whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200">
              {selectedWord}
            </span>
          ) : null}
          {badgeLabel ? (
            <span className="whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-200">
              {badgeLabel}
            </span>
          ) : null}
        </div>

        {statusActionLabel && onStatusAction ? (
          <Button
            variant="primary"
            onClick={onStatusAction}
            title={statusActionTitle || statusActionLabel}
            className="!h-8 shrink-0 whitespace-nowrap !rounded-full px-3"
          >
            {statusActionLabel}
          </Button>
        ) : null}

        {children ? (
          <>
            <div
              className="hidden h-6 w-px shrink-0 bg-gray-200 dark:bg-white/15 sm:block"
              aria-hidden
            />
            <div className="flex shrink-0 items-center gap-1.5">
              {children}
            </div>
          </>
        ) : null}

        <button
          type="button"
          onClick={onClear}
          title={clearLabel}
          aria-label={clearLabel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
