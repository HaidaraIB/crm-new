import React from 'react';
import type { BillingCycleKey, PublicPlan } from './types';
import { formatPlanPrice } from './formatPlanPrice';
import { isFreeOrTrialPlan } from './normalizePublicPlan';

interface PlanPriceProps {
  plan: PublicPlan;
  cycle: BillingCycleKey;
  language: string;
  t: (key: string) => string;
  size?: 'lg' | 'md';
  /** `inline` shows "/mo" after the number; `below` shows "per month" on its own line (Register layout). */
  periodStyle?: 'inline' | 'below';
}

/**
 * Plan price block: struck-through regular price (only while a sale is live),
 * the price charged now, and the billing period. Numbers are LTR-isolated so
 * "$2.49" never flips inside Arabic text.
 */
const PlanPrice: React.FC<PlanPriceProps> = ({ plan, cycle, language, t, size = 'lg', periodStyle = 'inline' }) => {
  if (isFreeOrTrialPlan(plan)) {
    return (
      <span className={`${size === 'lg' ? 'text-3xl' : 'text-2xl'} font-extrabold tracking-tight text-heading`}>
        {t('free') || 'Free'}
      </span>
    );
  }
  const cp = plan.pricing[cycle];
  const anyCycleOnSale = plan.pricing.monthly.onSale || plan.pricing.yearly.onSale;
  const periodShort = cycle === 'yearly' ? t('planPerYearShort') : t('planPerMonthShort');
  const periodLong = cycle === 'yearly' ? t('perYear') || 'per year' : t('perMonth') || 'per month';

  return (
    <div>
      {/* Reserve the strike-through row whenever any cycle is on sale so cards stay aligned when toggling. */}
      {(cp.onSale || anyCycleOnSale) && (
        <div className="h-5 text-sm leading-5 text-gray-400 dark:text-gray-500">
          {cp.onSale && (
            <>
              <span className="sr-only">{t('planRegularPrice')}: </span>
              <del dir="ltr" className="[unicode-bidi:isolate]">
                {formatPlanPrice(cp.regular, language)}
              </del>
            </>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-baseline gap-x-1">
        {cp.onSale && <span className="sr-only">{t('planSalePrice')}: </span>}
        <span
          dir="ltr"
          className={`${size === 'lg' ? 'text-3xl' : 'text-2xl'} font-extrabold tracking-tight text-heading [unicode-bidi:isolate]`}
        >
          {formatPlanPrice(cp.price, language)}
        </span>
        {periodStyle === 'inline' && <span className="text-sm font-medium text-secondary">{periodShort}</span>}
      </div>
      {periodStyle === 'below' && <p className="mt-1 text-sm capitalize text-secondary">{periodLong}</p>}
    </div>
  );
};

export default PlanPrice;
