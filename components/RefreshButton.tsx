import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from './Button';
import { RefreshIcon } from './icons';
import { useAppContext } from '../context/AppContext';

type RefreshButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Button label. Defaults to `t('refresh')`. Ignored when `iconOnly`. */
  children?: React.ReactNode;
  /** Shows Button loader and disables the control. Combined with the global refresh state. */
  loading?: boolean;
  /** Hide the text label below the `sm` breakpoint (icon stays visible). */
  hideLabelOnMobile?: boolean;
  /** Compact icon-only control (e.g. chat header). */
  iconOnly?: boolean;
  variant?: 'secondary' | 'ghost';
  /**
   * How much this control refreshes.
   *
   * `'all'` (default) — invalidate every query, so whatever the page is showing
   * reloads. This is what users expect "Refresh" to mean, and it is the only
   * variant that cannot silently rot: a page that gains a new data source keeps
   * refreshing correctly without anyone remembering to update a handler.
   *
   * `'handler'` — run `onClick` only. For controls that must stay narrow, e.g. a
   * refresh inside a busy panel where reloading the whole app would be wasteful.
   */
  scope?: 'all' | 'handler';
};

/**
 * Shared refresh control sized to match `Button` / `FilterButton`.
 *
 * Clicking refetches every active query (see `scope`). `onClick` still runs first,
 * so page-specific handlers keep working — React Query dedupes the concurrent
 * refetch of a key that a handler already requested, so listing a query in both
 * places costs one request, not two.
 */
export const RefreshButton = ({
  children,
  loading = false,
  hideLabelOnMobile = true,
  iconOnly = false,
  variant = 'secondary',
  scope = 'all',
  className = '',
  type = 'button',
  title,
  disabled,
  onClick,
  ...props
}: RefreshButtonProps) => {
  const { t } = useAppContext();
  const queryClient = useQueryClient();
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Param is optional so this satisfies both `MouseEventHandler` and the bare
  // `() => void` half of Button's intersection-typed onClick.
  const handleClick = useCallback(
    (event?: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event as React.MouseEvent<HTMLButtonElement>);
      if (scope !== 'all') return;

      setIsRefreshingAll(true);
      // No filter = every query. Active ones refetch now; inactive ones are marked
      // stale and reload when they next mount — the same shape as a browser refresh.
      queryClient
        .invalidateQueries()
        .catch(() => {
          // Individual query errors surface in their own components; the button
          // must not swallow the page or stay stuck spinning.
        })
        .finally(() => {
          if (mountedRef.current) setIsRefreshingAll(false);
        });
    },
    [onClick, queryClient, scope],
  );

  const busy = loading || isRefreshingAll;
  const label = children ?? t('refresh');
  const tooltip = title ?? t('refresh');

  if (iconOnly) {
    return (
      <button
        type={type}
        onClick={handleClick}
        disabled={disabled || busy}
        title={tooltip}
        aria-label={t('refresh')}
        aria-busy={busy || undefined}
        className={`rounded-full p-2 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60 ${className}`}
        {...props}
      >
        <RefreshIcon className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
      </button>
    );
  }

  return (
    <Button
      type={type}
      variant={variant}
      onClick={handleClick}
      loading={busy}
      disabled={disabled}
      title={tooltip}
      className={`shrink-0 ${className}`}
      {...props}
    >
      <RefreshIcon className="size-4" />
      <span className={hideLabelOnMobile ? 'hidden sm:inline' : undefined}>{label}</span>
    </Button>
  );
};
