export const WHATSAPP_SESSION_MS = 24 * 60 * 60 * 1000;

export function deriveSessionFromMessages(
  messages: { direction?: string; created_at?: string }[]
): boolean {
  let latest = 0;
  for (const m of messages) {
    if (m.direction !== 'inbound' && m.direction !== 'in') continue;
    if (!m.created_at) continue;
    const ts = new Date(m.created_at).getTime();
    if (!Number.isNaN(ts) && ts > latest) latest = ts;
  }
  if (!latest) return false;
  return Date.now() - latest < WHATSAPP_SESSION_MS;
}
