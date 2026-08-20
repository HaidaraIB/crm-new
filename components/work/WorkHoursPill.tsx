import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { useWorkSessionSnapshot } from './workSessionStore';
import { formatWorkedDuration } from '../../utils/workHours';
import { roleTracksWorkHours } from '../../utils/roles';

/**
 * The employee's own measured CRM usage for today, next to the connectivity pill.
 *
 * Reads the tracker's external store rather than fetching: every ping already writes
 * the fresh total there, so this updates once a minute at no request cost. Hidden
 * entirely for roles/companies that aren't tracked.
 */
export const WorkHoursPill = () => {
  const { t, currentUser } = useAppContext();
  const { state, todaySeconds } = useWorkSessionSnapshot();

  const trackingEnabled =
    Boolean(currentUser?.company?.work_hours_tracking_enabled) &&
    roleTracksWorkHours(currentUser?.role);

  if (!trackingEnabled || state === 'off') return null;

  const isPaused = state === 'paused';
  const label = t('workTrackingTodayLabel') || 'Working hours today';

  return (
    <div
      className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border flex-shrink-0 ${
        isPaused
          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/40'
          : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700'
      }`}
      role="status"
      aria-live="polite"
      title={label}
    >
      <svg
        className="h-3.5 w-3.5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{formatWorkedDuration(todaySeconds, t)}</span>
      {isPaused ? (
        <span className="opacity-80">· {t('workTrackingPausedShort') || 'Paused'}</span>
      ) : null}
    </div>
  );
};
