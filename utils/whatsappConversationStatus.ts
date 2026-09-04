/** Shared WhatsApp conversation status colors / rail keys (Mujeb-style). */

export const WHATSAPP_STATUS_COLORS: Record<string, string> = {
  open: '#22c55e',
  pending: '#f59e0b',
  spam: '#ef4444',
  invalid: '#a855f7',
  done: '#64748b',
  snoozed: '#0ea5e9',
  unread: '#3b82f6',
  unsubscribed: '#94a3b8',
  all: '#6366f1',
};

export const WHATSAPP_STATUS_RAIL_KEYS = [
  'all',
  'open',
  'pending',
  'spam',
  'invalid',
  'done',
  'snoozed',
  'unread',
  'unsubscribed',
] as const;

export type WhatsAppStatusRailKey = (typeof WHATSAPP_STATUS_RAIL_KEYS)[number];

export function chatStatusLabelKey(status: string): string {
  const key = String(status || 'open').toLowerCase();
  if ((WHATSAPP_STATUS_RAIL_KEYS as readonly string[]).includes(key) || key in WHATSAPP_STATUS_COLORS) {
    return `chatStatus_${key}`;
  }
  return 'chatStatus_open';
}
