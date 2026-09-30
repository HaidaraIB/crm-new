/**
 * Western digits (0–9) for every locale.
 * Month and weekday names stay Arabic; numerals stay 0–9.
 */
export const LATIN_DIGITS = { numberingSystem: 'latn' as const };

export function withLatinDigits<T extends Intl.DateTimeFormatOptions | Intl.NumberFormatOptions>(
    options?: T | null
): T & typeof LATIN_DIGITS {
    return { ...(options ?? ({} as T)), ...LATIN_DIGITS };
}

type FormatOptions = Intl.DateTimeFormatOptions | Intl.NumberFormatOptions | Intl.RelativeTimeFormatOptions;

function latnOptions(options?: FormatOptions | null): FormatOptions {
    const base = options && typeof options === 'object' ? options : {};
    return { ...base, ...LATIN_DIGITS };
}

function wrapFormatCtor<T extends new (...args: any[]) => object>(Orig: T): T {
    function Wrapped(this: object, locales?: Intl.LocalesArgument, options?: FormatOptions) {
        const args = [locales, latnOptions(options)] as const;
        if (!new.target) return new Orig(...args);
        return Reflect.construct(Orig, args, new.target);
    }
    Object.setPrototypeOf(Wrapped, Orig);
    Wrapped.prototype = Orig.prototype;
    const supported = (Orig as { supportedLocalesOf?: (...args: unknown[]) => string[] }).supportedLocalesOf;
    if (supported) {
        (Wrapped as { supportedLocalesOf?: (...args: unknown[]) => string[] }).supportedLocalesOf =
            supported.bind(Orig);
    }
    return Wrapped as unknown as T;
}

function patchToLocale(proto: object, names: string[]) {
    const target = proto as Record<string, (...args: unknown[]) => string>;
    for (const name of names) {
        const orig = target[name];
        if (typeof orig !== 'function') continue;
        target[name] = function (this: unknown, locales?: Intl.LocalesArgument, options?: FormatOptions) {
            return orig.call(this, locales, latnOptions(options));
        };
    }
}

/** Force 0–9 on every Intl formatter, including call sites that skip {@link withLatinDigits}. */
export function installLatinDigits(): void {
    const g = globalThis as { __crmLatinDigits?: boolean };
    if (g.__crmLatinDigits || typeof Intl === 'undefined') return;
    g.__crmLatinDigits = true;

    Intl.NumberFormat = wrapFormatCtor(Intl.NumberFormat);
    Intl.DateTimeFormat = wrapFormatCtor(Intl.DateTimeFormat);
    if (typeof Intl.RelativeTimeFormat === 'function') {
        Intl.RelativeTimeFormat = wrapFormatCtor(Intl.RelativeTimeFormat);
    }

    patchToLocale(Date.prototype, ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString']);
    patchToLocale(Number.prototype, ['toLocaleString']);
    patchToLocale(BigInt.prototype, ['toLocaleString']);
}
