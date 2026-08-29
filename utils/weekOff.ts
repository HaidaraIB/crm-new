/**
 * Weekly day off in UI: match Python datetime.weekday() — Monday = 0, Sunday = 6.
 * Uses company IANA timezone to decide "today".
 * Also: daily working-hours window for urgent assignment (company local time).
 */

import type { AssignmentBlockReason } from '../types';
import type { translations } from '../constants';

const SHORT_WD: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
};

/** Monday=0 .. Sunday=6 in the given IANA zone. */
export function companyLocalWeekday(timeZone: string, at: Date = new Date()): number {
    const tz = (timeZone || 'UTC').trim() || 'UTC';
    try {
        const short = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            weekday: 'short',
        }).format(at);
        const key = short.slice(0, 3) as keyof typeof SHORT_WD;
        return SHORT_WD[key] ?? 0;
    } catch {
        const wd = at.getUTCDay();
        return wd === 0 ? 6 : wd - 1;
    }
}

export function isUserOnWeeklyDayOff(
    user: { weekly_day_off?: number | null },
    companyTimeZone?: string | null
): boolean {
    if (user.weekly_day_off === undefined || user.weekly_day_off === null) return false;
    const tz = companyTimeZone?.trim() || 'UTC';
    return companyLocalWeekday(tz) === user.weekly_day_off;
}

/** HH:MM or HH:MM:SS → minutes since midnight, or null if invalid. */
export function parseTimeToMinutes(value: string | null | undefined): number | null {
    if (!value || typeof value !== 'string') return null;
    const parts = value.trim().split(':');
    if (parts.length < 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
}

/** Local time-of-day in minutes (company TZ). */
export function companyLocalMinutes(timeZone: string, at: Date = new Date()): number {
    const tz = (timeZone || 'UTC').trim() || 'UTC';
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(at);
        const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
        const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
        // en-GB can yield 24 for midnight in some engines
        const h = hour === 24 ? 0 : hour;
        return h * 60 + minute;
    } catch {
        return at.getUTCHours() * 60 + at.getUTCMinutes();
    }
}

function minutesInWindow(nowMin: number, startMin: number, endMin: number): boolean {
    if (startMin === endMin) return false;
    if (startMin < endMin) return nowMin >= startMin && nowMin <= endMin;
    return nowMin >= startMin || nowMin <= endMin;
}

export function isUserWithinWorkingHours(
    user: { work_start_time?: string | null; work_end_time?: string | null },
    companyTimeZone?: string | null,
    at: Date = new Date()
): boolean {
    const startMin = parseTimeToMinutes(user.work_start_time ?? undefined);
    const endMin = parseTimeToMinutes(user.work_end_time ?? undefined);
    if (startMin === null || endMin === null) return false;
    const tz = companyTimeZone?.trim() || 'UTC';
    return minutesInWindow(companyLocalMinutes(tz, at), startMin, endMin);
}

/** On-shift for urgent routing: not on day off + within working hours. */
export function isUserOnShiftForUrgent(
    user: {
        weekly_day_off?: number | null;
        work_start_time?: string | null;
        work_end_time?: string | null;
        is_active?: boolean;
    },
    companyTimeZone?: string | null,
    at: Date = new Date()
): boolean {
    if (user.is_active === false) return false;
    if (isUserOnWeeklyDayOff(user, companyTimeZone)) return false;
    return isUserWithinWorkingHours(user, companyTimeZone, at);
}

/** YYYY-MM-DD "today" in the given IANA zone, comparable to the API's date strings. */
export function companyLocalDateISO(timeZone: string, at: Date = new Date()): string {
    const tz = (timeZone || 'UTC').trim() || 'UTC';
    try {
        // en-CA formats as YYYY-MM-DD, which sorts and compares lexicographically.
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(at);
    } catch {
        return at.toISOString().slice(0, 10);
    }
}

export interface UserAvailabilityFields {
    weekly_day_off?: number | null;
    time_off_start_date?: string | null;
    time_off_end_date?: string | null;
    unavailable_until?: string | null;
}

/** True while today (company TZ) is inside the user's planned leave window, bounds inclusive. */
export function isUserOnTimeOff(
    user: UserAvailabilityFields,
    companyTimeZone?: string | null,
    at: Date = new Date()
): boolean {
    const start = user.time_off_start_date;
    const end = user.time_off_end_date;
    // A half-set window is config in progress, not open-ended leave.
    if (!start || !end) return false;
    const today = companyLocalDateISO(companyTimeZone?.trim() || 'UTC', at);
    return start <= today && today <= end;
}

/** True while the ad-hoc "unavailable" timestamp is still in the future. */
export function isUserTemporarilyUnavailable(
    user: UserAvailabilityFields,
    at: Date = new Date()
): boolean {
    if (!user.unavailable_until) return false;
    const until = new Date(user.unavailable_until).getTime();
    if (Number.isNaN(until)) return false;
    return until > at.getTime();
}

/**
 * Why this user cannot take a new assignment right now, or null if they can.
 * Mirrors crm/availability.assignment_block_reason, including its precedence:
 * planned leave beats the ad-hoc toggle, which beats the weekly day off.
 */
export function getAssignmentBlockReason(
    user: UserAvailabilityFields,
    companyTimeZone?: string | null,
    at: Date = new Date()
): AssignmentBlockReason | null {
    if (isUserOnTimeOff(user, companyTimeZone, at)) return 'time_off';
    if (isUserTemporarilyUnavailable(user, at)) return 'unavailable';
    if (isUserOnWeeklyDayOff(user, companyTimeZone)) return 'weekly_day_off';
    return null;
}

/** constants.ts key for a block reason, for labelling a disabled assignee option. */
export const ASSIGNMENT_BLOCK_LABEL_KEY: Record<
    AssignmentBlockReason,
    keyof typeof translations.en
> = {
    time_off: 'onTimeOff',
    unavailable: 'unavailableNow',
    weekly_day_off: 'weeklyDayOff',
};

/** Normalize API time (HH:MM:SS) to HTML time input value (HH:MM). */
export function toHtmlTimeValue(value: string | null | undefined): string {
    if (!value) return '';
    const parts = value.trim().split(':');
    if (parts.length < 2) return '';
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    return `${h}:${m}`;
}
