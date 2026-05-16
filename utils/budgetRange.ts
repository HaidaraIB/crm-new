import { withLatinDigits } from './latinNumerals';

/** Lead budget from API (camelCase or snake_case). */
export function getLeadBudgetBounds(lead: {
  budget?: number | string | null;
  budgetMax?: number | string | null;
  budget_max?: number | string | null;
}): { low: number; high: number } | null {
  const rawLo = lead.budget;
  const rawHi = lead.budgetMax ?? lead.budget_max;
  const toNum = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const lo = toNum(rawLo);
  const hi = toNum(rawHi);
  if (lo == null && hi == null) return null;
  if (lo != null && hi == null) return { low: lo, high: lo };
  if (lo == null && hi != null) return { low: hi, high: hi };
  const a = lo!;
  const b = hi!;
  return { low: Math.min(a, b), high: Math.max(a, b) };
}

function formatNum(n: number, locale: string): string {
  const formatted = n.toLocaleString(locale, withLatinDigits({
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }));
  return formatted.replace(/\.0+$/, '');
}

/** Human-readable budget or range for tables and detail views. */
export function formatLeadBudget(
  lead: { budget?: number | string | null; budgetMax?: number | string | null; budget_max?: number | string | null },
  locale = 'en-US'
): string {
  const r = getLeadBudgetBounds(lead);
  if (!r) return '';
  if (r.low <= 0 && r.high <= 0) return '';
  if (r.low === r.high) return formatNum(r.low, locale);
  return `${formatNum(r.low, locale)} – ${formatNum(r.high, locale)}`;
}

/** True if lead's budget range overlaps [filterMin, filterMax] (inclusive). */
export function leadBudgetOverlapsFilter(
  lead: { budget?: number | string | null; budgetMax?: number | string | null; budget_max?: number | string | null },
  filterMin: number,
  filterMax: number
): boolean {
  const r = getLeadBudgetBounds(lead);
  if (!r) return false;
  return r.high >= filterMin && r.low <= filterMax;
}
