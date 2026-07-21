import { getApiErrorCode, getApiErrorDetails } from '../services/api';
import { translations } from '../constants';

type TranslationKey = keyof typeof translations.en;

const API_ERROR_CODE_TO_KEY: Partial<Record<string, TranslationKey>> = {
  no_available_employees_day_off: 'errorNoEmployeesAvailableDayOff',
  auto_assign_disabled: 'errorAutoAssignDisabled',
  no_employees: 'errorNoActiveEmployees',
  employee_weekly_day_off: 'errorEmployeeWeeklyDayOff',
  cannot_delete_clients: 'cannot_delete_clients',
  no_extension: 'errorPbxNoExtension',
  pbx_not_enabled: 'errorPbxNotEnabled',
  pbx_no_phone: 'errorPbxNoPhoneNumber',
  pbx_lead_not_in_company: 'errorPbxLeadNotInCompany',
  pbx_user_not_in_company: 'errorPbxUserNotInCompany',
};

const API_ERROR_MESSAGE_TO_KEY: Partial<Record<string, TranslationKey>> = {
  'You do not have permission to delete customers.': 'cannot_delete_clients',
  'You do not have permission to delete customers': 'cannot_delete_clients',
  'No PBX extension mapped for your user.': 'errorPbxNoExtension',
  'No PBX extension mapped for your user': 'errorPbxNoExtension',
  'PBX integration is not enabled.': 'errorPbxNotEnabled',
  'PBX integration is not enabled': 'errorPbxNotEnabled',
  'No phone number available.': 'errorPbxNoPhoneNumber',
  'No phone number available': 'errorPbxNoPhoneNumber',
  'Lead not in your company.': 'errorPbxLeadNotInCompany',
  'Lead not in your company': 'errorPbxLeadNotInCompany',
  'User must belong to your company.': 'errorPbxUserNotInCompany',
  'User must belong to your company': 'errorPbxUserNotInCompany',
};

function normalizeApiMessage(message: string): string {
  return message.trim().replace(/^\.+/, '').trim();
}

function firstValidationDetail(details: unknown): string | undefined {
  if (!details || typeof details !== 'object') return undefined;
  const record = details as Record<string, unknown>;
  for (const key of ['phone_number', 'client', 'user_id', 'extension', 'non_field_errors']) {
    const value = record[key];
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
    if (typeof value === 'string' && value) {
      return value;
    }
  }
  return undefined;
}

function translateKnownMessage(message: string, t: (key: TranslationKey) => string): string | undefined {
  const normalized = normalizeApiMessage(message);
  if (!normalized) return undefined;

  const mappedKey = API_ERROR_MESSAGE_TO_KEY[normalized];
  if (mappedKey) {
    return t(mappedKey);
  }

  const withPeriod = normalized.endsWith('.') ? normalized : `${normalized}.`;
  const withoutPeriod = normalized.endsWith('.') ? normalized.slice(0, -1) : normalized;
  const altKey = API_ERROR_MESSAGE_TO_KEY[withPeriod] || API_ERROR_MESSAGE_TO_KEY[withoutPeriod];
  if (altKey) {
    return t(altKey);
  }

  return undefined;
}

export function getLocalizedApiErrorMessage(
  error: { message?: string; code?: string; data?: unknown; fields?: Record<string, unknown> } | null | undefined,
  t: (key: TranslationKey) => string,
  fallbackKey: TranslationKey = 'errorDeletingItem'
): string {
  if (!error) {
    return t(fallbackKey);
  }

  const code =
    (typeof error.code === 'string' ? error.code : undefined) ||
    getApiErrorCode(error.data);

  if (code) {
    const mappedKey = API_ERROR_CODE_TO_KEY[code];
    if (mappedKey) {
      return t(mappedKey);
    }
    const direct = t(code as TranslationKey);
    if (direct !== code) {
      return direct;
    }
  }

  const details = error.fields ?? getApiErrorDetails(error.data);
  const validationMessage = firstValidationDetail(details);
  if (validationMessage) {
    const localizedValidation = translateKnownMessage(validationMessage, t);
    if (localizedValidation) {
      return localizedValidation;
    }
  }

  if (error.message) {
    const localizedMessage = translateKnownMessage(error.message, t);
    if (localizedMessage) {
      return localizedMessage;
    }
    return error.message;
  }

  return t(fallbackKey);
}

/** Localize connector/AMI result text stored on completed dial commands. */
export function localizePbxResultMessage(
  message: string | null | undefined,
  t: (key: TranslationKey) => string
): string | undefined {
  if (!message) return undefined;

  const normalized = normalizeApiMessage(message);
  const localized = translateKnownMessage(normalized, t);
  if (localized) return localized;

  const lower = normalized.toLowerCase();
  if (lower.includes('ami login failed')) {
    return t('errorPbxAmiLoginFailed');
  }
  if (lower.includes('connection refused') || lower.includes('timed out') || lower.includes('timeout')) {
    return t('errorPbxConnectionRefused');
  }
  if (lower.includes('extension does not exist')) {
    return t('errorPbxExtensionNotExist');
  }
  if (
    lower.includes('not registered') ||
    lower.includes('no registered') ||
    lower.includes('unavailable') && lower.includes('endpoint')
  ) {
    return t('errorPbxExtensionNotRegistered');
  }
  if (lower.includes('ami originate failed')) {
    return t('errorPbxOriginateFailed');
  }

  return undefined;
}
