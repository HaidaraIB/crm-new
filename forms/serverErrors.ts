import type { ValidationIssue } from './types';

function asIssues(value: unknown): ValidationIssue[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): ValidationIssue | null => {
      if (typeof item === 'string') return { code: 'validation.invalid', params: {}, message: item };
      if (item && typeof item === 'object' && 'code' in item) {
        const row = item as ValidationIssue;
        return { code: String(row.code), params: row.params || {}, message: row.message };
      }
      return null;
    })
    .filter((item): item is ValidationIssue => item != null);
}

export function readServerIssues(error: unknown): { fields: Record<string, ValidationIssue[]>; nonField: ValidationIssue[] } {
  const err = (error || {}) as {
    fieldIssues?: Record<string, ValidationIssue[]>;
    fields?: Record<string, unknown>;
    nonField?: ValidationIssue[];
    non_field?: ValidationIssue[];
    response?: { data?: { error?: { fields?: Record<string, ValidationIssue[]>; non_field?: ValidationIssue[]; details?: Record<string, unknown> } } };
  };
  const envelope = err.response?.data?.error;
  const coded = err.fieldIssues || envelope?.fields;
  if (coded && typeof coded === 'object') {
    const fields: Record<string, ValidationIssue[]> = {};
    for (const [key, value] of Object.entries(coded)) {
      const issues = asIssues(value);
      if (issues.length) fields[key] = issues;
    }
    return { fields, nonField: asIssues(err.nonField || err.non_field || envelope?.non_field) };
  }
  const legacy = err.fields || envelope?.details;
  const fields: Record<string, ValidationIssue[]> = {};
  if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
    for (const [key, value] of Object.entries(legacy as Record<string, unknown>)) {
      if (key === 'non_field_errors') continue;
      const message = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
      if (message) fields[key] = [{ code: 'validation.invalid', params: {}, message }];
    }
  }
  return { fields, nonField: [] };
}
