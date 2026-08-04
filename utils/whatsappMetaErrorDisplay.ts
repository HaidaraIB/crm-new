/** Map Meta Graph / delivery_error strings to CRM i18n keys when possible. */

const CODE_TO_KEY: Record<string, string> = {
  '131037': 'whatsapp_display_name_not_approved',
  '131026': 'whatsapp_recipient_not_deliverable',
  '131047': 'whatsappOutsideSessionUseTemplate',
  '132000': 'whatsapp_template_parameter_count',
  '132001': 'whatsapp_template_not_found_or_language',
};

/**
 * If `raw` looks like "131047: Re-engagement…" or contains a known Meta code,
 * return the matching translation key; otherwise null.
 */
export function metaDeliveryErrorTranslationKey(raw: string | null | undefined): string | null {
  const text = (raw || '').trim();
  if (!text) return null;
  const leading = text.match(/^(\d{5,7})\b/);
  if (leading && CODE_TO_KEY[leading[1]]) return CODE_TO_KEY[leading[1]];
  for (const [code, key] of Object.entries(CODE_TO_KEY)) {
    if (text.includes(code)) return key;
  }
  return null;
}

export function localizeMetaDeliveryError(
  raw: string | null | undefined,
  t: (key: any) => string,
): string {
  const text = (raw || '').trim();
  if (!text) return '';
  const key = metaDeliveryErrorTranslationKey(text);
  if (key) {
    const translated = t(key as any);
    if (translated && translated !== key) return translated;
  }
  return text;
}
