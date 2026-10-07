import { getApiErrorCode, getApiErrorDetails } from '../services/api';
import { translations } from '../constants';

type TranslationKey = keyof typeof translations.en;

const API_ERROR_CODE_TO_KEY: Partial<Record<string, TranslationKey>> = {
  no_available_employees_day_off: 'errorNoEmployeesAvailableDayOff',
  auto_assign_disabled: 'errorAutoAssignDisabled',
  no_employees: 'errorNoActiveEmployees',
  employee_weekly_day_off: 'errorEmployeeWeeklyDayOff',
  duplicate_lead_phone: 'duplicate_lead_phone',
  cannot_delete_clients: 'cannot_delete_clients',
  whatsapp_voice_note_requires_ogg: 'whatsapp_voice_note_requires_ogg',
};

const API_ERROR_MESSAGE_TO_KEY: Partial<Record<string, TranslationKey>> = {
  'A lead with this phone number already exists in your company.': 'duplicate_lead_phone',
  'A lead with this phone number already exists in your company': 'duplicate_lead_phone',
  'You do not have permission to delete customers.': 'cannot_delete_clients',
  'You do not have permission to delete customers': 'cannot_delete_clients',
  'Voice notes require OGG/Opus. Install ffmpeg on the server or record in a browser that supports audio/ogg.':
    'whatsapp_voice_note_requires_ogg',
  'Voice notes require OGG/Opus. Install ffmpeg on the server or record in a browser that supports audio/ogg':
    'whatsapp_voice_note_requires_ogg',
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
