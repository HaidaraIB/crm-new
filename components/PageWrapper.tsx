

import React, { ReactNode } from 'react';

// FIX: Made children optional to fix missing children prop error.
type PageWrapperProps = { title: string | ReactNode, children?: ReactNode, actions?: ReactNode };
export const PageWrapper = ({ title, children, actions }: PageWrapperProps) => {
    return (
        <div className="min-w-0 max-w-full p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
            {/* Title and actions stack until xl so toolbars (search + many buttons) get full width — avoids cramped wrap rows */}
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
                <h1 className="min-w-0 flex-1 overflow-hidden text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl md:text-3xl">
                    {title}
                </h1>
                {actions && (
                    <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 sm:justify-end xl:w-auto">
                        {actions}
                    </div>
                )}
            </div>
            <div className="min-w-0 max-w-full">
                {children}
            </div>
        </div>
    );
};