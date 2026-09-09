
import React from 'react';

type LoaderProps = {
  className?: string;
  variant?: 'primary' | 'foreground';
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'light' | 'muted';
  label?: string;
  /**
   * Render as decoration only (no role/aria-live). Use inside buttons and other
   * controls that already announce their own busy state, so screen readers
   * don't hear the status twice.
   */
  presentational?: boolean;
};

export const Loader = ({
    className = '',
    variant = 'foreground',
    size = 'md',
    tone = 'default',
    label = 'Loading',
    presentational = false,
}: LoaderProps) => {
    const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6';
    // currentColor lets one spinner sit on primary, danger, ghost, light and dark
    // surfaces without extra variants.
    // Note: `foreground` is a neutral that reads on page/card backgrounds. It must not
    // use --primary-foreground, which is the *on-primary* contrast colour (near-white
    // for the brand purple) and left bare loaders invisible on light backgrounds.
    const colorClass =
        tone === 'light'
            ? 'text-white'
            : tone === 'muted'
              ? 'text-gray-400 dark:text-gray-500'
              : variant === 'primary'
                ? 'text-primary'
                : 'text-gray-500 dark:text-gray-400';

    return (
        <span
            className={`inline-flex items-center justify-center ${colorClass} ${className}`}
            {...(presentational
                ? { 'aria-hidden': true }
                : { role: 'status', 'aria-live': 'polite', 'aria-label': label })}
        >
            <svg className={`animate-spin ${sizeClass}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
        </span>
    );
};
