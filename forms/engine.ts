import type { FieldSpec, FormSpec, IssueMap, RuleSpec, ValidationIssue } from './types';

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';
const LATIN_DIGITS = '01234567890123456789';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\+[1-9]\d{1,14}$/;
const USERNAME_RE = /^[A-Za-z0-9._-]+$/;
const SLUG_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

const WHATSAPP_PATTERNS = [
  /\[\s*Customer Name\s*\]|\[\s*اسم_العميل\s*\]|\[\s*اسم العميل\s*\]|\{\s*Customer Name\s*\}|\{\s*اسم العميل\s*\}|\{\s*اسم_العميل\s*\}/gi,
  /\[\s*Phone\s*\]|\[\s*رقم_الهاتف\s*\]|\[\s*رقم الهاتف\s*\]|\[\s*الهاتف\s*\]|\{\s*Phone\s*\}|\{\s*رقم الهاتف\s*\}|\{\s*رقم_الهاتف\s*\}/gi,
  /\[\s*Employee Name\s*\]|\[\s*اسم_الموظف\s*\]|\[\s*اسم الموظف\s*\]|\{\s*Employee Name\s*\}|\{\s*اسم الموظف\s*\}|\{\s*اسم_الموظف\s*\}/gi,
  /\[\s*Company\s*\]|\[\s*الشركة\s*\]|\[\s*شركة\s*\]|\[\s*اسم الشركة\s*\]|\{\s*Company\s*\}|\{\s*اسم الشركة\s*\}|\{\s*الشركة\s*\}/gi,
  /\[\s*Current Date\s*\]|\[\s*التاريخ الحالي\s*\]|\{\s*Current Date\s*\}|\{\s*التاريخ الحالي\s*\}/gi,
  /\[\s*Current Time\s*\]|\[\s*الوقت الحالي\s*\]|\{\s*Current Time\s*\}|\{\s*الوقت الحالي\s*\}/gi,
  /\[\s*Status\s*\]|\[\s*الحالة\s*\]|\{\s*Status\s*\}|\{\s*الحالة\s*\}/gi,
  /\[\s*Stage\s*\]|\[\s*المرحلة\s*\]|\{\s*Stage\s*\}|\{\s*المرحلة\s*\}/gi,
  /\[\s*Channel\s*\]|\[\s*قناة التواصل\s*\]|\{\s*Channel\s*\}|\{\s*قناة التواصل\s*\}/gi,
  /\[\s*Visit Type\s*\]|\[\s*نوع الزيارة\s*\]|\{\s*Visit Type\s*\}|\{\s*نوع الزيارة\s*\}/gi,
  /\[\s*Profession\s*\]|\[\s*المهنة\s*\]|\{\s*Profession\s*\}|\{\s*المهنة\s*\}/gi,
  /\[\s*Amount\s*\]|\[\s*المبلغ\s*\]|\{\s*Amount\s*\}|\{\s*المبلغ\s*\}/gi,
  /\[\s*Invoice Number\s*\]|\[\s*رقم_الفاتورة\s*\]|\[\s*رقم الفاتورة\s*\]|\{\s*Invoice Number\s*\}|\{\s*رقم الفاتورة\s*\}/gi,
];

export function latinDigits(value: string): string {
  let out = '';
  for (const char of value) {
    const index = ARABIC_DIGITS.indexOf(char);
    out += index >= 0 ? LATIN_DIGITS[index] : char;
  }
  return out;
}

export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function issue(code: string, params: Record<string, unknown> = {}): ValidationIssue {
  const full = code.startsWith('validation.') ? code : `validation.${code}`;
  return { code: full, params };
}

function whenMatches(when: RuleSpec['when'], context: Record<string, unknown>): boolean {
  if (when == null) return true;
  if (typeof when === 'string') return Boolean(context[when]);
  const flag = when.flag || '';
  if ('equals' in when) return context[flag] === when.equals;
  if ('not' in when) return context[flag] !== when.not;
  return Boolean(context[flag]);
}

