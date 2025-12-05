

import React, { ReactNode } from 'react';

// FIX: Made children optional to fix missing children prop error.
type PageWrapperProps = { title: string | ReactNode, children?: ReactNode, actions?: ReactNode };
export const PageWrapper = ({ title, children, actions }: PageWrapperProps) => (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">{title}</h1>
            {actions && <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">{actions}</div>}
        </div>
        <div>
            {children}
        </div>
    </div>
);