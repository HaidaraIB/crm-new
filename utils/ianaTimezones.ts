/**
 * Curated IANA zones for company business calendar (day off "today").
 * If saved value is missing here, UI prepends it so it stays selectable.
 */
export type TimezoneGroup = { label: string; zones: string[] };

export const IANA_TIMEZONE_GROUPS: TimezoneGroup[] = [
    {
        label: 'UTC',
        zones: ['UTC'],
    },
    {
        label: 'Middle East & Gulf',
        zones: [
            'Asia/Riyadh',
            'Asia/Dubai',
            'Asia/Baghdad',
            'Asia/Kuwait',
            'Asia/Bahrain',
            'Asia/Qatar',
            'Asia/Muscat',
            'Asia/Aden',
            'Asia/Tehran',
            'Asia/Jerusalem',
            'Asia/Beirut',
            'Asia/Amman',
            'Asia/Damascus',
        ],
    },
    {
        label: 'Africa',
        zones: ['Africa/Cairo', 'Africa/Casablanca', 'Africa/Nairobi', 'Africa/Johannesburg'],
    },
    {
        label: 'Europe',
        zones: [
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin',
            'Europe/Madrid',
            'Europe/Rome',
            'Europe/Amsterdam',
            'Europe/Brussels',
            'Europe/Zurich',
            'Europe/Istanbul',
            'Europe/Moscow',
        ],
    },
    {
        label: 'Americas',
        zones: [
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Phoenix',
            'America/Los_Angeles',
            'America/Vancouver',
            'America/Toronto',
            'America/Mexico_City',
            'America/Sao_Paulo',
            'America/Bogota',
            'America/Lima',
            'America/Caracas',
        ],
    },
    {
        label: 'Asia & Pacific',
        zones: [
            'Asia/Kolkata',
            'Asia/Dhaka',
            'Asia/Karachi',
            'Asia/Jakarta',
            'Asia/Bangkok',
            'Asia/Singapore',
            'Asia/Manila',
            'Asia/Hong_Kong',
            'Asia/Shanghai',
            'Asia/Taipei',
            'Asia/Tokyo',
            'Asia/Seoul',
            'Australia/Sydney',
            'Australia/Melbourne',
            'Australia/Perth',
            'Pacific/Auckland',
        ],
    },
];

export function allListedIanaZones(): Set<string> {
    return new Set(IANA_TIMEZONE_GROUPS.flatMap((g) => g.zones));
}
