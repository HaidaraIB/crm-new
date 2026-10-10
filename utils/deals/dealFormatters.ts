import type { Deal, DealStageType } from '../../types';

export function formatDealMoney(value: number | string | null | undefined, currency?: string): string {
  const amount = Number(value ?? 0);
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    Number.isFinite(amount) ? amount : 0,
  );
  return currency ? `${formatted} ${currency}` : formatted;
}

export function effectiveProbability(deal: Pick<Deal, 'probability' | 'stageProbability' | 'stageType'>): number {
  if (deal.probability != null) return deal.probability;
  if (deal.stageProbability != null) return deal.stageProbability;
  if (deal.stageType === 'won') return 100;
  return 0;
}

export function stageTypeLabel(type: DealStageType | null | undefined, t: (key: string) => string): string {
  if (type === 'won') return t('dealWonStage');
  if (type === 'lost') return t('dealLostStage');
  return t('dealOpenStage');
}

/** Readable text on a stage color: dark ink on light fills, white on dark fills. */
export function textOnStageColor(hex?: string | null): string {
  const raw = (hex || '').replace('#', '');
  if (raw.length < 6) return '#ffffff';
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((part) => Number.isNaN(part))) return '#ffffff';
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 160 ? '#111827' : '#ffffff';
}

export function isDealOverdue(deal: Pick<Deal, 'expectedCloseDate' | 'stageType'>): boolean {
  if (!deal.expectedCloseDate || deal.stageType === 'won' || deal.stageType === 'lost') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const close = new Date(deal.expectedCloseDate);
  return !Number.isNaN(close.getTime()) && close < today;
}
