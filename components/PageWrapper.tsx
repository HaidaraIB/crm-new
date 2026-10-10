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
  /** Lead-style header: cap title width so marquee + action buttons share one row. */
  shrinkTitle?: boolean;
  /** Title is a full-width toolbar (back + name + actions in one row); omit separate actions slot. */
  fullWidthTitle?: boolean;
};

export const PageWrapper = ({
  title,
  subtitle,
  titleIcon,
  children,
  actions,
  helpVideoPageKey,
  shrinkTitle = false,
  fullWidthTitle = false,
}: PageWrapperProps) => {
  const titleRow = (
    <div className={`flex items-center gap-2 ${shrinkTitle ? 'min-w-0 max-w-full' : 'shrink-0'}`}>
      {titleIcon ? <span className="shrink-0">{titleIcon}</span> : null}
      <h1
        className={`font-bold text-gray-900 dark:text-gray-100 ${
          shrinkTitle
            ? 'min-w-0 max-w-full overflow-hidden text-base sm:text-lg md:text-xl'
            : 'whitespace-nowrap text-xl sm:text-2xl md:text-3xl'
        }`}
      >
        {title}
      </h1>
      {helpVideoPageKey ? (
        <PageHelpVideoButton pageKey={helpVideoPageKey} className="shrink-0" />
      ) : null}
    </div>
  );

  if (fullWidthTitle) {
    return (
      <div className="min-w-0 max-w-full p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <div className="min-w-0 w-full">{title}</div>
        {subtitle ? (
          <div className="text-sm font-normal text-gray-500 dark:text-gray-400">{subtitle}</div>
        ) : null}
        <div className="min-w-0 max-w-full">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Title and actions stack until xl so toolbars (search + many buttons) get full width — avoids cramped wrap rows */}
      <div
        className={
          shrinkTitle
            ? 'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3'
            : 'flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between xl:gap-4'
        }
      >
        <div
          className={
            shrinkTitle
              ? 'min-w-0 w-max max-w-[min(100%,14rem)] shrink overflow-hidden sm:max-w-[min(100%,18rem)] md:max-w-[min(100%,22rem)]'
              : 'shrink-0'
          }
        >
          {titleRow}
          {subtitle ? (
            <div className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
              {subtitle}
            </div>
          ) : null}
        </div>
        {actions && (
          <div
            className={
              shrinkTitle
                ? 'flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2 overflow-x-auto overflow-y-hidden p-1 -m-1'
                : 'flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 sm:justify-end xl:w-auto xl:pt-1'
            }
          >
            {actions}
          </div>
        )}
      </div>
      <div className="min-w-0 max-w-full">{children}</div>
    </div>
  );
};
