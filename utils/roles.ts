import { isMedicalSpecialization } from './medicalTranslationOverrides';

export type AppRole =
  | 'Owner'
  | 'Supervisor'
  | 'Employee'
  | 'DataEntry'
  | 'Reception'
  | 'Doctor'
  | 'CallCenter';

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
    token === 'super_admin' ||
    token === 'call_center'
  );
};

/**
 * Roles whose actual CRM usage time is measured ("working hours").
 *
 * Every company role, owners/admins included. Only `super_admin` is excluded: it is
 * the platform operator, not company staff, with no company to attribute hours to.
 * Mirrors WORK_TRACKED_ROLES in accounts/work_tracking.py — this check only avoids
 * pointless requests; the API is the enforcement point.
 */
export const roleTracksWorkHours = (role?: string): boolean => {
  const token = normalizeRoleToken(role);
  if (!token || token === 'super_admin') return false;
  return true;
};

const KNOWN_ROLE_TOKENS: Record<string, AppRole> = {
  super_admin: 'Owner',
  admin: 'Owner',
  owner: 'Owner',
  supervisor: 'Supervisor',
  data_entry: 'DataEntry',
  dataentry: 'DataEntry',
  reception: 'Reception',
  doctor: 'Doctor',
  employee: 'Employee',
  call_center: 'CallCenter',
  callcenter: 'CallCenter',
};

/**
 * Strict variant: returns `null` for a role string this app doesn't recognize, instead of
 * silently falling back to `Employee`. Use this anywhere access decisions are made
 * (e.g. `canAccessPage`) so an unrecognized/new backend role never inherits Employee-grade UI.
 */
export const normalizeRoleStrict = (role?: string): AppRole | null => {
  const token = normalizeRoleToken(role);
  return KNOWN_ROLE_TOKENS[token] ?? null;
};

export const normalizeRole = (role?: string): AppRole => {
  const token = normalizeRoleToken(role);
  const known = KNOWN_ROLE_TOKENS[token];
  if (known) return known;
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`normalizeRole: unrecognized role "${role}", falling back to Employee`);
  }
  return 'Employee';
};

/**
 * @param companySpecialization When not `medical`, clinic API roles `doctor` / `reception` are labeled like `employee` / `data_entry` so non-medical tenants never see clinic wording.
 */
export const getRoleTranslation = (
  role: string,
  t: (key: any) => string,
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
    // Role label only ("Receptionist" / "الريسبشن"). Deliberately different from the
    // medical `reception` role ("Reception" / "موظف استقبال") and from the `callCenter`
    // page/nav label, so the two reception-like roles stay distinguishable.
    CallCenter: 'callCenterRole',
  };
  const translationKey = translationKeyByRole[normalizedRole];
  return translationKey ? t(translationKey) : t('employee');
};

export type ApiRole =
  | 'admin'
  | 'supervisor'
  | 'employee'
  | 'data_entry'
  | 'reception'
  | 'doctor'
  | 'call_center';

export const normalizeRoleForApi = (role?: string): ApiRole => {
  const appRole = normalizeRole(role);
  if (appRole === 'Owner') return 'admin';
  if (appRole === 'Supervisor') return 'supervisor';
  if (appRole === 'DataEntry') return 'data_entry';
  if (appRole === 'Reception') return 'reception';
  if (appRole === 'Doctor') return 'doctor';
  if (appRole === 'CallCenter') return 'call_center';
  return 'employee';
};

/** True only for `data_entry` (restricted UI / no assignee) — not reception or doctor. */
export const isDataEntryOnlyRole = (role?: string): boolean => normalizeRole(role) === 'DataEntry';

/** Medical dashboard scope: users who may be assigned patients (matches API medical assignee roles). */
export const isAssignedClinicalAppRole = (role?: string): boolean => {
  const r = normalizeRole(role);
  return r === 'Owner' || r === 'Supervisor' || r === 'Employee' || r === 'Doctor';
};

/** Shown in manual lead/deal assignee pickers; data-entry, reception and call center are not assignees. */
export const showInLeadAssigneePicker = (role?: string): boolean => {
  const ar = normalizeRole(role);
  return ar !== 'DataEntry' && ar !== 'Reception' && ar !== 'CallCenter';
};

/** Deactivate flow: ask whether to redistribute leads (data entry / reception / call center cannot hold assignee leads). */
export const roleUsesLeadReassignOnDeactivate = (role?: string): boolean => {
  const ar = normalizeRole(role);
  return ar !== 'DataEntry' && ar !== 'Reception' && ar !== 'CallCenter';
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
export function buildLeadAssigneePickerOptions<T extends { id: number; role?: string; is_active?: boolean }>(
  apiUsers: T[],
  currentUser: T | null | undefined
): T[] {
  const map = new Map<number, T>();
  for (const u of apiUsers) {
    if (u.is_active === false) continue;
    if (showInLeadAssigneePicker(u.role)) map.set(u.id, u);
  }
  if (
    currentUser &&
    currentUser.is_active !== false &&
    showInLeadAssigneePicker(currentUser.role) &&
    !map.has(currentUser.id)
  ) {
    map.set(currentUser.id, currentUser);
  }
  return Array.from(map.values());
}
