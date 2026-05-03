/**
 * Weekly day off in UI: match Python datetime.weekday() — Monday = 0, Sunday = 6.
 * Uses company IANA timezone to decide "today".
 */

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
