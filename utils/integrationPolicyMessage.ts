/**
 * Resolve integration policy banner message for display.
 * Maps known English API defaults to localized CRM copy; keeps custom admin messages as-is.
 */

const KNOWN_POLICY_DEFAULT_MESSAGES = new Set([
  'this integration is currently disabled by the administrator.',
  'this integration is currently disabled by your administrator.',
  'this integration is currently disabled for your company.',
  'this integration is not included in your current plan.',
]);

export function resolveIntegrationPolicyMessage(
  apiMessage: string | null | undefined,
  scope: string | null | undefined,
  t: (key: string) => string,
): string {
  const trimmed = (apiMessage || '').trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed || KNOWN_POLICY_DEFAULT_MESSAGES.has(normalized)) {
    if (scope === 'plan') {
      return t('integrationDisabledPlanMessage') || t('integrationDisabledDefaultMessage');
    }
    if (scope === 'company') {
      return t('integrationDisabledCompanyMessage') || t('integrationDisabledDefaultMessage');
    }
    return t('integrationDisabledDefaultMessage');
  }

  return trimmed;
}
