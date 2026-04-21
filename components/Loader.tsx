
import React from 'react';

type LoaderProps = {
  className?: string;
  variant?: 'primary' | 'foreground';
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'light' | 'muted';
  label?: string;
};

export const Loader = ({
    className = '',
    variant = 'foreground',
    size = 'md',
    tone = 'default',
    label = 'Loading',
}: LoaderProps) => {
    const heightClass = size === 'sm' ? 'h-4' : size === 'lg' ? 'h-10' : 'h-6';
    const barClass = size === 'sm' ? 'w-1' : size === 'lg' ? 'w-2' : 'w-1.5';
    const colorClass =
        tone === 'light'
            ? 'bg-white/90'
            : tone === 'muted'
              ? 'bg-gray-400 dark:bg-gray-500'
              : variant === 'primary'
                ? 'bg-primary'
                : 'bg-primary-foreground';

    return (
        <div className={`inline-flex items-center justify-center gap-1 rtl:space-x-reverse ${heightClass} ${className}`} role="status" aria-live="polite" aria-label={label}>
            <span className={`h-2/3 ${barClass} ${colorClass} rounded-full animate-bounce-loader`} style={{ animationDelay: '0s' }} />
            <span className={`h-full ${barClass} ${colorClass} rounded-full animate-bounce-loader`} style={{ animationDelay: '0.1s' }} />
            <span className={`h-2/3 ${barClass} ${colorClass} rounded-full animate-bounce-loader`} style={{ animationDelay: '0.2s' }} />
            <span className={`h-full ${barClass} ${colorClass} rounded-full animate-bounce-loader`} style={{ animationDelay: '0.3s' }} />
            <span className={`h-2/3 ${barClass} ${colorClass} rounded-full animate-bounce-loader`} style={{ animationDelay: '0.4s' }} />
        </div>
    );
};
