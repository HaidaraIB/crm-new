import type { WhatsAppChatFilters } from '../types';

export const DEFAULT_WHATSAPP_CHAT_FILTERS: WhatsAppChatFilters = {
  status: 'open',
  assignment: 'all',
  agent: '',
  starred: false,
  unreplied: false,
  search: '',
};

export function whatsappChatFiltersToApiParams(filters: WhatsAppChatFilters): {
  status?: string;
  assignment?: string;
  agent?: number;
  starred?: boolean;
  unreplied?: boolean;
  search?: string;
} {
  const status =
    filters.status && filters.status !== 'all' ? filters.status : undefined;
  const assignment =
    filters.assignment && filters.assignment !== 'all'
      ? filters.assignment
      : undefined;
  const agentId = filters.agent.trim();
  const agent =
    agentId && /^\d+$/.test(agentId) ? Number(agentId) : undefined;
  const search = filters.search.trim() || undefined;

  return {
    status,
    assignment,
    agent,
    starred: filters.starred || undefined,
    unreplied: filters.unreplied || undefined,
    search,
  };
}

/** True when filters are at defaults (manual local chats may be merged). */
export function whatsappChatFiltersAreDefault(filters: WhatsAppChatFilters): boolean {
  return (
    filters.status === DEFAULT_WHATSAPP_CHAT_FILTERS.status &&
    filters.assignment === DEFAULT_WHATSAPP_CHAT_FILTERS.assignment &&
    !filters.agent &&
    !filters.starred &&
    !filters.unreplied &&
    !filters.search.trim()
  );
}
