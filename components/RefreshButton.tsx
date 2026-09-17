import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from './Button';
import { RefreshIcon } from './icons';
import { useAppContext } from '../context/AppContext';

type RefreshButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Button label. Defaults to `t('refresh')`. Ignored when `iconOnly`. */
  children?: React.ReactNode;
  /** Spins the refresh icon and disables the control. */
  loading?: boolean;
  /** Hide the text label below the `sm` breakpoint (icon stays visible). */
  hideLabelOnMobile?: boolean;
  /** Compact icon-only control (e.g. chat header). */
  iconOnly?: boolean;
  variant?: 'secondary' | 'ghost';
  /**
   * How much this control refreshes.
   *
   * `'handler'` (default) — run `onClick` only. Pages list the queries they render.
   *
   * `'all'` — also invalidate every query (fire-and-forget). Opt-in only; the spinner
   * follows `loading`, not global invalidation, so a slow background query cannot
   * leave the button stuck.
   */
  scope?: 'all' | 'handler';
};

/**
 * Shared refresh control sized to match `Button` / `FilterButton`.
 *
 * Clicking runs `onClick` first. With `scope="all"`, every query is also marked stale
 * without blocking the button — React Query dedupes concurrent refetches of the same key.
 */
export const RefreshButton = ({
  children,
  loading = false,
  hideLabelOnMobile = true,
  iconOnly = false,
  variant = 'secondary',
  scope = 'handler',
  className = '',
  type = 'button',
  title,
  disabled,
  onClick,
  ...props
}: RefreshButtonProps) => {
  const { t } = useAppContext();
  const queryClient = useQueryClient();

  // Param is optional so this satisfies both `MouseEventHandler` and the bare
  // `() => void` half of Button's intersection-typed onClick.
  const handleClick = useCallback(
    (event?: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event as React.MouseEvent<HTMLButtonElement>);
      if (scope === 'all') {
        void queryClient.invalidateQueries();
      }
    },
    [onClick, queryClient, scope],
  );

  const label = children ?? t('refresh');
  const tooltip = title ?? t('refresh');

  if (iconOnly) {
    return (
      <button
        type={type}
        onClick={handleClick}
        disabled={disabled || loading}
        title={tooltip}
        aria-label={t('refresh')}
        aria-busy={loading || undefined}
        className={`rounded-full p-2 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60 ${className}`}
        {...props}
      >
        <RefreshIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    );
  }

  return (
    <Button
      type={type}
      variant={variant}
      onClick={handleClick}
      disabled={disabled || loading}
      title={tooltip}
      aria-busy={loading || undefined}
      className={`shrink-0 ${className}`}
      {...props}
    >
      <RefreshIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} />
      <span className={hideLabelOnMobile ? 'hidden sm:inline' : undefined}>{label}</span>
    </Button>
  );
};
