import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Lead } from '../types';
import { openWhatsAppExternal } from '../utils/whatsappLaunch';
import { useWhatsAppChatsAllowed } from './useWhatsAppChatsAllowed';
import { useWhatsAppConnected } from './useWhatsAppConnected';

/**
 * The single decision point behind every WhatsApp button on a lead's phone number.
 *
 * Connected tenant + a user allowed to use Chats → open the conversation in the
 * CRM, on the exact number that was clicked. Anything else (no integration, no
 * permission, still loading) → hand off to the official WhatsApp via wa.me, so
 * the button always does something useful. Mirrors `openWhatsAppForLead` in
 * crm_mobile (lib/utils/whatsapp_launch.dart).
 */
export function useWhatsAppLeadAction(): (lead: Lead | null | undefined, phone: string) => void {
  const { openLeadInChats, showAlert, t } = useAppContext();
  const { isConnected } = useWhatsAppConnected();
  const chatsAllowed = useWhatsAppChatsAllowed();

  return useCallback(
    (lead: Lead | null | undefined, phone: string) => {
      if (isConnected && chatsAllowed && typeof lead?.id === 'number') {
        openLeadInChats(lead, phone);
        return;
      }
      if (!openWhatsAppExternal(phone)) {
        showAlert(t('invalidPhone') || 'Invalid phone number', 'warning');
      }
    },
    [isConnected, chatsAllowed, openLeadInChats, showAlert, t]
  );
}
