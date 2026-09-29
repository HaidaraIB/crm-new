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
  '[call permission request]': 'whatsappCallPermissionRequestLabel',
  '[call permission accepted]': 'whatsappCallPermissionAcceptedLabel',
  '[call permission rejected]': 'whatsappCallPermissionRejectedLabel',
  '[call permission reply]': 'whatsappCallPermissionReplyLabel',
  '[button message]': 'whatsappMediaButtonPlaceholder',
  '[button reply]': 'whatsappMediaButtonPlaceholder',
  '[list reply]': 'whatsappMediaInteractivePlaceholder',
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

/**
 * English snippets `_whatsapp_preview_label` puts on conversation rows
 * (`Photo`, `Video: caption`). Matched only for the chat list — a real message
 * body that happens to be the word "Video" must stay as written in the thread.
 */
const WHATSAPP_LIST_MEDIA_LABELS: Record<string, keyof typeof translations.en> = {
  photo: 'teamChatMediaPhoto',
  video: 'whatsappMediaVideoPlaceholder',
  'voice message': 'teamChatMediaAudio',
  document: 'whatsappMediaDocumentPlaceholder',
  file: 'whatsappMediaDocumentPlaceholder',
  image: 'whatsappMediaImagePlaceholder',
  audio: 'whatsappMediaAudioPlaceholder',
  sticker: 'whatsappMediaStickerPlaceholder',
  location: 'whatsappMediaLocationPlaceholder',
  'shared post': 'sharedPost',
  'story mention': 'storyMention',
  reel: 'sharedReel',
};

/** Localize a conversation-list preview, including media type labels. */
export function localizeWhatsAppListPreview(preview: string, t: TFn): string {
  const trimmed = (preview || '').trim();
  if (!trimmed) return preview;

  const asStub = localizeWhatsAppMessageBody(trimmed, t);
  if (asStub !== trimmed) return asStub;

  const exact = WHATSAPP_LIST_MEDIA_LABELS[trimmed.toLowerCase()];
  if (exact) return t(exact);

  const splitAt = trimmed.indexOf(': ');
  if (splitAt > 0) {
    const headKey = WHATSAPP_LIST_MEDIA_LABELS[trimmed.slice(0, splitAt).toLowerCase()];
    if (headKey) {
      const rest = trimmed.slice(splitAt + 2).trim();
      if (!rest || isWhatsAppTypeStubBody(rest)) return t(headKey);
      return `${t(headKey)}: ${localizeWhatsAppMessageBody(rest, t)}`;
    }
  }

  return trimmed;
}

/** True when body is only a type stub (hide under rendered attachment). */
export function isWhatsAppTypeStubBody(body: string): boolean {
  const trimmed = (body || '').trim();
  if (!trimmed) return false;
  if (WHATSAPP_BODY_PLACEHOLDER_KEYS[trimmed.toLowerCase()]) return true;
  return /^\[reaction(?:\s+.+)?\]$/i.test(trimmed);
}