function ruleActive(rule: RuleSpec, context: Record<string, unknown>, enforceClientOnly: boolean): boolean {
  if (rule.client_only && !enforceClientOnly) return false;
  if (rule.type === 'remote') return false;
  return whenMatches(rule.when, context);
}

function lookup(data: Record<string, unknown>, key: string, field: FieldSpec): { value: unknown; present: boolean } {
  if (Object.prototype.hasOwnProperty.call(data, key)) return { value: data[key], present: true };
  if (field.ui_key && Object.prototype.hasOwnProperty.call(data, field.ui_key)) {
    return { value: data[field.ui_key], present: true };
  }
  return { value: undefined, present: false };
}

function normalize(field: FieldSpec, value: unknown): unknown {
  if (typeof value !== 'string') return value;
  let text = latinDigits(value);
  const rules = field.rules || [];
  if (field.type === 'string' && !rules.some((rule) => rule.type === 'password_policy')) text = text.trim();
  if (rules.some((rule) => rule.type === 'phone_e164')) text = text.trim().replace(/[\s()-]/g, '');
  if (rules.some((rule) => rule.type === 'email')) text = text.trim().toLowerCase();
  return text;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'boolean') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function sibling(data: Record<string, unknown>, name: string, fields: Record<string, FieldSpec>): unknown {
  if (Object.prototype.hasOwnProperty.call(data, name)) return data[name];
  for (const [key, field] of Object.entries(fields)) {
    if (field.ui_key === name && Object.prototype.hasOwnProperty.call(data, key)) return data[key];
    if (key === name && field.ui_key && Object.prototype.hasOwnProperty.call(data, field.ui_key)) return data[field.ui_key];
  }
  return undefined;
}

