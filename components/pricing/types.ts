/**
 * Public pricing contract (GET /public/plans/, GET /public/promotions/active/).
 * One shared shape for every plan surface (Register, Change Plan, Billing).
 */

export type BillingCycleKey = 'monthly' | 'yearly';

export type PlanBadgeKey = 'most_popular' | 'best_value' | 'recommended' | 'new' | 'limited_offer' | 'custom';

export interface CyclePrice {
  /** Regular list price. */
  regular: number;
  /** What is charged right now (sale price while a sale is live). */
  price: number;
  onSale: boolean;
  /** Floored on the server; never overstated. */
  discountPercent: number;
}

export interface PlanBadge {
  key: PlanBadgeKey;
  text: string;
  textAr: string;
}

export interface PublicPlan {
  id: number;
  name: string;
  name_ar?: string;
  description: string;
  description_ar?: string;
  /** Regular price (unchanged meaning — pricing.* carries the sale). */
  price_monthly: number;
  price_yearly: number;
  trial_days: number;
  users: string;
  clients: string;
  features?: Record<string, boolean>;
  limits?: Record<string, number | 'unlimited' | null>;
  usage_limits_monthly?: Record<string, number | 'unlimited' | null>;
  tier?: number;
  pricing: Record<BillingCycleKey, CyclePrice>;
  saleEndsAt: string | null;
  badge: PlanBadge | null;
  isFeatured: boolean;
  offerNote: string;
  offerNoteAr: string;
  sortOrder: number;
}

export type PromotionTheme = 'sale' | 'brand' | 'dark' | 'amber';

export interface PublicPromotion {
  id: number;
  messages: { en: string; ar: string }[];
  cta_label: string;
  cta_label_ar: string;
  cta_url: string;
  theme: PromotionTheme;
  starts_at: string;
  ends_at: string | null;
  show_countdown: boolean;
  dismissible: boolean;
  updated_at: string;
}

export interface ActivePromotionResponse {
  promotion: PublicPromotion | null;
  server_time: string;
}

export type PromotionAudience = 'public' | 'dashboard' | 'mobile';
