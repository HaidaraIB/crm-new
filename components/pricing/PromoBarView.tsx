import React, { useEffect, useRef, useState } from 'react';
import type { PromotionTheme } from './types';
import type { CountdownParts } from '../../hooks/useCountdown';

/**
 * Presentational promotion bar. CRM-admin-panel keeps an identical copy
 * (components/pricing/PromoBarView) for its live preview — change both together.
 */

export const PROMO_THEMES: Record<PromotionTheme, { bar: string; cta: string; chip: string; sep: string }> = {
  sale: {
    bar: 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 text-white',
    cta: 'bg-white text-rose-700 hover:bg-rose-50 focus-visible:ring-white',
    chip: 'bg-black/20 text-white',
    sep: 'text-white/70',
  },
  brand: {
    bar: 'bg-gradient-to-r from-primary-800 via-primary-600 to-primary-800 text-white',
    cta: 'bg-white text-primary-700 hover:bg-primary-50 focus-visible:ring-white',
    chip: 'bg-black/20 text-white',
    sep: 'text-white/60',
  },
  dark: {
    bar: 'bg-gray-950 text-white border-b border-white/10',
    cta: 'bg-primary-500 text-white hover:bg-primary-400 focus-visible:ring-primary-300',
    chip: 'bg-white/10 text-white',
    sep: 'text-primary-400',
  },
  amber: {
    bar: 'bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 text-gray-950',
    cta: 'bg-gray-950 text-white hover:bg-gray-800 focus-visible:ring-gray-950',
    chip: 'bg-black/10 text-gray-950',
    sep: 'text-gray-950/60',
  },
};

