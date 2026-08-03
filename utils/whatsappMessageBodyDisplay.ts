import { translations } from '../constants';

type TFn = (key: keyof typeof translations.en) => string;

/** Meta coexistence / Cloud API stub bodies stored when media or rich content isn't available. */
const WHATSAPP_BODY_PLACEHOLDER_KEYS: Record<string, keyof typeof translations.en> = {
  '[media message]': 'whatsappMediaUnavailable',
  '[image message]': 'whatsappMediaImagePlaceholder',
  '[video message]': 'whatsappMediaVideoPlaceholder',
  '[audio message]': 'whatsappMediaAudioPlaceholder',
  '[document message]': 'whatsappMediaDocumentPlaceholder',
  '[sticker message]': 'whatsappMediaStickerPlaceholder',
  '[location message]': 'whatsappMediaLocationPlaceholder',
  '[contacts message]': 'whatsappMediaContactsPlaceholder',
  '[interactive message]': 'whatsappMediaInteractivePlaceholder',
  '[button message]': 'whatsappMediaButtonPlaceholder',
  '[reaction]': 'whatsappMediaReactionPlaceholder',
};

/**
 * Localize WhatsApp message body stubs (history placeholders, type-only stubs).
 * Leaves real captions / text unchanged. Reaction stubs like `[reaction 👍]` are localized with the emoji kept.
 */
export function localizeWhatsAppMessageBody(body: string, t: TFn): string {
  const trimmed = (body || '').trim();
  if (!trimmed) return body;

  const key = WHATSAPP_BODY_PLACEHOLDER_KEYS[trimmed.toLowerCase()];
  if (key) return t(key);

  const reactionMatch = /^\[reaction(?:\s+(.+))?\]$/i.exec(trimmed);
  if (reactionMatch) {
    const emoji = (reactionMatch[1] || '').trim();
    const label = t('whatsappMediaReactionPlaceholder');
    return emoji ? `${label} ${emoji}` : label;
  }

  return body;
}

/** Localize stubs using `constants` for a language (notifications / non-React). */
export function localizeWhatsAppMessageBodyForLang(
  body: string,
  language: string | undefined | null
): string {
  const lang = language === 'en' ? 'en' : 'ar';
  const dict = translations[lang];
  return localizeWhatsAppMessageBody(body, (key) => dict[key] ?? key);
}

/** True when body is only a type stub (hide under rendered attachment). */
export function isWhatsAppTypeStubBody(body: string): boolean {
  const trimmed = (body || '').trim();
  if (!trimmed) return false;
  if (WHATSAPP_BODY_PLACEHOLDER_KEYS[trimmed.toLowerCase()]) return true;
  return /^\[reaction(?:\s+.+)?\]$/i.test(trimmed);
}
