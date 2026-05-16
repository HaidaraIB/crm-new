/**
 * Western digits (0–9) for every locale.
 * Use with ar-EG / ar so month and weekday names stay Arabic while numerals stay Latin.
 */
export const LATIN_DIGITS = { numberingSystem: 'latn' as const };

export function withLatinDigits<T extends Intl.DateTimeFormatOptions | Intl.NumberFormatOptions>(
    options?: T | null
): T & typeof LATIN_DIGITS {
    return { ...(options ?? ({} as T)), ...LATIN_DIGITS };
}
