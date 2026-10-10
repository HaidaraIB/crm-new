import React from 'react';
import { Button } from './Button';
import { useAppContext } from '../context/AppContext';
import { PAGE_SIZE_OPTIONS } from '../hooks/usePersistedPageSize';

export const getPaginationItems = (current: number, total: number): Array<number | 'ellipsis'> => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push('ellipsis');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push('ellipsis');
  items.push(total);
  return items;
};

export type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  disabled?: boolean;
  className?: string;
  /** Overrides the default "page X of Y" text, e.g. a "showing N of M" count. */
  label?: React.ReactNode;
};

/**
 * Shared pagination control: page-size select + first/prev/numbered-pages/next/last.
 * Forced LTR so page numbers never reverse order in Arabic/RTL.
 */
export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  hasPrevious,
  hasNext,
  disabled = false,
  className = '',
  label,
}) => {
  const { t } = useAppContext();
  const items = getPaginationItems(page, totalPages);
  const canGoPrevious = hasPrevious ?? page > 1;
  const canGoNext = hasNext ?? page < totalPages;

  return (
    <div className={`mt-4 flex flex-col items-center justify-between gap-3 px-2 sm:flex-row sm:px-0 ${className}`.trim()}>
      <span className="text-center text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
        {label ?? <>{t('page')} {page} {t('of')} {totalPages}</>}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-2" dir="ltr">
        {onPageSizeChange ? (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="rounded-md border border-gray-300 bg-white px-2 py-2 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{`${size} ${t('perPage')}`}</option>
            ))}
          </select>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => onPageChange(1)}
          disabled={disabled || page === 1}
        >
          &laquo;
        </Button>
        <Button
          variant="secondary"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={disabled || !canGoPrevious}
        >
          {t('previous')}
        </Button>
        {items.map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-gray-500 dark:text-gray-400">...</span>
          ) : (
            <Button
              key={item}
              variant={item === page ? 'primary' : 'secondary'}
              onClick={() => onPageChange(item)}
              disabled={disabled}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="secondary"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={disabled || !canGoNext}
        >
          {t('next')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || page === totalPages}
        >
          &raquo;
        </Button>
      </div>
    </div>
  );
};
