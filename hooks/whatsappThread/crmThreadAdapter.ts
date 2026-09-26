import type { MessageTemplateType } from '../../services/api';
import type { WhatsAppThreadAdapter } from './types';

export const crmWhatsappThreadAdapter: WhatsAppThreadAdapter = {
  invalidationSlice: 'chat',
  capabilities: {
    calling: true,
    location: true,
    fullTemplates: true,
    voiceNotes: true,
    deleteConversation: true,
    assignmentFilters: true,
  },
  callTarget: ({ peerPhone, clientId }) => {
    const to = (peerPhone || '').trim();
    if (!to) return null;
    return { to, clientId: clientId ?? undefined };
  },
  approvedTemplatesFilter: (templates) =>
    templates.filter(
      (tpl) =>
        (tpl.channel_type === 'whatsapp' || tpl.channel_type === 'whatsapp_api') &&
        String(tpl.meta_status || 'APPROVED').toUpperCase() === 'APPROVED'
    ),
};
