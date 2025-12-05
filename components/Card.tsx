

import React, { ReactNode } from 'react';

// FIX: Made children optional to fix missing children prop error.
type CardProps = { children?: ReactNode; className?: string };
export const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg shadow-md p-4 sm:p-6 ${className}`}>
    {children}
  </div>
);