import type { WhatsAppAgentCallStatus } from '../services/api';

/** Dispatched after Ready/Away is saved so team panels refresh immediately. */
export const WHATSAPP_CALL_AGENT_STATUS_EVENT = 'whatsapp-call-agent-status-changed';

export function notifyWhatsAppCallAgentStatusChanged(status: WhatsAppAgentCallStatus) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(WHATSAPP_CALL_AGENT_STATUS_EVENT, { detail: status })
  );
}
