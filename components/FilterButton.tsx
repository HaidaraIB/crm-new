import React from 'react';
import { FilterIcon } from './icons';
import { useAppContext } from '../context/AppContext';

type FilterButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Button label. Defaults to `t('filter')`. */
  children?: React.ReactNode;
  /** Shows a primary dot when filters are applied. */
  hasActiveFilters?: boolean;
  /** Hide the text label below the `sm` breakpoint (icon stays visible). */
  hideLabelOnMobile?: boolean;
};

/**
 * Shared filter-drawer trigger sized to match `Button` (`h-9` / `py-2`).
 */
export const FilterButton = ({
  children,
  hasActiveFilters = false,
  hideLabelOnMobile = true,
  className = '',
  type = 'button',
  ...props
}: FilterButtonProps) => {
  const { t } = useAppContext();
  const label = children ?? t('filter');

  return (
    <button
      type={type}
      className={`inline-flex h-9 items-center justify-center gap-1.5 px-3 text-sm font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 shadow-sm hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300">
        <FilterIcon className="h-3 w-3" />
      </span>
      <span className={hideLabelOnMobile ? 'hidden sm:inline' : undefined}>{label}</span>
      {hasActiveFilters && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" aria-hidden />
      )}
    </button>
  );
};
