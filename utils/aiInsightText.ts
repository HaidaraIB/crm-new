import type { ClientAIInsightResponse } from '../services/api';

export type InsightTextField = 'summary' | 'reasoning' | 'suggested_task_notes';

/**
 * Pick bilingual AI insight copy for the active UI language.
 * Falls back to legacy single-language fields when needed.
 */
export function pickInsightText(
  item: Pick<
    ClientAIInsightResponse,
    InsightTextField | `${InsightTextField}_en` | `${InsightTextField}_ar`
  >,
  field: InsightTextField,
  language: string,
): string {
  const enKey = `${field}_en` as const;
  const arKey = `${field}_ar` as const;
  const en = String((item[enKey] as string | undefined) ?? item[field] ?? '').trim();
  const ar = String((item[arKey] as string | undefined) ?? '').trim();
  if (language === 'ar') {
    return ar || en;
  }
  return en || ar;
}
