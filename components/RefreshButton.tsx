import React from 'react';
import { Button } from './Button';
import { RefreshIcon } from './icons';
import { useAppContext } from '../context/AppContext';

type RefreshButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Button label. Defaults to `t('refresh')`. Ignored when `iconOnly`. */
  children?: React.ReactNode;
  /** Shows Button loader and disables the control. */
  loading?: boolean;
  /** Hide the text label below the `sm` breakpoint (icon stays visible). */
  hideLabelOnMobile?: boolean;
  /** Compact icon-only control (e.g. chat header). */
  iconOnly?: boolean;
  variant?: 'secondary' | 'ghost';
};

/**
 * Shared refresh control sized to match `Button` / `FilterButton`.
 */
export const RefreshButton = ({
  children,
  loading = false,
  hideLabelOnMobile = true,
  iconOnly = false,
  variant = 'secondary',
  className = '',
  type = 'button',
  title,
  disabled,
  onClick,
  ...props
}: RefreshButtonProps) => {
  const { t } = useAppContext();
  const label = children ?? t('refresh');
  const tooltip = title ?? t('refresh');

  if (iconOnly) {
    return (
      <button
        type={type}
        onClick={onClick}
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
      onClick={onClick}
      loading={loading}
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
