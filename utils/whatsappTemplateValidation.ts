/** Placeholder patterns aligned with API Meta conversion in message_placeholders.py / templates_whatsapp.py */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  // Customer name
  /\[\s*Customer Name\s*\]|\[\s*اسم_العميل\s*\]|\[\s*اسم العميل\s*\]|\{\s*Customer Name\s*\}|\{\s*اسم العميل\s*\}|\{\s*اسم_العميل\s*\}/gi,
  // Phone
  /\[\s*Phone\s*\]|\[\s*رقم_الهاتف\s*\]|\[\s*رقم الهاتف\s*\]|\[\s*الهاتف\s*\]|\{\s*Phone\s*\}|\{\s*رقم الهاتف\s*\}|\{\s*رقم_الهاتف\s*\}/gi,
  // Employee
  /\[\s*Employee Name\s*\]|\[\s*اسم_الموظف\s*\]|\[\s*اسم الموظف\s*\]|\{\s*Employee Name\s*\}|\{\s*اسم الموظف\s*\}|\{\s*اسم_الموظف\s*\}/gi,
  // Company
  /\[\s*Company\s*\]|\[\s*الشركة\s*\]|\[\s*شركة\s*\]|\[\s*اسم الشركة\s*\]|\{\s*Company\s*\}|\{\s*اسم الشركة\s*\}|\{\s*الشركة\s*\}/gi,
  // Date / time
  /\[\s*Current Date\s*\]|\[\s*التاريخ الحالي\s*\]|\{\s*Current Date\s*\}|\{\s*التاريخ الحالي\s*\}/gi,
  /\[\s*Current Time\s*\]|\[\s*الوقت الحالي\s*\]|\{\s*Current Time\s*\}|\{\s*الوقت الحالي\s*\}/gi,
  // Status / stage / channel / visit / profession
  /\[\s*Status\s*\]|\[\s*الحالة\s*\]|\{\s*Status\s*\}|\{\s*الحالة\s*\}/gi,
  /\[\s*Stage\s*\]|\[\s*المرحلة\s*\]|\{\s*Stage\s*\}|\{\s*المرحلة\s*\}/gi,
  /\[\s*Channel\s*\]|\[\s*قناة التواصل\s*\]|\{\s*Channel\s*\}|\{\s*قناة التواصل\s*\}/gi,
  /\[\s*Visit Type\s*\]|\[\s*نوع الزيارة\s*\]|\{\s*Visit Type\s*\}|\{\s*نوع الزيارة\s*\}/gi,
  /\[\s*Profession\s*\]|\[\s*المهنة\s*\]|\{\s*Profession\s*\}|\{\s*المهنة\s*\}/gi,
  // Legacy
  /\[\s*Amount\s*\]|\[\s*المبلغ\s*\]|\{\s*Amount\s*\}|\{\s*المبلغ\s*\}/gi,
  /\[\s*Invoice Number\s*\]|\[\s*رقم_الفاتورة\s*\]|\[\s*رقم الفاتورة\s*\]|\{\s*Invoice Number\s*\}|\{\s*رقم الفاتورة\s*\}/gi,
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
