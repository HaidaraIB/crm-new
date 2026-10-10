import snapshot from './catalog/catalog.snapshot.json';
import { evaluateForm } from './engine';
import { formatValidationMessage, labelForPath, type TranslateFn } from './messages';
import { readServerIssues } from './serverErrors';
import type { CatalogDocument } from './types';

const CATALOG = snapshot as CatalogDocument;

/** Inline field errors for a catalog form. Keys follow UI aliases when the catalog defines them. */
export function catalogFieldErrors(
  formId: string,
  values: Record<string, unknown>,
  t: TranslateFn,
  context?: Record<string, unknown>,
): Record<string, string> {
  const spec = CATALOG.forms[formId];
  if (!spec) return { root: `Unknown form ${formId}` };
  const issues = evaluateForm(spec, values, { context, enforceClientOnly: true });
  const aliases = spec.aliases || {};
  const errors: Record<string, string> = {};
  for (const [path, items] of Object.entries(issues)) {
    const uiKey = Object.entries(aliases).find(([, api]) => api === path)?.[0] || path;
    const label = t(labelForPath(spec, uiKey));
    errors[uiKey] = formatValidationMessage(t, items[0], label);
  }
  return errors;
}

/** Server `error.fields` codes mapped onto the same UI keys as [catalogFieldErrors]. */
export function serverFieldErrors(
  error: unknown,
  formId: string,
  t: TranslateFn,
): Record<string, string> {
  const spec = CATALOG.forms[formId];
  const { fields, nonField } = readServerIssues(error);
  const aliases = spec?.aliases || {};
  const errors: Record<string, string> = {};
  for (const [apiKey, issues] of Object.entries(fields)) {
    const uiKey = Object.entries(aliases).find(([, target]) => target === apiKey)?.[0] || apiKey;
    const label = t(labelForPath(spec, uiKey));
    errors[uiKey] = formatValidationMessage(t, issues[0], label);
  }
  if (nonField.length) errors._general = formatValidationMessage(t, nonField[0]);
  return errors;
}

export function catalogSpec(formId: string) {
  return CATALOG.forms[formId];
}
