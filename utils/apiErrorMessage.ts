import { getApiErrorCode } from '../services/api';
import { translations } from '../constants';

type TranslationKey = keyof typeof translations.en;

const API_ERROR_CODE_TO_KEY: Partial<Record<string, TranslationKey>> = {
  no_available_employees_day_off: 'errorNoEmployeesAvailableDayOff',
  auto_assign_disabled: 'errorAutoAssignDisabled',
  no_employees: 'errorNoActiveEmployees',
  employee_weekly_day_off: 'errorEmployeeWeeklyDayOff',
};

export function getLocalizedApiErrorMessage(
  error: { message?: string; code?: string; data?: unknown } | null | undefined,
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

  if (error.message) {
    return error.message;
  }

  return t(fallbackKey);
}
