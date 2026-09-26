import type { MessageTemplateType } from '../../services/api';

export type WhatsAppThreadCapabilities = {
  calling: boolean;
  location: boolean;
  fullTemplates: boolean;
  voiceNotes: boolean;
  deleteConversation: boolean;
  assignmentFilters: boolean;
};

export type WhatsAppCallTarget = {
  to: string;
  clientId?: number;
  conversationId?: number;
  waInboxNumberId?: number;
};

export type WhatsAppThreadAdapter = {
  capabilities: WhatsAppThreadCapabilities;
  invalidationSlice: 'chat' | 'inbox';
  callTarget: (ctx: {
    peerPhone: string;
    clientId?: number | null;
    conversationId?: number;
    waInboxNumberId?: number | null;
  }) => WhatsAppCallTarget | null;
  approvedTemplatesFilter: (templates: MessageTemplateType[]) => MessageTemplateType[];
};
