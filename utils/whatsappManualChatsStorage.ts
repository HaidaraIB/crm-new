export type ChatMessageStatus = 'sending' | 'sent' | 'failed';

export type ManualChatMessage = {
  id?: string;
  body: string;
  direction: 'in' | 'out';
  time: string;
  status?: ChatMessageStatus;
  /** How the message was sent (for resend). */
  sendKind?: 'text' | 'template';
  templateId?: number;
};

type ManualConversation = { client: Record<string, unknown> };

function storageSuffix(companyId: number | string | undefined): string {
  return String(companyId ?? 'default');
}

function conversationsKey(companyId: number | string | undefined): string {
  return `wa_manual_conversations_${storageSuffix(companyId)}`;
}

function messagesKey(companyId: number | string | undefined): string {
  return `wa_manual_messages_${storageSuffix(companyId)}`;
}

function selectedPhoneKey(companyId: number | string | undefined): string {
  return `wa_manual_selected_phone_${storageSuffix(companyId)}`;
}

export function normalizeChatPhone(client: { phone_number?: string; phone?: string; name?: string } | null | undefined): string {
  if (!client) return '';
  const raw = (client.phone_number || client.phone || '').replace(/\s+/g, '').replace(/^\+/, '');
  if (raw) return raw;
  const name = String(client.name || '').replace(/\s+/g, '').replace(/^\+/, '');
  return /^\d+$/.test(name) ? name : '';
}

export function isManualChatClient(client: { id?: unknown; is_manual?: boolean } | null | undefined): boolean {
  if (!client) return false;
  if (client.is_manual) return true;
  return typeof client.id === 'string' && client.id.startsWith('manual:');
}

export function buildManualClientForPhone(phone: string): Record<string, unknown> {
  return {
    id: `manual:${phone}`,
    name: phone,
    company_name: phone,
    phone_number: phone,
    is_manual: true,
  };
}

export function loadAllManualMessagePhones(companyId: number | string | undefined): string[] {
  try {
    const raw = sessionStorage.getItem(messagesKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, ManualChatMessage[]>;
    return Object.keys(parsed).filter((phone) => {
      const msgs = parsed[phone];
      return phone && Array.isArray(msgs) && msgs.length > 0;
    });
  } catch {
    return [];
  }
}

/** Union of saved manual threads and any phone that still has local message history. */
export function mergeManualConversations(companyId: number | string | undefined): ManualConversation[] {
  const byPhone = new Map<string, ManualConversation>();
  for (const entry of loadManualConversations(companyId)) {
    const phone = normalizeChatPhone(entry.client as { phone_number?: string; phone?: string; name?: string });
    if (phone) byPhone.set(phone, entry);
  }
  for (const phone of loadAllManualMessagePhones(companyId)) {
    if (!byPhone.has(phone)) {
      byPhone.set(phone, { client: buildManualClientForPhone(phone) });
    }
  }
  return Array.from(byPhone.values()).sort((a, b) => {
    const pa = normalizeChatPhone(a.client as { phone_number?: string; phone?: string; name?: string });
    const pb = normalizeChatPhone(b.client as { phone_number?: string; phone?: string; name?: string });
    return pb.localeCompare(pa);
  });
}

export function loadManualConversations(companyId: number | string | undefined): ManualConversation[] {
  try {
    const raw = sessionStorage.getItem(conversationsKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveManualConversations(companyId: number | string | undefined, list: ManualConversation[]): void {
  try {
    sessionStorage.setItem(conversationsKey(companyId), JSON.stringify(list));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadManualMessages(companyId: number | string | undefined, phone: string): ManualChatMessage[] {
  if (!phone) return [];
  try {
    const raw = sessionStorage.getItem(messagesKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, ManualChatMessage[]>;
    const list = parsed?.[phone];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveManualMessages(
  companyId: number | string | undefined,
  phone: string,
  messages: ManualChatMessage[]
): void {
  if (!phone) return;
  try {
    const key = messagesKey(companyId);
    const raw = sessionStorage.getItem(key);
    const map: Record<string, ManualChatMessage[]> = raw ? JSON.parse(raw) : {};
    map[phone] = messages;
    sessionStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function loadSelectedManualPhone(companyId: number | string | undefined): string | null {
  try {
    return sessionStorage.getItem(selectedPhoneKey(companyId));
  } catch {
    return null;
  }
}

export function saveSelectedManualPhone(companyId: number | string | undefined, phone: string | null): void {
  try {
    const key = selectedPhoneKey(companyId);
    if (!phone) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, phone);
  } catch {
    /* ignore */
  }
}

export function clearManualMessagesForPhone(companyId: number | string | undefined, phone: string): void {
  if (!phone) return;
  saveManualMessages(companyId, phone, []);
}

export function removeManualConversationForPhone(
  companyId: number | string | undefined,
  phone: string
): void {
  if (!phone) return;
  const normalized = phone.replace(/\s+/g, '').replace(/^\+/, '');
  const list = loadManualConversations(companyId).filter((entry) => {
    const p = normalizeChatPhone(entry.client as { phone_number?: string; phone?: string; name?: string });
    return p !== normalized;
  });
  saveManualConversations(companyId, list);
  clearManualMessagesForPhone(companyId, normalized);
}
