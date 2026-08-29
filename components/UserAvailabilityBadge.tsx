import React from 'react';
import type { User } from '../types';
import { getAssignmentBlockReason } from '../utils/weekOff';

/**
 * "Is this person receiving leads right now", with the reason when they are not.
 *
 * The reason is recomputed client-side (utils/weekOff mirrors crm/availability) rather
 * than read from `user.availability`, so a badge left open on screen flips by itself
 * when a leave window or an away timer expires, instead of showing a stale server answer.
 */
export const UserAvailabilityBadge = ({
    user,
    companyTimeZone,
    t,
    className = '',
}: {
    user: User;
    companyTimeZone?: string | null;
    t: (key: any) => string;
    className?: string;
}) => {
    const reason = getAssignmentBlockReason(user, companyTimeZone);

    if (!reason) {
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 ${className}`}
            >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
                {t('availableForLeads')}
            </span>
        );
    }

    let label: string;
    if (reason === 'time_off') {
        label = user.time_off_end_date
            ? t('onTimeOffUntil').replace('{date}', user.time_off_end_date)
            : t('onTimeOff');
    } else if (reason === 'unavailable') {
        const until = user.unavailable_until ? new Date(user.unavailable_until) : null;
        label =
            until && !Number.isNaN(until.getTime())
                ? t('unavailableUntil').replace(
                      '{time}',
                      until.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                  )
                : t('unavailableNow');
    } else {
        label = t('weeklyDayOff');
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 ${className}`}
            title={t('notReceivingLeads')}
        >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            {label}
        </span>
    );
};
