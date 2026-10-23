import React from 'react';
import { ClockIcon } from '../icons';
import { useCountdown } from '../../hooks/useCountdown';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';

const URGENT_WITHIN_MS = 7 * 86400_000;

interface SaleCountdownChipProps {
  endsAt: string | null;
  language: string;
  t: (key: string) => string;
  serverOffsetMs?: number;
  /** Called once when the sale ends, so the page can refetch server prices. */
  onExpire?: () => void;
}

/**
 * Under a discounted price: a ticking "Offer ends in 2d 04:13:22" in the final
 * week, otherwise a calm "Offer ends Nov 30". The server stays the source of truth.
 */
const SaleCountdownChip: React.FC<SaleCountdownChipProps> = ({ endsAt, language, t, serverOffsetMs, onExpire }) => {
  const parts = useCountdown(endsAt, { serverOffsetMs, onExpire });
  if (!endsAt || !parts || parts.expired) return null;

  const urgent = parts.totalMs <= URGENT_WITHIN_MS;
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateLabel = new Intl.DateTimeFormat(
    language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
    withLatinDigits({ month: 'short', day: 'numeric' }),
  ).format(new Date(endsAt));

  return (
    <p
      className={`mt-2 inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 whitespace-normal rounded-full px-2.5 py-1 text-xs font-semibold ${
        urgent
          ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
          : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200'
      }`}
    >
      <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {urgent ? (
        <>
          <span>{t('planOfferEndsIn')}</span>
          {parts.days > 0 && (
            <span className="tabular-nums [unicode-bidi:isolate]" aria-hidden="true">
              {parts.days}
              {t('promoUnitD')}
            </span>
          )}
          <span dir="ltr" className="tabular-nums [unicode-bidi:isolate]" aria-hidden="true">
            {pad(parts.hours)}:{pad(parts.minutes)}:{pad(parts.seconds)}
          </span>
          <span className="sr-only">{dateLabel}</span>
        </>
      ) : (
        <span>{t('planOfferEndsOn').replace('{date}', dateLabel)}</span>
      )}
    </p>
  );
};

export default SaleCountdownChip;
