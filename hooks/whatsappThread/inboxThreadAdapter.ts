import type { MessageTemplateType } from '../../services/api';
import type { WhatsAppThreadAdapter } from './types';

export const inboxWhatsappThreadAdapter: WhatsAppThreadAdapter = {
  invalidationSlice: 'inbox',
  capabilities: {
    calling: true,
    location: true,
    fullTemplates: true,
    voiceNotes: true,
    deleteConversation: true,
    assignmentFilters: true,
  },
  callTarget: ({ peerPhone, clientId, conversationId, waInboxNumberId }) => {
    const to = (peerPhone || '').trim();
    if (!to) return null;
    return {
      to,
      clientId: clientId ?? undefined,
      conversationId,
      waInboxNumberId: waInboxNumberId ?? undefined,
    };
  },
  approvedTemplatesFilter: (templates) =>
    templates.filter(
      (tpl) =>
        (tpl.channel_type === 'whatsapp' || tpl.channel_type === 'whatsapp_api') &&
        String(tpl.meta_status || 'APPROVED').toUpperCase() === 'APPROVED'
    ),
};