function whatsappBody(value: unknown, params: Record<string, unknown>): ValidationIssue | null {
  const text = value == null ? '' : String(value).trim();
  if (!text) return issue('validation.whatsapp_template_body', { reason: 'empty' });
  const sources = (params.patterns as string[] | undefined) || [];
  const patterns = sources.length
    ? sources.map((source) => new RegExp(source, 'gi'))
    : WHATSAPP_PATTERNS.map((pattern) => new RegExp(pattern.source, 'gi'));
  const present = patterns.filter((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
  if (!present.length) return null;
  for (const pattern of present) {
    const start = new RegExp(`^\\s*(?:${pattern.source})`, 'i');
    if (start.test(text)) return issue('validation.whatsapp_template_body', { reason: 'var_at_start' });
  }
  const endTrimmed = text.replace(/[\s.!?,;:]+$/u, '');
  for (const pattern of present) {
    const end = new RegExp(`(?:${pattern.source})\\s*$`, 'i');
    if (end.test(endTrimmed)) return issue('validation.whatsapp_template_body', { reason: 'var_at_end' });
  }
  let staticText = text;
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    staticText = staticText.replace(pattern, ' ');
  }
  const wordCount = staticText.split(/\s+/).filter(Boolean).length;
  const minWords = Number(params.min_static_words_per_var || 3);
  if (wordCount < present.length * minWords) {
    return issue('validation.whatsapp_template_body', { reason: 'too_many_variables', min_words: minWords });
  }
  return null;
}

function applyRule(
  rule: RuleSpec,
  value: unknown,
  data: Record<string, unknown>,
  fields: Record<string, FieldSpec>,
): ValidationIssue | null {
  const params = rule.params || {};
  if (rule.type.startsWith('custom:')) {
    const name = rule.type.slice('custom:'.length);
    if (name === 'whatsapp_template_body') return whatsappBody(value, params);
    return null;
  }
  switch (rule.type) {
    case 'required':
      return isEmpty(value) ? issue('validation.required') : null;
    case 'min_length': {
      if (isEmpty(value) || typeof value !== 'string') return null;
      const min = Number(params.min || 0);
      return value.length < min ? issue('validation.min_length', { min }) : null;
    }
    case 'max_length': {
      if (isEmpty(value) || typeof value !== 'string') return null;
      const max = Number(params.max || 0);
      return value.length > max ? issue('validation.max_length', { max }) : null;
    }
    case 'pattern': {
      if (isEmpty(value)) return null;
      const regex = String(params.regex || '');
      return new RegExp(`^(?:${regex})$`).test(String(value)) ? null : issue('validation.pattern', { regex });
    }
    case 'email':
      return isEmpty(value) || EMAIL_RE.test(String(value).trim()) ? null : issue('validation.email');
    case 'phone_e164': {
      if (isEmpty(value)) return null;
      const text = String(value).trim().replace(/[\s()-]/g, '');
      return PHONE_RE.test(text) && text.length >= 8 ? null : issue('validation.phone_e164');
    }
    case 'username': {
      if (isEmpty(value)) return null;
      const text = String(value).trim();
      const min = Number(params.min || 3);
      return text.length >= min && USERNAME_RE.test(text) ? null : issue('validation.username', { min });
    }
    case 'slug':
      return isEmpty(value) || SLUG_RE.test(String(value).trim()) ? null : issue('validation.slug');
    case 'url': {
      if (isEmpty(value)) return null;
      try {
        const parsed = new URL(String(value).trim());
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? null : issue('validation.url');
      } catch {
        return issue('validation.url');
      }
    }
    case 'number_range': {
      if (isEmpty(value)) return null;
      const number = asNumber(value);
      if (number == null) return issue('validation.number_range', params);
      if (params.min != null && number < Number(params.min)) return issue('validation.number_range', { min: params.min });
      if (params.max != null && number > Number(params.max)) return issue('validation.number_range', { max: params.max, min: params.min });
      return null;
    }
    case 'integer': {
      if (isEmpty(value) || typeof value === 'boolean') return isEmpty(value) ? null : issue('validation.integer');
      if (typeof value === 'number') return Number.isInteger(value) ? null : issue('validation.integer');
      return /^-?\d+$/.test(String(value).trim()) ? null : issue('validation.integer');
    }
    case 'decimal_places': {
      if (isEmpty(value)) return null;
      const text = String(value);
      const fraction = text.includes('.') ? text.split('.')[1] : '';
      const places = Number(params.max || 0);
      return fraction.length > places ? issue('validation.decimal_places', { places, max: places }) : null;
    }
    case 'one_of': {
      if (isEmpty(value)) return null;
      const allowed = (params.values as unknown[]) || [];
      if (allowed.includes(value)) return null;
      return allowed.map(String).includes(String(value)) ? null : issue('validation.one_of', { values: allowed });
    }
    case 'matches_field': {
      if (isEmpty(value)) return null;
      const otherName = String(params.field || '');
      return sibling(data, otherName, fields) === value ? null : issue('validation.matches_field', { field: otherName });
    }
    case 'required_if': {
      const otherName = String(params.field || '');
      const other = sibling(data, otherName, fields);
      let needed = false;
      if ('equals' in params) needed = other === params.equals || String(other) === String(params.equals);
      else if (params.not_empty) needed = !isEmpty(other);
      else if (Array.isArray(params.in)) needed = (params.in as unknown[]).includes(other);
      return needed && isEmpty(value) ? issue('validation.required_if', { field: otherName }) : null;
    }
    case 'date_range': {
      if (isEmpty(value)) return null;
      const current = Date.parse(String(value));
      if (Number.isNaN(current)) return issue('validation.date');
      if (params.gte_field) {
        const other = Date.parse(String(sibling(data, String(params.gte_field), fields) || ''));
        if (!Number.isNaN(other) && current < other) return issue('validation.date_range', { gte_field: params.gte_field });
      }
      if (params.lte_field) {
        const other = Date.parse(String(sibling(data, String(params.lte_field), fields) || ''));
        if (!Number.isNaN(other) && current > other) return issue('validation.date_range', { lte_field: params.lte_field });
      }
      return null;
    }
    case 'file': {
      if (isEmpty(value) || typeof value !== 'object' || value == null) return null;
      const file = value as { size?: number; type?: string; mime?: string };
      const maxBytes = params.max_bytes;
      if (maxBytes != null && file.size != null && file.size > Number(maxBytes)) {
        return issue('validation.file', { reason: 'too_large', max_bytes: maxBytes });
      }
      const allowed = (params.mime as string[]) || [];
      const mime = file.type || file.mime;
      if (allowed.length && mime && !allowed.includes(mime)) return issue('validation.file', { reason: 'mime', mime: allowed });
      return null;
    }
    case 'password_policy': {
      if (isEmpty(value)) return null;
      const text = String(value);
      const min = Number(params.min_length || 8);
      if (text.length < min) return issue('validation.password_policy', { reason: 'min_length', min });
      if (params.reject_numeric !== false && /^\d+$/.test(text)) return issue('validation.password_policy', { reason: 'numeric', min });
      const sample = new Set(((params.common_sample as string[]) || []).map((item) => item.toLowerCase()));
      if (params.reject_common && sample.has(text.toLowerCase())) return issue('validation.password_policy', { reason: 'common', min });
      return null;
    }
    case 'array': {
      if (value == null) return null;
      if (!Array.isArray(value)) return issue('validation.array');
      if (params.min != null && value.length < Number(params.min)) return issue('validation.array', { min: Number(params.min) });
      if (params.max != null && value.length > Number(params.max)) return issue('validation.array', { max: Number(params.max) });
      return null;
    }
    default:
      return null;
  }
}

function add(issues: IssueMap, path: string, found: ValidationIssue | null) {
  if (!found) return;
  const key = path || 'non_field';
  issues[key] = issues[key] || [];
  issues[key].push(found);
}

function validateScalar(
  field: FieldSpec,
  value: unknown,
  path: string,
  data: Record<string, unknown>,
  issues: IssueMap,
  context: Record<string, unknown>,
  enforceClientOnly: boolean,
) {
  const normalized = normalize(field, value);
  for (const spec of field.rules || []) {
    if (!ruleActive(spec, context, enforceClientOnly)) continue;
    const found = applyRule(spec, normalized, data, {});
    if (found) {
      add(issues, path, found);
      if (spec.type === 'required' || spec.type === 'required_if') break;
    }
  }
}

function walk(
  fields: Record<string, FieldSpec>,
  data: Record<string, unknown>,
  prefix: string,
  issues: IssueMap,
  context: Record<string, unknown>,
  partial: boolean,
  enforceClientOnly: boolean,
) {
  for (const [key, field] of Object.entries(fields)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const found = lookup(data, key, field);
    let value = found.present ? normalize(field, found.value) : found.value;
    let requiredFailed = false;
    for (const spec of field.rules || []) {
      if (!ruleActive(spec, context, enforceClientOnly)) continue;
      if (spec.type === 'required' && partial && !found.present) continue;
      if (!found.present && spec.type !== 'required' && spec.type !== 'required_if') continue;
      const failure = applyRule(spec, value, data, fields);
      if (failure) {
        add(issues, path, failure);
        if (spec.type === 'required' || spec.type === 'required_if') {
          requiredFailed = true;
          break;
        }
      }
    }
    if (requiredFailed || (!found.present && partial) || !found.present) continue;
    if (field.type === 'object' && field.fields && value && typeof value === 'object' && !Array.isArray(value)) {
      walk(field.fields, value as Record<string, unknown>, path, issues, context, partial, enforceClientOnly);
    } else if (field.type === 'array' && field.item && Array.isArray(value)) {
      value.forEach((item, index) => {
        const itemPath = `${path}.${index}`;
        if (field.item?.fields && item && typeof item === 'object' && !Array.isArray(item)) {
          walk(field.item.fields, item as Record<string, unknown>, itemPath, issues, context, false, enforceClientOnly);
        } else if (field.item) {
          validateScalar(field.item, item, itemPath, data, issues, context, enforceClientOnly);
        }
      });
    }
  }
}

export function evaluateForm(
  form: FormSpec,
  data: Record<string, unknown> | null | undefined,
  options?: { context?: Record<string, unknown>; partial?: boolean; enforceClientOnly?: boolean },
): IssueMap {
  const issues: IssueMap = {};
  walk(
    form.fields,
    (data || {}) as Record<string, unknown>,
    '',
    issues,
    options?.context || {},
    Boolean(options?.partial),
    options?.enforceClientOnly !== false,
  );
  return issues;
}
