

import React, { ReactNode } from 'react';

// FIX: Made children optional to fix missing children prop error.
type PageWrapperProps = { title: string | ReactNode, children?: ReactNode, actions?: ReactNode };
export const PageWrapper = ({ title, children, actions }: PageWrapperProps) => {
    return (
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
            {/* Title and actions stack until xl so toolbars (search + many buttons) get full width — avoids cramped wrap rows */}
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words shrink-0">{title}</h1>
                {actions && (
                    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:justify-end xl:flex-1 xl:min-w-0">
                        {actions}
                    </div>
                )}
            </div>
            <div>
                {children}
            </div>
        </div>
    );
};