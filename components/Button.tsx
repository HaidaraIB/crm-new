

import React, { ReactNode } from 'react';
import { Loader } from './Loader';

// FIX: Add disabled prop to support disabling the button.
// FIX: Added type prop for forms and made children optional.
type ButtonProps = { children?: ReactNode, onClick?: () => void, className?: string, variant?: 'primary' | 'secondary' | 'ghost' | 'danger', disabled?: boolean, loading?: boolean, type?: 'button' | 'submit' | 'reset' };
export const Button = ({ children, onClick, className = '', variant = 'primary', disabled, loading, type = 'button' }: ButtonProps) => {
  const baseClasses = "px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500',
    ghost: 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  return <button type={type} onClick={onClick} className={`${baseClasses} ${variantClasses[variant]} ${className}`} disabled={disabled || loading}>{loading ? <Loader className="h-5" /> : children}</button>;
};