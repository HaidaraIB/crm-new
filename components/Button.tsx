

import React, { ReactNode } from 'react';
import { Loader } from './Loader';

// FIX: Add disabled prop to support disabling the button.
// FIX: Added type prop for forms and made children optional.
// FIX: Added title prop for tooltips.
// FIX: Extended React.ButtonHTMLAttributes to properly handle React special props like 'key'.
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode, onClick?: () => void, className?: string, variant?: 'primary' | 'secondary' | 'ghost' | 'danger', size?: 'sm' | 'md', disabled?: boolean, loading?: boolean, loadingText?: ReactNode, type?: 'button' | 'submit' | 'reset', title?: string };
export const Button = ({ children, onClick, className = '', variant = 'primary', size = 'md', disabled, loading, loadingText, type = 'button', title, ...props }: ButtonProps) => {
  const sizeClasses = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm';
  const baseClasses = `${sizeClasses} shrink-0 whitespace-nowrap rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`;
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-50 dark:hover:bg-gray-500 disabled:dark:bg-gray-700 disabled:dark:text-gray-300',
    ghost: 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  const loaderTone =
    variant === 'primary' || variant === 'danger' ? 'light' : variant === 'secondary' || variant === 'ghost' ? 'muted' : 'default';
  const busyLabel = loading && typeof loadingText === 'string' && loadingText ? loadingText : undefined;
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${loading ? 'cursor-wait' : ''} ${className}`}
      disabled={disabled || loading}
      title={title}
      aria-busy={loading || undefined}
      aria-label={busyLabel}
      {...props}
    >
      {/*
        Replace the label with a centered spinner. The original content stays in
        the layout (opacity-0) so the button does not shrink or jump.
      */}
      <span className="relative inline-flex items-center justify-center">
        <span className={`inline-flex items-center justify-center gap-2 whitespace-nowrap${loading ? ' opacity-0' : ''}`}>{children}</span>
        {loading ? (
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <Loader size="sm" tone={loaderTone} presentational />
          </span>
        ) : null}
      </span>
    </button>
  );
};