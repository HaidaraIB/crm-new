import React from 'react';
import type { BillingCycleKey, PublicPlan } from './types';

/** Localized label for a plan badge (preset key or admin custom text). */
export function planBadgeLabel(plan: PublicPlan, language: string, t: (key: string) => string): string {
  const b = plan.badge;
  if (!b) return '';
  if (b.key === 'custom') return (language === 'ar' ? b.textAr || b.text : b.text || b.textAr) || '';
  const keys: Record<string, string> = {
    most_popular: 'planMostPopular',
    best_value: 'planBadgeBestValue',
    recommended: 'planBadgeRecommended',
    new: 'planBadgeNew',
    limited_offer: 'planBadgeLimitedOffer',
  };
  return t(keys[b.key] || '') || '';
}

interface PlanCornerBadgesProps {
  plan: PublicPlan;
  cycle: BillingCycleKey;
  language: string;
  t: (key: string) => string;
  /** The card itself is the dark featured style (Register): use the light pill. */
  onDarkCard?: boolean;
}

/**
 * Pills that sit on the card's top edge (end side): the marketing badge and,
 * while a sale is live for this cycle, the "−79%" discount pill.
 */
const PlanCornerBadges: React.FC<PlanCornerBadgesProps> = ({ plan, cycle, language, t, onDarkCard = false }) => {
  const label = planBadgeLabel(plan, language, t);
  const cp = plan.pricing[cycle];
  if (!label && !cp.onSale) return null;
  return (
    <div className="pointer-events-none absolute -top-3 end-4 flex items-center gap-1.5">
      {label && (
        <span
          className={`rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-sm ${
            onDarkCard ? 'bg-white text-primary-800' : 'bg-amber-400 text-gray-900'
          }`}
        >
          {label}
        </span>
      )}
      {cp.onSale && (
        <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
          <span dir="ltr" className="[unicode-bidi:isolate]">
            {t('planDiscountOff').replace('{percent}', String(cp.discountPercent))}
          </span>
        </span>
      )}
    </div>
  );
};

export default PlanCornerBadges;
