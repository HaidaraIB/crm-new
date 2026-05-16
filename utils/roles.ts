import { isMedicalSpecialization } from './medicalTranslationOverrides';

export type AppRole = 'Owner' | 'Supervisor' | 'Employee' | 'DataEntry' | 'Reception' | 'Doctor';

const normalizeRoleToken = (role?: string): string =>
  (role || '').toString().trim().toLowerCase().replace(/\s+/g, '_');

/**
 * Roles that send periodic presence heartbeats so `last_seen_at` / online status stay accurate.
 * Owners/admins were historically excluded only because they were hidden from the employees list UI;
 * team chat and other surfaces still need correct presence for every role.
 */
export const roleReportsPresence = (role?: string): boolean => {
  const token = normalizeRoleToken(role);
  return (
    token === 'employee' ||
    token === 'data_entry' ||
    token === 'doctor' ||
    token === 'reception' ||
    token === 'supervisor' ||
    token === 'admin' ||
    token === 'owner' ||
    token === 'super_admin'
  );
};

export const normalizeRole = (role?: string): AppRole => {
  const token = normalizeRoleToken(role);

  if (token === 'super_admin' || token === 'admin' || token === 'owner') {
    return 'Owner';
  }
  if (token === 'supervisor') {
    return 'Supervisor';
  }
  if (token === 'data_entry' || token === 'dataentry') {
    return 'DataEntry';
  }
  if (token === 'reception') {
    return 'Reception';
  }
  if (token === 'doctor') {
    return 'Doctor';
  }
  return 'Employee';
};

/**
 * @param companySpecialization When not `medical`, clinic API roles `doctor` / `reception` are labeled like `employee` / `data_entry` so non-medical tenants never see clinic wording.
 */
export const getRoleTranslation = (
  role: string,
  t: (key: string) => string,
  companySpecialization?: string | null,
): string => {
  let normalizedRole = normalizeRole(role);
  if (!isMedicalSpecialization(companySpecialization)) {
    if (normalizedRole === 'Doctor') normalizedRole = 'Employee';
    if (normalizedRole === 'Reception') normalizedRole = 'DataEntry';
  }
  const translationKeyByRole: Record<AppRole, string> = {
    Owner: 'owner',
    Supervisor: 'supervisor',
    Employee: 'employee',
    DataEntry: 'dataEntry',
    Reception: 'reception',
    Doctor: 'doctor',
  };
  const translationKey = translationKeyByRole[normalizedRole];
  return translationKey ? t(translationKey) : t('employee');
};

export type ApiRole = 'admin' | 'supervisor' | 'employee' | 'data_entry' | 'reception' | 'doctor';

export const normalizeRoleForApi = (role?: string): ApiRole => {
  const appRole = normalizeRole(role);
  if (appRole === 'Owner') return 'admin';
  if (appRole === 'Supervisor') return 'supervisor';
  if (appRole === 'DataEntry') return 'data_entry';
  if (appRole === 'Reception') return 'reception';
  if (appRole === 'Doctor') return 'doctor';
  return 'employee';
};

/** True only for `data_entry` (restricted UI / no assignee) — not reception or doctor. */
export const isDataEntryOnlyRole = (role?: string): boolean => normalizeRole(role) === 'DataEntry';

/** Same lead-assignment scope as API “clinical staff” (employee or doctor). */
export const isAssignedClinicalAppRole = (role?: string): boolean => {
  const r = normalizeRole(role);
  return r === 'Employee' || r === 'Doctor';
};

/** Shown in manual lead/deal assignee pickers; data-entry and reception are not assignees. */
export const showInLeadAssigneePicker = (role?: string): boolean => {
  const ar = normalizeRole(role);
  return ar !== 'DataEntry' && ar !== 'Reception';
};

/**
 * Users shown in operational “employee” UI: assignee filters, team/report breakdowns, activity user filter.
 * Same rule as lead assignee pickers (excludes data_entry). Use full `/users` where you only resolve names.
 */
export function usersForOperationalEmployeeLists<T extends { id: number; role?: string }>(
  apiUsers: T[],
  currentUser?: T | null
): T[] {
  return buildLeadAssigneePickerOptions(apiUsers, currentUser);
}

/**
 * Company users suitable for manual assign dropdowns (excludes data_entry).
 */
export function buildLeadAssigneePickerOptions<T extends { id: number; role?: string }>(
  apiUsers: T[],
  currentUser: T | null | undefined
): T[] {
  const map = new Map<number, T>();
  for (const u of apiUsers) {
    if (showInLeadAssigneePicker(u.role)) map.set(u.id, u);
  }
  if (
    currentUser &&
    showInLeadAssigneePicker(currentUser.role) &&
    !map.has(currentUser.id)
  ) {
    map.set(currentUser.id, currentUser);
  }
  return Array.from(map.values());
}
