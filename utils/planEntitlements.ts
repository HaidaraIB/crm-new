/**
 * Shared labels and ordering for plan features / usage (aligned with subscriptions/entitlements_catalog.py).
 */

export type PlanLanguage = 'ar' | 'en';

/** Free-priced plan with trial_days > 0 (time-limited trial). */
export function isFreeTrialPlan(plan: {
  price_monthly?: number;
  price_yearly?: number;
  trial_days?: number;
}): boolean {
  const pm = Number(plan.price_monthly ?? 0);
  const py = Number(plan.price_yearly ?? 0);
  return pm <= 0 && py <= 0 && Number(plan.trial_days ?? 0) > 0;
}

/** Boolean feature flags — display order */
const FEATURE_KEY_ORDER = [
    'whatsapp_enabled',
    'sms_enabled',
    'backups_enabled',
    'lead_import_enabled',
] as const;

/** Monthly usage keys — display order */
const USAGE_KEY_ORDER = [
    'monthly_sms_messages',
    'monthly_whatsapp_messages',
    'monthly_notifications',
] as const;

const LABELS: Record<string, { ar: string; en: string }> = {
    sms_enabled: { ar: 'SMS', en: 'SMS' },
    whatsapp_enabled: { ar: 'واتساب', en: 'WhatsApp' },
    backups_enabled: { ar: 'نسخ احتياطي', en: 'Backups' },
    lead_import_enabled: { ar: 'استيراد', en: 'Import' },
    max_deals: { ar: 'الصفقات', en: 'Deals' },
    max_tasks: { ar: 'المهام', en: 'Tasks' },
    max_integration_accounts: { ar: 'التكاملات', en: 'Integrations' },
    max_whatsapp_numbers: { ar: 'أرقام واتساب', en: 'WhatsApp numbers' },
    max_message_templates: { ar: 'قوالب', en: 'Templates' },
    max_users: { ar: 'حد المستخدمين', en: 'Max users' },
    max_clients: { ar: 'حد العملاء', en: 'Max clients' },
    monthly_sms_messages: { ar: 'SMS شهرياً', en: 'Monthly SMS' },
    monthly_whatsapp_messages: { ar: 'واتساب شهرياً', en: 'Monthly WhatsApp' },
    monthly_notifications: { ar: 'إشعارات شهرياً', en: 'Monthly notifications' },
};

export function entitlementLabel(key: string, language: PlanLanguage): string {
    const v = LABELS[key];
    return v ? (language === 'ar' ? v.ar : v.en) : key;
}

export function formatLimitValue(val: unknown, language: PlanLanguage): string {
    if (val === 'unlimited') return language === 'ar' ? 'غير محدود' : 'Unlimited';
    if (val === null || typeof val === 'undefined') return language === 'ar' ? 'غير محدود' : 'Unlimited';
    if (typeof val === 'number') return `${val}`;
    return `${val}`;
}

/** Remaining subscription days with natural Arabic phrasing; English uses "day" / "days". */
export function formatDaysRemainingLabel(n: number, language: PlanLanguage): string {
    if (language === 'ar') {
        if (n <= 0) return `${n} أيام`;
        if (n === 1) return 'يوم واحد';
        if (n === 2) return 'يومان';
        if (n >= 3 && n <= 10) return `${n} أيام`;
        return `${n} يوماً`;
    }
    return `${n} ${n === 1 ? 'day' : 'days'}`;
}

export function normalizePlanText(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Hide description paragraph when it duplicates the plan title. */
export function isRedundantPlanDescription(displayName: string, description: string): boolean {
    if (!description.trim()) return true;
    return normalizePlanText(displayName) === normalizePlanText(description);
}

function sortKeysByOrder(keys: string[], order: readonly string[]): string[] {
    return [...keys].sort((a, b) => {
        const ia = order.indexOf(a as (typeof order)[number]);
        const ib = order.indexOf(b as (typeof order)[number]);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

/** Enabled feature keys, stable order (catalog first, then any extra keys alphabetically). */
export function getSortedEnabledFeatureKeys(features: Record<string, boolean> | undefined): string[] {
    const enabled = Object.entries(features || {})
        .filter(([, v]) => !!v)
        .map(([k]) => k);
    return sortKeysByOrder(enabled, FEATURE_KEY_ORDER);
}

/** All usage entries, stable order. */
export function getSortedUsageEntries(
    usage: Record<string, number | 'unlimited' | null> | undefined,
): [string, number | 'unlimited' | null][] {
    const keys = Object.keys(usage || {});
    const sortedKeys = sortKeysByOrder(keys, USAGE_KEY_ORDER);
    const u = usage || {};
    return sortedKeys.map((k) => [k, u[k] as number | 'unlimited' | null]);
}
