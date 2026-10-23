import type { BillingCycleKey, CyclePrice, PlanBadgeKey, PublicPlan } from './types';

const BADGE_KEYS: PlanBadgeKey[] = ['most_popular', 'best_value', 'recommended', 'new', 'limited_offer', 'custom'];

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function cyclePrice(raw: any, regularFallback: number): CyclePrice {
  // Older API (no `pricing`): the regular price is what is charged.
  if (!raw || typeof raw !== 'object') {
    return { regular: regularFallback, price: regularFallback, onSale: false, discountPercent: 0 };
  }
  const regular = toNum(raw.regular ?? regularFallback);
  const price = toNum(raw.price ?? regular);
  const onSale = Boolean(raw.on_sale) && price > 0 && price < regular;
  return {
    regular,
    price: onSale ? price : regular,
    onSale,
    discountPercent: onSale ? Math.max(0, Math.floor(toNum(raw.discount_percent))) : 0,
  };
}

/** API row -> PublicPlan. Safe against older API responses without offer fields. */
export function normalizePublicPlan(plan: any): PublicPlan {
  const priceMonthly = toNum(plan?.price_monthly);
  const priceYearly = toNum(plan?.price_yearly);
  const rawBadge = plan?.badge;
  const badgeKey = (rawBadge && typeof rawBadge === 'object' ? rawBadge.key : rawBadge) as PlanBadgeKey | undefined;
  const pricing: Record<BillingCycleKey, CyclePrice> = {
    monthly: cyclePrice(plan?.pricing?.monthly, priceMonthly),
    yearly: cyclePrice(plan?.pricing?.yearly, priceYearly),
  };
  return {
    id: plan.id,
    name: plan.name || '',
    name_ar: plan.name_ar || '',
    description: plan.description || '',
    description_ar: plan.description_ar || '',
    price_monthly: priceMonthly,
    price_yearly: priceYearly,
    trial_days: toNum(plan.trial_days),
    users: plan.users,
    clients: plan.clients,
    features: plan.features || {},
    limits: plan.limits || {},
    usage_limits_monthly: plan.usage_limits_monthly || {},
    tier: typeof plan.tier === 'number' ? plan.tier : undefined,
    pricing,
    saleEndsAt: pricing.monthly.onSale || pricing.yearly.onSale ? plan.sale_ends_at || null : null,
    badge:
      badgeKey && BADGE_KEYS.includes(badgeKey)
        ? { key: badgeKey, text: rawBadge?.text || '', textAr: rawBadge?.text_ar || '' }
        : null,
    isFeatured: Boolean(plan.is_featured),
    offerNote: plan.offer_note || '',
    offerNoteAr: plan.offer_note_ar || '',
    sortOrder: toNum(plan.sort_order),
  };
}

export function normalizePublicPlans(data: unknown): PublicPlan[] {
  return (Array.isArray(data) ? data : []).map(normalizePublicPlan);
}

export const isFreeOrTrialPlan = (plan: Pick<PublicPlan, 'price_monthly' | 'price_yearly'>) =>
  Number(plan.price_monthly || 0) <= 0 && Number(plan.price_yearly || 0) <= 0;
