import type { User } from '../types';
import { normalizeRole } from './roles';

/**
 * Omni-Channel Inbox access rules, mirroring the backend
 * (`integrations/social_inbox_access.py`) and the mobile helpers.
 *
 * Full inbox (every conversation, convert, triage): owner, call center, and
 * supervisors with `can_manage_social_inbox`.
 *
 * Employee / doctor may open Inbox but only see conversations whose converted
 * lead is assigned to them. Reception / data entry never get the page.
 */

type InboxUser = Pick<User, 'role' | 'supervisor_permissions'> | null | undefined;

function supervisorPermission(
  user: InboxUser,
  key: 'can_manage_social_inbox' | 'can_manage_leads',
): boolean {
  if (!user || normalizeRole(user.role) !== 'Supervisor') return false;
  const sp = user.supervisor_permissions;
  if (!sp?.is_active || !sp.permissions) return false;
  return Boolean(sp.permissions[key]);
}

/** Company-wide visibility across every conversation, converted or not. */
export function userSeesAllSocialConversations(user: InboxUser): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'Owner' || role === 'CallCenter') return true;
  if (role === 'Supervisor') return supervisorPermission(user, 'can_manage_social_inbox');
  return false;
}

/** Who may turn a conversation into a CRM lead and pick its assignee. */
export function canConvertSocialConversation(user: InboxUser): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'Owner' || role === 'CallCenter') return true;
  if (role === 'Supervisor') {
    return (
      supervisorPermission(user, 'can_manage_social_inbox') ||
      supervisorPermission(user, 'can_manage_leads')
    );
  }
  return false;
}

/** Employee / doctor: API scopes them to converted leads assigned to them. */
export function isSocialInboxStaffScoped(user: InboxUser): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  return role === 'Employee' || role === 'Doctor';
}
