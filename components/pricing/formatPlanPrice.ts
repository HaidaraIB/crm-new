import { withLatinDigits } from '../../utils/dateUtils';

/** USD with Latin digits — same output the plan pages used before (Intl currency). */
export function formatPlanPrice(amount: number, language: string): string {
  return new Intl.NumberFormat(
    language === 'ar' ? 'ar' : 'en',
    withLatinDigits({ style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }),
  ).format(amount);
}
