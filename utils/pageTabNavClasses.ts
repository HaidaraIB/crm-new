/**
 * Horizontal underlined tabs: active state avoids `text-primary`, which is often
 * too dark on dark backgrounds; underline is slightly thicker for visibility.
 */
export const PAGE_TAB_ACTIVE =
    'border-b-[3px] border-primary font-semibold text-gray-900 dark:text-white';

export const PAGE_TAB_INACTIVE =
    'border-b-[3px] border-transparent font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600';
