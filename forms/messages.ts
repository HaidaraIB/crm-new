import type { FormSpec, ValidationIssue } from './types';

export type TranslateFn = (key: string) => string | undefined;

const REASON_KEYS: Record<string, string> = {
  'validation.password_policy': 'validation.password_policy',
  'validation.whatsapp_template_body': 'validation.whatsapp_template_body',
};

export function messageKey(issue: ValidationIssue): string {
  const reason = issue.params?.reason;
  if (typeof reason === 'string' && REASON_KEYS[issue.code]) {
    return `${issue.code}.${reason}`;
  }
  return issue.code;
}

export function interpolate(template: string, params: Record<string, unknown>): string | null {
  let missing = false;
  const out = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    if (value == null || value === '') {
      missing = true;
      return `{${key}}`;
    }
    return String(value);
  });
  return missing ? null : out;
}

export function formatValidationMessage(
  t: TranslateFn,
  issue: ValidationIssue,
  label?: string,
): string {
  if (
    issue.code === 'validation.invalid' &&
    issue.message &&
    !issue.message.startsWith('validation.')
  ) {
    return issue.message;
  }
  const params = { ...(issue.params || {}), label: label || '' };
  const key = messageKey(issue);
  const translated = t(key) || t(issue.code);
  const usable = translated && translated !== key && translated !== issue.code ? translated : undefined;
  const fromKey = usable ? interpolate(usable, params) : null;
  if (fromKey) return fromKey;
  if (issue.message && !issue.message.startsWith('validation.')) return issue.message;
  return t('validation.invalid') || 'Invalid value.';
}

export function labelForPath(form: FormSpec | undefined, path: string): string {
  if (!form) return path;
  const parts = path.split('.');
  let fields = form.fields;
  let label = path;
  for (const part of parts) {
    if (!fields) break;
    if (/^\d+$/.test(part)) continue;
    const field = fields[part];
    if (!field) break;
    label = field.label_key;
    fields = field.fields || field.item?.fields;
  }
  return label;
}
