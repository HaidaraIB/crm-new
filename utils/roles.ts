export type AppRole = 'Owner' | 'Supervisor' | 'Employee' | 'DataEntry';

const normalizeRoleToken = (role?: string): string =>
  (role || '').toString().trim().toLowerCase().replace(/\s+/g, '_');

/**
 * Only these roles report presence (heartbeat). Company owners/admins and
 * platform super-admins must not call presence APIs — they are not shown on the employees list.
 */
export const roleReportsPresence = (role?: string): boolean => {
  const token = normalizeRoleToken(role);
  return token === 'employee' || token === 'data_entry' || token === 'supervisor';
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
  return 'Employee';
};

export const getRoleTranslation = (role: string, t: (key: string) => string): string => {
  const normalizedRole = normalizeRole(role);
  const translationKeyByRole: Record<AppRole, string> = {
    Owner: 'owner',
    Supervisor: 'supervisor',
    Employee: 'employee',
    DataEntry: 'dataEntry',
  };
  const translationKey = translationKeyByRole[normalizedRole];
  return translationKey ? t(translationKey) : t('employee');
};

export type ApiRole = 'admin' | 'supervisor' | 'employee' | 'data_entry';

export const normalizeRoleForApi = (role?: string): ApiRole => {
  const appRole = normalizeRole(role);
  if (appRole === 'Owner') return 'admin';
  if (appRole === 'Supervisor') return 'supervisor';
  if (appRole === 'DataEntry') return 'data_entry';
  return 'employee';
};

/** Shown in manual lead/deal assignee pickers; data-entry staff are assigned via automation only. */
export const showInLeadAssigneePicker = (role?: string): boolean => {
  return normalizeRole(role) !== 'DataEntry';
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
