/**
 * Opening a phone number in the official WhatsApp (wa.me) — the fallback used
 * whenever the tenant has no connected WhatsApp integration, or the user has no
 * access to the in-app Chats surface.
 *
 * wa.me only accepts digits: no `+`, spaces or punctuation. These values are
 * URLs/payloads, never rendered text, so they are deliberately not wrapped by
 * `PhoneText` (see .cursor/rules/phone-rtl-display.mdc).
 */

/** Digits-only form wa.me expects (drops the leading `+` and any separators). */
export function toWaDigits(phone: string | null | undefined): string {
  return String(phone || '').replace(/\D/g, '');
}

/** `https://wa.me/<digits>[?text=…]`, or null when the number has no digits. */
export function buildWaMeUrl(phone: string | null | undefined, text?: string): string | null {
  const digits = toWaDigits(phone);
  if (!digits) return null;
  const body = (text || '').trim();
  return `https://wa.me/${digits}${body ? `?text=${encodeURIComponent(body)}` : ''}`;
}

/** Opens the chat in a new tab. Returns false when the number is unusable. */
export function openWhatsAppExternal(phone: string | null | undefined, text?: string): boolean {
  const url = buildWaMeUrl(phone, text);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