const MARQUEE_STYLE_ID = 'promo-bar-keyframes';
function ensureKeyframes() {
  if (typeof document === 'undefined' || document.getElementById(MARQUEE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = MARQUEE_STYLE_ID;
  style.textContent = `
@keyframes promo-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes promo-marquee-rtl { from { transform: translateX(0); } to { transform: translateX(50%); } }
.promo-track { animation: promo-marquee var(--promo-duration, 40s) linear infinite; }
[dir="rtl"] .promo-track { animation-name: promo-marquee-rtl; }
.promo-marquee:hover .promo-track, .promo-marquee:focus-within .promo-track { animation-play-state: paused; }
@keyframes promo-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.promo-fade { animation: promo-fade .35s ease-out; }
@media (prefers-reduced-motion: reduce) { .promo-track, .promo-fade { animation: none !important; } }
`;
  document.head.appendChild(style);
}

function usePrefersReducedMotion(forced?: boolean): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return forced ?? reduce;
}

const Sparkle = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-3.5 w-3.5 shrink-0 ${className}`} fill="currentColor">
    <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
  </svg>
);

const pad2 = (n: number) => String(n).padStart(2, '0');

export interface PromoBarLabels {
  endsIn: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  dismiss: string;
  region: string;
  endsOn?: string;
}

export interface PromoBarViewProps {
  messages: string[];
  theme: PromotionTheme;
  ctaLabel?: string;
  onCta?: (e: React.MouseEvent) => void;
  ctaHref?: string;
  countdown?: CountdownParts | null;
  dismissible?: boolean;
  onDismiss?: () => void;
  labels: PromoBarLabels;
  dir: 'ltr' | 'rtl';
  /** Force static rotation (preview of reduced-motion mode). */
  reducedMotion?: boolean;
}

/** Countdown "02d : 14h : 33m : 12s" — Latin digits, always LTR-isolated. */
export const CountdownDisplay: React.FC<{ parts: CountdownParts; labels: PromoBarLabels; chipClass: string }> = ({
  parts,
  labels,
  chipClass,
}) => {
  const units: [number, string][] = [
    [parts.days, labels.days],
    [parts.hours, labels.hours],
    [parts.minutes, labels.minutes],
    [parts.seconds, labels.seconds],
  ];
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap" aria-hidden="true">
      <span className="hidden text-xs font-medium opacity-90 sm:inline">{labels.endsIn}</span>
      <span dir="ltr" className="inline-flex items-center gap-0.5 tabular-nums [unicode-bidi:isolate] sm:gap-1">
        {units.map(([value, unit], i) => (
          <React.Fragment key={unit}>
            {i > 0 && <span className="opacity-60">:</span>}
            <span className={`rounded-md px-1 py-0.5 text-xs font-bold sm:px-1.5 ${chipClass}`}>
              {pad2(value)}
              <span className="ms-0.5 text-[10px] font-semibold opacity-80">{unit}</span>
            </span>
          </React.Fragment>
        ))}
      </span>
    </span>
  );
};

const PromoBarView: React.FC<PromoBarViewProps> = ({
  messages,
  theme,
  ctaLabel,
  onCta,
  ctaHref,
  countdown,
  dismissible,
  onDismiss,
  labels,
  dir,
  reducedMotion,
}) => {
  ensureKeyframes();
  const tokens = PROMO_THEMES[theme] || PROMO_THEMES.sale;
  const reduce = usePrefersReducedMotion(reducedMotion);
  const items = messages.map((m) => m.trim()).filter(Boolean);

  // Ticker vs. static: marquee only when the messages overflow and motion is allowed.
  const viewportRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const vp = viewportRef.current;
    const m = measureRef.current;
    if (!vp || !m) return;
    const check = () => setOverflow(m.scrollWidth > vp.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(vp);
    ro.observe(m);
    return () => ro.disconnect();
  }, [items.join('|')]);

  // Reduced motion (or a narrow screen that overflows): rotate one message at a time.
  const [index, setIndex] = useState(0);
  const rotate = (reduce && overflow) || false;
  useEffect(() => {
    if (!rotate || items.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 5000);
    return () => window.clearInterval(id);
  }, [rotate, items.length]);
  useEffect(() => setIndex(0), [items.length]);

  if (items.length === 0) return null;

  const row = (keyPrefix: string, hidden = false) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((text, i) => (
        <span key={`${keyPrefix}${i}`} className="inline-flex items-center whitespace-nowrap">
          <span className="px-4 text-sm font-semibold">{text}</span>
          <Sparkle className={tokens.sep} />
        </span>
      ))}
    </div>
  );

  const ctaClass = `inline-flex h-8 shrink-0 items-center rounded-full px-4 text-xs font-bold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${tokens.cta}`;
  const duration = `${Math.max(20, items.join(' ').length * 0.35)}s`;

  return (
    <div role="region" aria-label={labels.region} dir={dir} className={`relative w-full ${tokens.bar}`}>
      {/* Screen readers get the messages once, statically, plus a static end date. */}
      <p className="sr-only">
        {items.join('. ')}
        {labels.endsOn ? `. ${labels.endsOn}` : ''}
      </p>
      <div className="mx-auto flex min-h-11 max-w-screen-2xl items-center gap-3 px-4 py-1.5 sm:px-6">
        <div ref={viewportRef} className="promo-marquee relative min-w-0 flex-1 overflow-hidden" aria-hidden="true">
          {/* Invisible measurer for overflow detection. */}
          <div ref={measureRef} className="pointer-events-none invisible absolute inset-x-0 top-0 flex w-max">
            {row('m')}
          </div>
          {overflow && !reduce ? (
            <div
              className="promo-track flex w-max [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
              style={{ ['--promo-duration' as any]: duration }}
            >
              {row('a')}
              {row('b', true)}
            </div>
          ) : rotate ? (
            <div key={index} className="promo-fade truncate text-center text-sm font-semibold sm:text-start">
              {items[index]}
            </div>
          ) : (
            <div className="flex items-center justify-center">{row('s')}</div>
          )}
        </div>
        {countdown && !countdown.expired && (
          <CountdownDisplay parts={countdown} labels={labels} chipClass={tokens.chip} />
        )}
        {ctaLabel &&
          (ctaHref ? (
            <a href={ctaHref} onClick={onCta} className={ctaClass}>
              {ctaLabel}
            </a>
          ) : (
            <button type="button" onClick={onCta} className={ctaClass}>
              {ctaLabel}
            </button>
          ))}
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={labels.dismiss}
            title={labels.dismiss}
            className="-me-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full opacity-80 transition hover:bg-black/10 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default PromoBarView;
