/**
 * Formatting for measured CRM usage time ("working hours").
 */

/**
 * Render seconds as a compact localized duration, e.g. `7h 42m` / `٧س ٤٢د`.
 *
 * Minute granularity on purpose: the tracker updates once per ping, so a seconds
 * display would sit visibly stale. Template-literal interpolation always emits Latin
 * digits, matching the `withLatinDigits()` convention used across the report tables.
 */
export const formatWorkedDuration = (seconds: number, t: (key: any) => string): string => {
  const totalMinutes = Math.max(0, Math.round((Number(seconds) || 0) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const h = t('hoursShort') || 'h';
  const m = t('minutesShort') || 'm';

  if (!hours && !minutes) return `0${h}`;
  if (!hours) return `${minutes}${m}`;
  if (!minutes) return `${hours}${h}`;
  return `${hours}${h} ${minutes}${m}`;
};
