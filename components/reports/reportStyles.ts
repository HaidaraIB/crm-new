import { dashboardSurface } from '../dashboard/dashboardStyles';

export { dashboardSurface as reportSurface };

/** Same max width as Dashboard for consistency */
export const reportPageContainer = 'mx-auto max-w-[1600px] w-full space-y-6';

export const reportHero =
  'rounded-2xl bg-gradient-to-br from-white via-primary-50/40 to-blue-50/70 dark:from-gray-900 dark:via-gray-900 dark:to-primary-950/35 shadow-xl shadow-gray-200/80 dark:shadow-none dark:ring-1 dark:ring-gray-700/60 p-5 sm:p-7';

export const reportTableChrome =
  'rounded-xl border border-gray-100/90 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-950/30';

export const reportTheadRow =
  'text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 bg-gradient-to-r rtl:bg-gradient-to-l from-gray-50 to-indigo-50/35 dark:from-gray-800/95 dark:to-primary-950/25 border-b border-gray-200/80 dark:border-gray-700';

export const reportTheadCell =
  'px-4 py-3 font-semibold whitespace-nowrap text-center align-middle';

export const reportTbodyCell =
  'px-4 py-3.5 whitespace-nowrap text-center align-middle text-sm text-gray-900 dark:text-gray-100';

export const reportTableRowInteractive =
  'border-b border-gray-100/80 dark:border-gray-800/70 hover:bg-white/90 dark:hover:bg-gray-800/55 transition-colors duration-150';

export const reportEmptyCard = `${dashboardSurface} p-10 sm:p-14 text-center`;
