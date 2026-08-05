import type { ChatBubbleMessage } from '../components/whatsapp/ChatMessageBubble';
import type { ChatStatusVariant } from '../components/whatsapp/ChatStatusSeparator';

export type WhatsAppThreadItem =
  | { kind: 'status'; id: string; variant: ChatStatusVariant; label: string }
  | { kind: 'message'; msg: ChatBubbleMessage };

function dayKey(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatStatusDate(iso: string, language: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(language === 'ar' ? 'ar' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDayChip(
  iso: string,
  language: string,
  t: (key: string) => string
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startMsg.getTime()) / 86400000);
  if (diffDays === 0) return t('today');
  if (diffDays === 1) return t('yesterday');
  return formatStatusDate(iso, language);
}

/**
 * Insert WhatsApp-style status rows: conversation started, day chips, unread divider.
 */
export function buildWhatsAppThreadItems(
  messages: ChatBubbleMessage[],
  opts: {
    language: string;
    t: (key: string) => string;
    /** First unread inbound api id — divider is placed before that message. */
    newMessagesBeforeApiId?: number | null;
  }
): WhatsAppThreadItem[] {
  const { language, t, newMessagesBeforeApiId = null } = opts;
  const items: WhatsAppThreadItem[] = [];
  if (!messages.length) return items;

  const firstWithDate = messages.find((m) => m.createdAt);
  if (firstWithDate?.createdAt) {
    const dateLabel = formatStatusDate(firstWithDate.createdAt, language);
    items.push({
      kind: 'status',
      id: 'status-started',
      variant: 'started',
      label: (t('whatsappConversationStartedOn') || 'Conversation started on: {date}').replace(
        '{date}',
        dateLabel
      ),
    });
  }

  let prevDay: string | null = null;
  let newDividerInserted = false;

  for (const msg of messages) {
    const key = dayKey(msg.createdAt);
    if (key && key !== prevDay && msg.createdAt) {
      if (prevDay !== null) {
        items.push({
          kind: 'status',
          id: `status-day-${key}`,
          variant: 'day',
          label: formatDayChip(msg.createdAt, language, t),
        });
      }
      prevDay = key;
    }

    if (
      !newDividerInserted &&
      newMessagesBeforeApiId != null &&
      msg.apiId === newMessagesBeforeApiId
    ) {
      items.push({
        kind: 'status',
        id: 'status-new-messages',
        variant: 'new',
        label: t('whatsappNewMessages') || 'New Messages',
      });
      newDividerInserted = true;
    }

    items.push({ kind: 'message', msg });
  }

  return items;
}
