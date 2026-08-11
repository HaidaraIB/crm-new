import { useAppContext } from '../context/AppContext';
import { normalizeRole } from '../utils/roles';

/**
 * Whether this user may use WhatsApp chats at all — mirrors the backend's
 * `user_can_access_whatsapp_chats`. Gate every WhatsApp poll on this: without it a
 * user whose access is switched off polls unread-count/conversations forever and
 * fills the production log with `Forbidden:` warnings.
 */
export function useWhatsAppChatsAllowed(): boolean {
  const { currentUser, hasSupervisorPermission, canAccessPage } = useAppContext();
  if (!currentUser) return false;
  const role = normalizeRole(currentUser.role);
  if (role === 'Owner') return true;
  // Data entry / reception have no Chats surface in the CRM.
  if (role === 'DataEntry' || role === 'Reception') return false;
  if (role === 'Supervisor') {
    return canAccessPage('Chats') && hasSupervisorPermission('can_manage_whatsapp_chats');
  }
  // Employee / Doctor: per-user toggle the owner controls.
  return currentUser.whatsapp_chat_enabled !== false;
}
