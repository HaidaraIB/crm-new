import React, { ReactNode } from 'react';
import { PageHelpVideoButton } from './PageHelpVideoButton';

type PageWrapperProps = {
  title: string | ReactNode;
  /** Shown under the title row (keeps the tutorial button next to the title text). */
  subtitle?: ReactNode;
  /** Optional icon/leading content on the title row, before the title. */
  titleIcon?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** When set, shows the page tutorial video icon (if a URL is configured in admin). */
  helpVideoPageKey?: string;
};

export const PageWrapper = ({
  title,
  subtitle,
  titleIcon,
  children,
  actions,
  helpVideoPageKey,
}: PageWrapperProps) => {
  const titleRow = (
    <div className="flex min-w-0 items-center gap-2">
      {titleIcon ? <span className="shrink-0">{titleIcon}</span> : null}
      <h1 className="min-w-0 text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl md:text-3xl">
        {title}
      </h1>
      {helpVideoPageKey ? (
        <PageHelpVideoButton pageKey={helpVideoPageKey} className="shrink-0" />
      ) : null}
    </div>
  );

  return (
    <div className="min-w-0 max-w-full p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Title and actions stack until xl so toolbars (search + many buttons) get full width — avoids cramped wrap rows */}
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between xl:gap-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          {titleRow}
          {subtitle ? (
            <div className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
              {subtitle}
            </div>
          ) : null}
        </div>
        {actions && (
          <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 sm:justify-end xl:w-auto xl:pt-1">
            {actions}
          </div>
        )}
      </div>
      <div className="min-w-0 max-w-full">{children}</div>
    </div>
  );
};
