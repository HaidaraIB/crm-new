/** Placeholder patterns aligned with API `_content_to_meta_body` in templates_whatsapp.py */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\[\s*Customer Name\s*\]|\[\s*اسم_العميل\s*\]|\[\s*اسم العميل\s*\]/gi,
  /\[\s*Company\s*\]|\[\s*الشركة\s*\]|\[\s*شركة\s*\]/gi,
  /\[\s*Amount\s*\]|\[\s*المبلغ\s*\]/gi,
  /\[\s*Invoice Number\s*\]|\[\s*رقم_الفاتورة\s*\]|\[\s*رقم الفاتورة\s*\]/gi,
];

export type WhatsAppTemplateValidationKey =
  | 'template_content_empty'
  | 'whatsappTemplateVarAtStart'
  | 'whatsappTemplateVarAtEnd'
  | 'whatsappTemplateTooManyVariables';

export function validateWhatsAppTemplateBody(content: string): {
  ok: boolean;
  key?: WhatsAppTemplateValidationKey;
} {
  const trimmed = (content || '').trim();
  if (!trimmed) return { ok: false, key: 'template_content_empty' };

  let placeholderCount = 0;
  for (const pattern of PLACEHOLDER_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(trimmed)) placeholderCount += 1;
  }
  if (placeholderCount === 0) return { ok: true };

  for (const pattern of PLACEHOLDER_PATTERNS) {
    const flags = pattern.flags.includes('i') ? pattern.flags : `${pattern.flags}i`;
    const startRe = new RegExp(`^\\s*(?:${pattern.source})`, flags);
    if (startRe.test(trimmed)) return { ok: false, key: 'whatsappTemplateVarAtStart' };
  }

  const endTrimmed = trimmed.replace(/[\s.!?,;:]+$/u, '');
  for (const pattern of PLACEHOLDER_PATTERNS) {
    const flags = pattern.flags.includes('i') ? pattern.flags : `${pattern.flags}i`;
    const endRe = new RegExp(`(?:${pattern.source})\\s*$`, flags);
    if (endRe.test(endTrimmed)) return { ok: false, key: 'whatsappTemplateVarAtEnd' };
  }

  let staticText = trimmed;
  for (const pattern of PLACEHOLDER_PATTERNS) {
    pattern.lastIndex = 0;
    staticText = staticText.replace(pattern, ' ');
  }
  const wordCount = staticText.split(/\s+/).filter(Boolean).length;
  // Meta guideline: ~3 words of static text per variable
  if (wordCount < placeholderCount * 3) {
    return { ok: false, key: 'whatsappTemplateTooManyVariables' };
  }

  return { ok: true };
}
