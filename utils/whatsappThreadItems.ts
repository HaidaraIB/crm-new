import type { ChatBubbleMessage } from '../components/whatsapp/ChatMessageBubble';
import type { ChatStatusVariant } from '../components/whatsapp/ChatStatusSeparator';
import type { ChatThreadCall } from '../components/whatsapp/ChatCallBubble';

export type WhatsAppThreadItem =
  | { kind: 'status'; id: string; variant: ChatStatusVariant; label: string }
  | { kind: 'message'; msg: ChatBubbleMessage }
  | { kind: 'call'; id: string; call: ChatThreadCall; createdAt: string };

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

type TimelineEvent =
  | { sortAt: number; createdAt: string; kind: 'message'; msg: ChatBubbleMessage }
  | { sortAt: number; createdAt: string; kind: 'call'; call: ChatThreadCall };

function callSortIso(call: ChatThreadCall): string {
  return call.started_at || call.answered_at || call.ended_at || call.created_at || '';
}

/**
 * Insert WhatsApp-style status rows: conversation started, day chips, unread divider,
 * and interleave Cloud Calling logs with messages.
 */
export function buildWhatsAppThreadItems(
  messages: ChatBubbleMessage[],
  opts: {
    language: string;
    t: (key: string) => string;
    /** First unread inbound api id — divider is placed before that message. */
    newMessagesBeforeApiId?: number | null;
    calls?: ChatThreadCall[];
  }
): WhatsAppThreadItem[] {
  const { language, t, newMessagesBeforeApiId = null, calls = [] } = opts;
  const items: WhatsAppThreadItem[] = [];

  const events: TimelineEvent[] = [];
  for (const msg of messages) {
    const iso = msg.createdAt || '';
    const sortAt = iso ? new Date(iso).getTime() : 0;
    events.push({
      sortAt: Number.isFinite(sortAt) ? sortAt : 0,
      createdAt: iso,
      kind: 'message',
      msg,
    });
  }
  for (const call of calls) {
    const iso = callSortIso(call);
    if (!iso) continue;
    const sortAt = new Date(iso).getTime();
    if (!Number.isFinite(sortAt)) continue;
    // Skip in-progress ringing rows in the historical thread (still shown via call UI).
    if (String(call.status || '').toLowerCase() === 'ringing') continue;
    events.push({ sortAt, createdAt: iso, kind: 'call', call });
  }

  events.sort((a, b) => a.sortAt - b.sortAt || a.createdAt.localeCompare(b.createdAt));

  if (!events.length) return items;

  const firstWithDate = events.find((e) => e.createdAt);
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

  for (const ev of events) {
    const key = dayKey(ev.createdAt);
    if (key && key !== prevDay && ev.createdAt) {
      if (prevDay !== null) {
        items.push({
          kind: 'status',
          id: `status-day-${key}`,
          variant: 'day',
          label: formatDayChip(ev.createdAt, language, t),
        });
      }
      prevDay = key;
    }

    if (ev.kind === 'message') {
      if (
        !newDividerInserted &&
        newMessagesBeforeApiId != null &&
        ev.msg.apiId === newMessagesBeforeApiId
      ) {
        items.push({
          kind: 'status',
          id: 'status-new-messages',
          variant: 'new',
          label: t('whatsappNewMessages') || 'New Messages',
        });
        newDividerInserted = true;
      }
      items.push({ kind: 'message', msg: ev.msg });
    } else {
      items.push({
        kind: 'call',
        id: `call-${ev.call.id}`,
        call: ev.call,
        createdAt: ev.createdAt,
      });
    }
  }

  return items;
}
