const PENDING_INBOX_CONVERSATION_KEY = 'crm.pendingInboxConversationId';

export function stashPendingInboxConversationId(conversationId: number): void {
  try {
    sessionStorage.setItem(PENDING_INBOX_CONVERSATION_KEY, String(conversationId));
  } catch {
    // ignore
  }
}

export function consumePendingInboxConversationId(): number | null {
  try {
    const raw = sessionStorage.getItem(PENDING_INBOX_CONVERSATION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_INBOX_CONVERSATION_KEY);
    const id = parseInt(raw, 10);
    return id > 0 ? id : null;
  } catch {
    return null;
  }
}
