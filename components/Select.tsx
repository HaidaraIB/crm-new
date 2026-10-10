import React, { forwardRef, SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

/** Native select styled to match `Input` (same 40px height, border, background, radius). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className = '', invalid, children, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={invalid || props['aria-invalid'] ? true : undefined}
    className={`h-10 w-full px-3 bg-gray-50 dark:bg-gray-800 border ${invalid ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';
