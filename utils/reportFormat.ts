type Translate = (key: string) => string;

/** "45s", "12m", "3h 20m", "2d 5h". Digits stay Latin in every language. */
export function formatDuration(seconds: number | null | undefined, t: Translate): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const s = Math.max(0, Math.round(seconds));
  const d = t('reportUnitDay');
  const h = t('reportUnitHour');
  const m = t('reportUnitMinute');
  const sec = t('reportUnitSecond');
  if (s < 60) return `${s}${sec}`;
  if (s < 3600) {
    const mins = Math.floor(s / 60);
    const rest = s % 60;
    return mins < 10 && rest ? `${mins}${m} ${rest}${sec}` : `${mins}${m}`;
  }
  if (s < 86400) {
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    return mins ? `${hours}${h} ${mins}${m}` : `${hours}${h}`;
  }
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  return hours ? `${days}${d} ${hours}${h}` : `${days}${d}`;
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export function formatCount(value: number | null | undefined): string {
  return value == null ? '—' : value.toLocaleString('en-US');
}

export function formatMoney(value: number | null | undefined): string {
  return value == null ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Signed relative change vs. the previous period; null when it cannot be computed. */
export function percentChange(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
