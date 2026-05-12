import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Modal } from '../components/index';
import {
  ArrowDownToLineIcon,
  ChatBubbleIcon,
  CheckIcon,
  ChevronDownIcon,
  MicrophoneIcon,
  PaperclipIcon,
  SendPlaneIcon,
  SquareFillIcon,
} from '../components/icons';
import {
  getAuthenticatedBinaryRequestHeaders,
  getTenantChatConversationsAPI,
  getTenantChatEligibleUsersAPI,
  getTenantChatMessagesAPI,
  getTenantChatPeerPresenceAPI,
  markTenantChatReadAPI,
  pinTenantChatMessageAPI,
  sendTenantChatMessageAPI,
  postTenantChatPeerPresenceAPI,
  sendTenantChatMessageWithAttachmentAPI,
  startTenantChatConversationAPI,
  unpinTenantChatMessageAPI,
  type TenantChatMessage,
  type TenantChatMessageQuote,
  type TenantChatPeer,
  type TenantChatPeerPresenceAction,
} from '../services/api';
import { compressImageForChat } from '../utils/compressImageForChat';

function peerDisplayName(p: TenantChatPeer): string {
  const n = `${p.first_name || ''} ${p.last_name || ''}`.trim();
  return n || p.username || p.email || `#${p.id}`;
}

function peerInitials(p: TenantChatPeer): string {
  const fn = (p.first_name || '').trim();
  const ln = (p.last_name || '').trim();
  if (fn || ln) {
    const a = (fn[0] || '').toUpperCase();
    const b = (ln[0] || fn[1] || '').toUpperCase();
    return (a + b).slice(0, 2);
  }
  const raw = (p.username || p.email || '?').replace(/[^a-zA-Z0-9]/g, '');
  return raw.slice(0, 2).toUpperCase() || '?';
}

/** Text direction from first strong character (like Telegram), not app UI language. */
const chatAutoDirClass = '[unicode-bidi:plaintext]';

function ChatText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span dir="auto" className={`${chatAutoDirClass} ${className}`.trim()}>
      {children}
    </span>
  );
}

function formatLastSeenRelative(
  lastSeenAt: string | null | undefined,
  t: (key: string) => string
): string {
  if (!lastSeenAt) return t('lastSeenUnknown');
  const parsed = new Date(lastSeenAt);
  if (Number.isNaN(parsed.getTime())) return t('lastSeenUnknown');
  const seconds = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
  if (seconds < 60) return t('justNow');
  if (seconds < 3600) return `${Math.floor(seconds / 60)} ${t('minutesAgo')}`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ${t('hoursAgo')}`;
  return `${Math.floor(seconds / 86400)} ${t('daysAgo')}`;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatChatDaySeparator(
  dayStart: Date,
  now: Date,
  language: string,
  t: (key: string) => string
): string {
  const loc = language === 'ar' ? 'ar' : 'en';
  const today = startOfLocalDay(now);
  const yesterday = new Date(today.getTime());
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayStart.getTime() === today.getTime()) return t('teamChatDayToday');
  if (dayStart.getTime() === yesterday.getTime()) return t('teamChatDayYesterday');
  const sameYear = dayStart.getFullYear() === now.getFullYear();
  return dayStart.toLocaleDateString(loc, {
    month: 'long',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

const TEAM_CHAT_MSG_LONG_PRESS_MS = 520;
const TEAM_CHAT_MSG_POINTER_SLOP_PX = 14;

const MSG_MENU_ESTIMATE_W_PX = 168;
const MSG_MENU_ESTIMATE_H_PX = 148;

function nearestOverflowScrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const { overflow, overflowY, overflowX } = window.getComputedStyle(p);
    const oy = overflowY === 'visible' ? overflow : overflowY;
    const ox = overflowX === 'visible' ? overflow : overflowX;
    if (oy === 'auto' || oy === 'scroll' || oy === 'overlay' || ox === 'auto' || ox === 'scroll') return p;
  }
  return null;
}

type MsgFloatingMenuGeom = {
  top: number;
  left: number;
};

/** Portal menu: beside the bubble toward the thread center; vertically centered on the bubble. */
function computeMsgFloatingMenuGeom(
  anchorRect: DOMRectReadOnly,
  mine: boolean,
  menuEl: HTMLElement | null
): MsgFloatingMenuGeom {
  const menuW = Math.max(menuEl?.offsetWidth ?? 0, MSG_MENU_ESTIMATE_W_PX);
  const menuH = Math.max(menuEl?.offsetHeight ?? 0, MSG_MENU_ESTIMATE_H_PX);
  const pad = 8;
  const gap = 6;

  let top = anchorRect.top + (anchorRect.height - menuH) / 2;
  top = Math.max(pad, Math.min(top, window.innerHeight - pad - menuH));

  let left: number;
  if (mine) {
    // Outgoing bubble is on the visual right; tuck menu left (toward transcript center).
    left = anchorRect.left - gap - menuW;
    if (left < pad) left = anchorRect.right + gap;
  } else {
    // Incoming bubble on the left; open menu toward the center (to the right).
    left = anchorRect.right + gap;
    if (left + menuW > window.innerWidth - pad) left = anchorRect.left - gap - menuW;
  }

  left = Math.max(pad, Math.min(left, window.innerWidth - pad - menuW));
  return { top, left };
}

const THREAD_SCROLL_NEAR_BOTTOM_PX = 80;

function isNearThreadScrollBottom(scroller: HTMLElement): boolean {
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < THREAD_SCROLL_NEAR_BOTTOM_PX;
}

/** Highest message id whose row intersects the scroll container viewport (vertically). */
function maxIntersectingTenantMessageId(
  scroller: HTMLElement,
  messages: TenantChatMessage[]
): number | null {
  const cr = scroller.getBoundingClientRect();
  let maxId: number | null = null;
  for (const m of messages) {
    const el = document.getElementById(`tenant-chat-msg-${m.id}`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom <= cr.top || r.top >= cr.bottom) continue;
    if (maxId == null || m.id > maxId) maxId = m.id;
  }
  return maxId;
}

/** Peer messages with id above read cursor whose row starts below the visible bottom (Telegram-style badge). */
function countPeerMessagesBelowViewport(
  scroller: HTMLElement,
  messages: TenantChatMessage[],
  currentUserId: number,
  readThroughId: number
): number {
  const cr = scroller.getBoundingClientRect();
  const line = cr.bottom - 10;
  let n = 0;
  for (const m of messages) {
    if (m.sender?.id === currentUserId) continue;
    if (m.id <= readThroughId) continue;
    const el = document.getElementById(`tenant-chat-msg-${m.id}`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.top > line) n++;
  }
  return n;
}

function tenantChatQuoteLabel(q: TenantChatMessageQuote, t: (key: string) => string): string {
  const cap = (q.body || '').trim();
  const kind = q.attachment_kind;
  let label = '';
  if (kind === 'image') label = t('teamChatMediaPhoto');
  else if (kind === 'video') label = t('teamChatMediaVideo');
  else if (kind === 'audio') label = t('teamChatMediaAudio');
  else if (kind === 'document') label = t('teamChatMediaDocument');
  if (label && cap) return `${label}: ${cap}`;
  if (cap) return cap;
  return label || '';
}

function replyTargetSnippet(m: TenantChatMessage, t: (key: string) => string): string {
  const cap = (m.body || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const kind = m.attachment_kind;
  let label = '';
  if (kind === 'image') label = t('teamChatMediaPhoto');
  else if (kind === 'video') label = t('teamChatMediaVideo');
  else if (kind === 'audio') label = t('teamChatMediaAudio');
  else if (kind === 'document') label = t('teamChatMediaDocument');
  if (label && cap) return `${label} · ${cap}`;
  if (cap) return cap;
  return label || '';
}

function tenantChatBinaryUrlIdentity(absoluteUrl: string): string {
  try {
    const u = new URL(absoluteUrl);
    return `${u.origin}${u.pathname}`;
  } catch {
    return absoluteUrl;
  }
}

const TENANT_CHAT_BLOB_CACHE_MAX = 40;
const tenantChatBlobUrlLru = new Map<string, string>();

function tenantChatBlobCacheTake(identity: string): string | null {
  const v = tenantChatBlobUrlLru.get(identity);
  if (v == null) return null;
  tenantChatBlobUrlLru.delete(identity);
  tenantChatBlobUrlLru.set(identity, v);
  return v;
}

function tenantChatBlobCachePut(identity: string, objectUrl: string) {
  const existing = tenantChatBlobUrlLru.get(identity);
  if (existing != null && existing !== objectUrl) {
    tenantChatBlobUrlLru.delete(identity);
    URL.revokeObjectURL(existing);
  }
  while (tenantChatBlobUrlLru.size >= TENANT_CHAT_BLOB_CACHE_MAX) {
    const firstKey = tenantChatBlobUrlLru.keys().next().value as string | undefined;
    if (firstKey == null) break;
    const old = tenantChatBlobUrlLru.get(firstKey);
    tenantChatBlobUrlLru.delete(firstKey);
    if (old) URL.revokeObjectURL(old);
  }
  tenantChatBlobUrlLru.set(identity, objectUrl);
}

/** In-flow box so aspect-ratio reserves space; absolute overlays alone collapse in flex parents. */
function TenantChatLazyAspectSizer({ aspectRatio }: { aspectRatio: string }) {
  return (
    <div
      className="pointer-events-none block w-full max-h-64"
      style={{ aspectRatio }}
      aria-hidden
    />
  );
}

type TenantChatBlobMediaProps = {
  url: string;
  kind: 'image' | 'video' | 'audio' | 'document';
  mine: boolean;
  filename?: string | null;
  attachmentWidth?: number | null;
  attachmentHeight?: number | null;
  t: (key: string) => string;
  /** Fires when intrinsic media layout is known (image decode, video metadata, etc.). */
  onIntrinsicLayout?: () => void;
};

function TenantChatBlobMedia({
  url,
  kind,
  mine,
  filename,
  attachmentWidth,
  attachmentHeight,
  t,
  onIntrinsicLayout,
}: TenantChatBlobMediaProps) {
  const urlIdentity = useMemo(() => tenantChatBinaryUrlIdentity(url), [url]);
  const lazyVisual = kind === 'image' || kind === 'video';

  const aspectRatioCss =
    attachmentWidth != null &&
    attachmentHeight != null &&
    attachmentWidth > 0 &&
    attachmentHeight > 0
      ? `${attachmentWidth} / ${attachmentHeight}`
      : '16 / 9';

  const hasKnownAspect =
    attachmentWidth != null &&
    attachmentHeight != null &&
    attachmentWidth > 0 &&
    attachmentHeight > 0;

  const [blobUrl, setBlobUrl] = useState<string | null>(() =>
    lazyVisual ? tenantChatBlobCacheTake(urlIdentity) : null
  );
  const [failed, setFailed] = useState(false);
  const [lazyRequested, setLazyRequested] = useState(false);
  const [lazyLoading, setLazyLoading] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (lazyVisual) {
      const cached = tenantChatBlobCacheTake(urlIdentity);
      setBlobUrl(cached);
      setLazyRequested(false);
      setLazyLoading(false);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlobUrl(null);
    void (async () => {
      try {
        const r = await fetch(url, { headers: getAuthenticatedBinaryRequestHeaders() });
        if (!r.ok || cancelled) return;
        const blob = await r.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, urlIdentity, lazyVisual]);

  useEffect(() => {
    if (!lazyVisual || !lazyRequested || blobUrl != null) return;
    let cancelled = false;
    void (async () => {
      setLazyLoading(true);
      try {
        const r = await fetch(url, { headers: getAuthenticatedBinaryRequestHeaders() });
        if (!r.ok || cancelled) {
          if (!cancelled) {
            setFailed(true);
            setLazyRequested(false);
          }
          return;
        }
        const blob = await r.blob();
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        tenantChatBlobCachePut(urlIdentity, objectUrl);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLazyRequested(false);
        }
      } finally {
        if (!cancelled) setLazyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lazyVisual, lazyRequested, blobUrl, url, urlIdentity]);

  const startLazyLoad = useCallback(() => {
    const cached = tenantChatBlobCacheTake(urlIdentity);
    if (cached != null) {
      tenantChatBlobUrlLru.set(urlIdentity, cached);
      setBlobUrl(cached);
      return;
    }
    setLazyRequested(true);
  }, [urlIdentity]);

  if (failed) {
    return (
      <span className={`text-xs ${mine ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
        {t('teamChatCouldNotLoad')}
      </span>
    );
  }

  const mediaShellClass = `relative w-full overflow-hidden rounded-lg max-h-64 ${
    mine
      ? 'bg-white/10'
      : 'bg-gradient-to-br from-gray-200/90 to-gray-300/80 dark:from-gray-700/80 dark:to-gray-800/70'
  }`;

  if (lazyVisual && !blobUrl) {
    return (
      <div className={mediaShellClass}>
        <TenantChatLazyAspectSizer aspectRatio={aspectRatioCss} />
        <button
          type="button"
          className="absolute inset-0 z-10 flex w-full flex-col items-center justify-center gap-2 border-0 bg-transparent p-3 outline-none ring-primary/40 focus-visible:ring-2"
          aria-label={t('teamChatTapToLoadAria')}
          onClick={startLazyLoad}
          disabled={lazyLoading}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black/50 text-white shadow-md">
            {lazyLoading ? (
              <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <ArrowDownToLineIcon className="size-5" aria-hidden />
            )}
          </span>
          <span
            className={`pointer-events-none max-w-[90%] text-center text-[11px] font-medium leading-snug ${
              mine ? 'text-white/90' : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {t('teamChatTapToLoad')}
          </span>
        </button>
      </div>
    );
  }

  if (!blobUrl) {
    return <span className={`text-xs ${mine ? 'text-white/70' : 'text-gray-400'}`}>…</span>;
  }

  const docName = filename || 'download';

  const lazyAspectBoxClass = 'relative w-full overflow-hidden rounded-lg max-h-64';

  if (kind === 'image') {
    if (hasKnownAspect) {
      return (
        <div className={lazyAspectBoxClass}>
          <TenantChatLazyAspectSizer aspectRatio={aspectRatioCss} />
          <img
            src={blobUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            onLoad={onIntrinsicLayout}
          />
        </div>
      );
    }
    return (
      <img
        src={blobUrl}
        alt=""
        className="max-h-64 w-full rounded-lg object-contain"
        onLoad={onIntrinsicLayout}
      />
    );
  }
  if (kind === 'video') {
    if (hasKnownAspect) {
      return (
        <div className={lazyAspectBoxClass}>
          <TenantChatLazyAspectSizer aspectRatio={aspectRatioCss} />
          <video
            src={blobUrl}
            controls
            className="absolute inset-0 h-full w-full object-contain"
            onLoadedMetadata={onIntrinsicLayout}
          />
        </div>
      );
    }
    return (
      <video
        src={blobUrl}
        controls
        className="max-h-64 w-full rounded-lg"
        onLoadedMetadata={onIntrinsicLayout}
      />
    );
  }
  if (kind === 'audio') {
    return <audio src={blobUrl} controls className="mt-1 w-full" onLoadedMetadata={onIntrinsicLayout} />;
  }
  return (
    <a
      href={blobUrl}
      download={docName}
      className={`inline-flex text-sm font-semibold underline ${mine ? 'text-white' : 'text-primary dark:text-primary-200'}`}
    >
      {t('teamChatDownload')}
    </a>
  );
}

export type TeamChatPageProps = {
  variant?: 'page' | 'dialog';
  onClose?: () => void;
};

export const TeamChatPage = ({ variant = 'page', onClose }: TeamChatPageProps = {}) => {
  const { t, language, currentUser } = useAppContext();
  /** Physical edge toward avatar (flex row + RTL puts avatar on the right). */
  const peerRowTextAlign = language === 'ar' ? 'text-right' : 'text-left';
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  /** Reply target (same thread). Cleared after send or thread change. */
  const [replyToMessage, setReplyToMessage] = useState<TenantChatMessage | null>(null);
  /** Forward: source message id; pick target conversation in modal. */
  const [forwardSourceId, setForwardSourceId] = useState<number | null>(null);
  const [forwardCaption, setForwardCaption] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [compressingAttachment, setCompressingAttachment] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  /** True after a short quiet period while draft has text (typing indicator for peer). */
  const [draftTypingSignal, setDraftTypingSignal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const [msgActionsOpenId, setMsgActionsOpenId] = useState<number | null>(null);
  const [msgActionsMenuPos, setMsgActionsMenuPos] = useState<MsgFloatingMenuGeom | null>(null);
  const msgActionsMenuPortalRef = useRef<HTMLDivElement | null>(null);
  /** Tracks one active pointer gesture (document listeners so scroll clears long-press reliably). */
  const msgGestureDisposeRef = useRef<(() => void) | null>(null);

  const disposeMsgGesture = useCallback(() => {
    msgGestureDisposeRef.current?.();
    msgGestureDisposeRef.current = null;
  }, []);

  useEffect(() => () => disposeMsgGesture(), [disposeMsgGesture]);

  const attachMsgPointerDown = useCallback(
    (m: TenantChatMessage, e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      disposeMsgGesture();

      const pointerId = e.pointerId;
      const g = {
        startX: e.clientX,
        startY: e.clientY,
        movedPastSlop: false,
        longPressActivated: false,
      };

      let longPressTimer: number | undefined;

      longPressTimer = window.setTimeout(() => {
        if (g.movedPastSlop) return;
        g.longPressActivated = true;
        longPressTimer = undefined;
        setMsgActionsOpenId(m.id);
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
        } catch {
          /* ignore */
        }
      }, TEAM_CHAT_MSG_LONG_PRESS_MS) as unknown as number;

      const clearLongPressTimer = () => {
        if (longPressTimer !== undefined) {
          window.clearTimeout(longPressTimer);
          longPressTimer = undefined;
        }
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - g.startX;
        const dy = ev.clientY - g.startY;
        if (!g.movedPastSlop && Math.hypot(dx, dy) > TEAM_CHAT_MSG_POINTER_SLOP_PX) {
          g.movedPastSlop = true;
          clearLongPressTimer();
        }
      };

      let dispose: () => void;

      const onEnd = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        dispose();
      };

      dispose = () => {
        if (msgGestureDisposeRef.current !== dispose) return;
        msgGestureDisposeRef.current = null;
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerup', onEnd, true);
        document.removeEventListener('pointercancel', onEnd, true);
        clearLongPressTimer();
      };

      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onEnd, true);
      document.addEventListener('pointercancel', onEnd, true);
      msgGestureDisposeRef.current = dispose;
    },
    [disposeMsgGesture]
  );

  /** Tap outside closes message menu without blocking scrolling. */
  useEffect(() => {
    if (msgActionsOpenId == null) return;
    const onDocPointerDown = (ev: PointerEvent) => {
      const el = ev.target as HTMLElement | null;
      if (el?.closest?.('[data-tenant-chat-msg-menu="true"]')) return;
      setMsgActionsOpenId(null);
    };
    document.addEventListener('pointerdown', onDocPointerDown, true);
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true);
  }, [msgActionsOpenId]);

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const forwardCaptionRef = useRef<HTMLTextAreaElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  /** Inner transcript column — height grows when images load; observed so tail-follow sees scrollHeight changes. */
  const messagesScrollContentRef = useRef<HTMLDivElement>(null);
  /** Server-aligned read cursor for the open thread (advances only forward). */
  const readCursorRef = useRef(0);
  const prevThreadIdForReadCursorRef = useRef<number | null>(null);
  const pendingMarkReadIdRef = useRef(0);
  const markReadDebounceTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;
  const [threadScrollFab, setThreadScrollFab] = useState({ show: false, peerBelow: 0 });
  /** Last message id in the open thread — used to stick scroll to bottom when “live” tail grows. */
  const lastMessageTailIdForScrollRef = useRef<number | null>(null);
  /**
   * True while the user is following the live tail (last scroll was at/near bottom). After a new
   * message renders, scrollHeight grows but scrollTop is unchanged, so isNearThreadScrollBottom
   * alone would be false until we jump — this ref keeps tail-follow working.
   */
  const pinnedToBottomRef = useRef(true);
  /**
   * After sending an attachment, keep snapping the tail until intrinsic media size is known.
   * Otherwise a transient scroll event can clear pinnedToBottomRef before onLoad, and onIntrinsicLayout bails.
   */
  const pendingTailSnapAfterMediaRef = useRef(false);
  /** Max composer height (px) before scrolling; still shows full text via internal scroll. */
  const COMPOSER_MAX_H = 240;

  const convQuery = useQuery({
    queryKey: ['tenant-chat-conversations'],
    queryFn: () => getTenantChatConversationsAPI(),
    refetchInterval: 8000,
  });

  const eligibleQuery = useQuery({
    queryKey: ['tenant-chat-eligible-users'],
    queryFn: () => getTenantChatEligibleUsersAPI(),
    enabled: newChatOpen,
  });

  const messagesQuery = useQuery({
    queryKey: ['tenant-chat-messages', selectedId],
    queryFn: () =>
      getTenantChatMessagesAPI(selectedId!, {
        ordering: 'created_at',
        page_size: 100,
      }),
    enabled: selectedId != null,
    /** Faster poll while a thread is open so new messages appear quickly (was 5s). */
    refetchInterval: () =>
      typeof document !== 'undefined' && document.hidden ? false : 1500,
  });

  const peerPresenceQuery = useQuery({
    queryKey: ['tenant-chat-peer-presence', selectedId],
    queryFn: async () => {
      if (selectedId == null) throw new Error('no conversation');
      try {
        return await getTenantChatPeerPresenceAPI(selectedId);
      } catch {
        return { peer_user_id: 0, activity: null as TenantChatPeerPresenceAction | null };
      }
    },
    enabled: selectedId != null,
    refetchInterval: () =>
      typeof document !== 'undefined' && document.hidden ? false : 1200,
  });

  const startConvMutation = useMutation({
    mutationFn: (withUserId: number) => startTenantChatConversationAPI(withUserId),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-chat-conversations'] });
      setSelectedId(conv.id);
      setNewChatOpen(false);
    },
  });

  const sendMutation = useMutation({
    mutationFn: (vars: {
      convId: number;
      body: string;
      file?: File;
      replyToMessageId?: number;
      forwardFromMessageId?: number;
    }) => {
      if (vars.file) {
        return sendTenantChatMessageWithAttachmentAPI(vars.convId, vars.file, {
          body: vars.body || undefined,
          replyToMessageId: vars.replyToMessageId,
        });
      }
      return sendTenantChatMessageAPI(vars.convId, vars.body, {
        replyToMessageId: vars.replyToMessageId,
        forwardFromMessageId: vars.forwardFromMessageId,
      });
    },
    onSuccess: async (_data, vars) => {
      if (vars.file) pendingTailSnapAfterMediaRef.current = true;
      await queryClient.invalidateQueries({ queryKey: ['tenant-chat-messages', vars.convId] });
      await queryClient.invalidateQueries({ queryKey: ['tenant-chat-conversations'] });
      setDraft('');
      setPendingAttachment(null);
      setReplyToMessage(null);
      /** Double rAF: first paint after React commits refetched messages, then layout (incl. placeholder). */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const sc = messagesScrollRef.current;
          if (sc) {
            sc.scrollTop = sc.scrollHeight;
            pinnedToBottomRef.current = true;
            processThreadScrollRef.current();
          }
          composerRef.current?.focus({ preventScroll: true });
        });
      });
    },
    onError: () => {
      pendingTailSnapAfterMediaRef.current = false;
    },
  });

  const forwardMutation = useMutation({
    mutationFn: (vars: { targetConvId: number; forwardFromMessageId: number; body: string }) =>
      sendTenantChatMessageAPI(vars.targetConvId, vars.body, {
        forwardFromMessageId: vars.forwardFromMessageId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-chat-conversations'] });
      setForwardSourceId(null);
      setForwardCaption('');
    },
  });

  useEffect(() => {
    if (selectedId == null) {
      setDraftTypingSignal(false);
      return;
    }
    if (!draft.trim()) {
      setDraftTypingSignal(false);
      return;
    }
    const tid = window.setTimeout(() => setDraftTypingSignal(true), 550);
    return () => window.clearTimeout(tid);
  }, [draft, selectedId]);

  const derivedLocalPresence = useMemo((): TenantChatPeerPresenceAction => {
    if (voiceRecording) return 'recording_voice';
    if (compressingAttachment || pendingAttachment) return 'uploading_media';
    if (sendMutation.isPending && sendMutation.variables?.file) return 'uploading_media';
    if (sendMutation.isPending) return 'sending_message';
    if (draftTypingSignal && draft.trim()) return 'typing';
    return 'idle';
  }, [
    voiceRecording,
    compressingAttachment,
    pendingAttachment,
    sendMutation.isPending,
    sendMutation.variables,
    draftTypingSignal,
    draft,
  ]);

  useEffect(() => {
    if (selectedId == null) return;
    const convId = selectedId;
    const post = (a: TenantChatPeerPresenceAction) => {
      void postTenantChatPeerPresenceAPI(convId, a).catch(() => {});
    };
    post(derivedLocalPresence);
    const interval =
      derivedLocalPresence === 'idle'
        ? undefined
        : window.setInterval(() => post(derivedLocalPresence), 3200);
    return () => {
      if (interval) window.clearInterval(interval);
      if (derivedLocalPresence !== 'idle') post('idle');
    };
  }, [selectedId, derivedLocalPresence]);

  const conversations = convQuery.data?.results ?? [];
  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const messages: TenantChatMessage[] = useMemo(() => {
    const raw = messagesQuery.data?.results ?? [];
    return [...raw].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messagesQuery.data]);

  const messagesByDay = useMemo(() => {
    const groups: { dayKey: string; dayStart: Date; messages: TenantChatMessage[] }[] = [];
    for (const m of messages) {
      const d = new Date(m.created_at);
      const start = startOfLocalDay(d);
      const key = dayKeyFromDate(d);
      const last = groups[groups.length - 1];
      if (last && last.dayKey === key) {
        last.messages.push(m);
      } else {
        groups.push({ dayKey: key, dayStart: start, messages: [m] });
      }
    }
    return groups;
  }, [messages]);

  /** Refresh “Today” / “Yesterday” when the thread loads or updates. */
  const daySeparatorClock = useMemo(() => new Date(), [messages]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0),
    [conversations]
  );

  const currentUserId = currentUser?.id ?? null;

  const peerPresenceLabel = useMemo(() => {
    const other = selected?.other_user;
    const act = peerPresenceQuery.data?.activity;
    if (!other || !act) return null;
    const name = peerDisplayName(other);
    const fill = (key: string) => t(key).replace(/\{name\}/g, name);
    if (act === 'typing') return fill('teamChatPeerTyping');
    if (act === 'uploading_media') return fill('teamChatPeerUploading');
    if (act === 'recording_voice') return fill('teamChatPeerRecording');
    if (act === 'sending_message') return fill('teamChatPeerSending');
    return null;
  }, [peerPresenceQuery.data?.activity, selected?.other_user, t]);

  useEffect(() => {
    if (selectedId == null) {
      prevThreadIdForReadCursorRef.current = null;
      return;
    }
    const row = conversations.find((c) => c.id === selectedId);
    const srv = row?.last_read_message_id ?? 0;
    if (prevThreadIdForReadCursorRef.current !== selectedId) {
      readCursorRef.current = srv;
      prevThreadIdForReadCursorRef.current = selectedId;
    } else {
      readCursorRef.current = Math.max(readCursorRef.current, srv);
    }
  }, [selectedId, conversations]);

  const openActionsMessage = useMemo(() => {
    if (msgActionsOpenId == null) return null;
    return messages.find((x) => x.id === msgActionsOpenId) ?? null;
  }, [messages, msgActionsOpenId]);

  const floatingMenuFallbackGeom = useMemo(() => {
    if (typeof document === 'undefined' || msgActionsOpenId == null) return null;
    const anchor = document.getElementById(`tenant-chat-msg-${msgActionsOpenId}`);
    const msg = messages.find((x) => x.id === msgActionsOpenId);
    if (!anchor || !msg) return null;
    const mine = currentUserId != null && msg.sender?.id === currentUserId;
    return computeMsgFloatingMenuGeom(anchor.getBoundingClientRect(), mine, null);
  }, [msgActionsOpenId, messages, currentUserId]);

  const displayFloatingMenuGeom = msgActionsMenuPos ?? floatingMenuFallbackGeom;

  useEffect(() => {
    if (msgActionsOpenId == null) setMsgActionsMenuPos(null);
  }, [msgActionsOpenId]);

  const recalcMsgActionsMenuPos = useCallback(() => {
    if (msgActionsOpenId == null) return;
    const anchor = document.getElementById(`tenant-chat-msg-${msgActionsOpenId}`) as HTMLElement | null;
    const msg = messages.find((x) => x.id === msgActionsOpenId);
    if (!anchor || !msg) return;
    const mine = currentUserId != null && msg.sender?.id === currentUserId;
    setMsgActionsMenuPos(
      computeMsgFloatingMenuGeom(anchor.getBoundingClientRect(), mine, msgActionsMenuPortalRef.current)
    );
  }, [currentUserId, messages, msgActionsOpenId]);

  useLayoutEffect(() => {
    if (msgActionsOpenId == null) return;
    recalcMsgActionsMenuPos();
    const anchor = document.getElementById(`tenant-chat-msg-${msgActionsOpenId}`) as HTMLElement | null;
    const scrollParent = nearestOverflowScrollParent(anchor);
    scrollParent?.addEventListener('scroll', recalcMsgActionsMenuPos, { passive: true });
    window.addEventListener('resize', recalcMsgActionsMenuPos);
    window.addEventListener('scroll', recalcMsgActionsMenuPos, true);

    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      recalcMsgActionsMenuPos();
      raf2 = requestAnimationFrame(() => recalcMsgActionsMenuPos());
    });

    let ro: ResizeObserver | undefined;
    const rafRo = requestAnimationFrame(() => {
      const portalEl = msgActionsMenuPortalRef.current;
      if (portalEl) {
        ro = new ResizeObserver(() => recalcMsgActionsMenuPos());
        ro.observe(portalEl);
      }
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      cancelAnimationFrame(rafRo);
      scrollParent?.removeEventListener('scroll', recalcMsgActionsMenuPos);
      window.removeEventListener('resize', recalcMsgActionsMenuPos);
      window.removeEventListener('scroll', recalcMsgActionsMenuPos, true);
      ro?.disconnect();
    };
  }, [msgActionsOpenId, openActionsMessage, recalcMsgActionsMenuPos]);

  useEffect(() => {
    if (markReadDebounceTimerRef.current) {
      window.clearTimeout(markReadDebounceTimerRef.current);
      markReadDebounceTimerRef.current = null;
    }
    pendingMarkReadIdRef.current = 0;
    setReplyToMessage(null);
    setMsgActionsOpenId(null);
    setForwardSourceId(null);
    setForwardCaption('');
    setPendingAttachment(null);
    setMicError(null);
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === 'recording') {
      try {
        mr.stop();
      } catch {
        //
      }
    }
    recordStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    recordStreamRef.current = null;
    mediaRecorderRef.current = null;
    setVoiceRecording(false);
    setThreadScrollFab({ show: false, peerBelow: 0 });
    lastMessageTailIdForScrollRef.current = null;
    pinnedToBottomRef.current = true;
    pendingTailSnapAfterMediaRef.current = false;
  }, [selectedId]);

  const pinnedInThread = selected?.pinned_messages ?? [];

  /** Matches conversation-row unread badge: max of in-viewport peer-below count and server unread. */
  const threadFabUnreadCount = Math.max(
    threadScrollFab.peerBelow,
    selected?.unread_count ?? 0
  );

  const processThreadScroll = useCallback(() => {
    if (selectedId == null || currentUserId == null || messagesQuery.isLoading) {
      setThreadScrollFab((p) => (p.show === false && p.peerBelow === 0 ? p : { show: false, peerBelow: 0 }));
      return;
    }
    const sc = messagesScrollRef.current;
    if (!sc || messages.length === 0) {
      setThreadScrollFab((p) => (p.show === false && p.peerBelow === 0 ? p : { show: false, peerBelow: 0 }));
      return;
    }
    const last = messages[messages.length - 1];
    const near = isNearThreadScrollBottom(sc);
    const peerBelow = near
      ? 0
      : countPeerMessagesBelowViewport(sc, messages, currentUserId, readCursorRef.current);
    setThreadScrollFab((prev) => {
      const next = { show: !near, peerBelow };
      if (prev.show === next.show && prev.peerBelow === next.peerBelow) return prev;
      return next;
    });

    const markTarget = near ? last.id : maxIntersectingTenantMessageId(sc, messages);
    if (markTarget == null || markTarget <= readCursorRef.current) return;

    pendingMarkReadIdRef.current = Math.max(pendingMarkReadIdRef.current, markTarget);
    if (markReadDebounceTimerRef.current) window.clearTimeout(markReadDebounceTimerRef.current);
    markReadDebounceTimerRef.current = window.setTimeout(() => {
      markReadDebounceTimerRef.current = null;
      const pid = pendingMarkReadIdRef.current;
      pendingMarkReadIdRef.current = 0;
      const sid = selectedIdRef.current;
      if (sid == null || pid <= 0 || pid <= readCursorRef.current) return;
      markTenantChatReadAPI(sid, pid)
        .then((d) => {
          readCursorRef.current = d.last_read_message_id ?? pid;
          queryClient.invalidateQueries({ queryKey: ['tenant-chat-conversations'] });
          requestAnimationFrame(() => processThreadScrollRef.current());
        })
        .catch(() => {});
    }, 160);
  }, [currentUserId, messages, messagesQuery.isLoading, queryClient, selectedId]);

  const processThreadScrollRef = useRef(processThreadScroll);
  processThreadScrollRef.current = processThreadScroll;

  /** After media intrinsic size is known, snap tail if user was following it or we just sent this attachment. */
  const onChatMediaIntrinsicLayout = useCallback(() => {
    const sc = messagesScrollRef.current;
    if (!sc) return;
    const pending = pendingTailSnapAfterMediaRef.current;
    if (!pending && !pinnedToBottomRef.current && !isNearThreadScrollBottom(sc)) return;
    sc.scrollTop = sc.scrollHeight;
    pinnedToBottomRef.current = true;
    pendingTailSnapAfterMediaRef.current = false;
    processThreadScrollRef.current();
  }, []);

  const scrollToMessageAnchor = (messageId: number) => {
    document.getElementById(`tenant-chat-msg-${messageId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    setMsgActionsOpenId(null);
    window.setTimeout(() => processThreadScrollRef.current(), 450);
  };

  /**
   * After new messages paint, scrollHeight grows but scrollTop stays fixed, so the viewport is no
   * longer within THREAD_SCROLL_NEAR_BOTTOM_PX of the new bottom. Use pinnedToBottomRef (updated on
   * scroll) so tail-follow still works. Runs before processThreadScroll so FAB / read cursor see
   * the corrected position in the same frame.
   */
  useLayoutEffect(() => {
    if (selectedId == null || messagesQuery.isLoading) return;
    const sc = messagesScrollRef.current;
    if (!sc || messages.length === 0) {
      lastMessageTailIdForScrollRef.current = null;
      return;
    }
    const lastId = messages[messages.length - 1].id;
    const prevTail = lastMessageTailIdForScrollRef.current;
    lastMessageTailIdForScrollRef.current = lastId;
    if (prevTail == null) {
      if (pinnedToBottomRef.current) {
        sc.scrollTop = sc.scrollHeight;
        pinnedToBottomRef.current = true;
      }
      return;
    }
    if (lastId === prevTail) {
      if (pendingTailSnapAfterMediaRef.current) {
        sc.scrollTop = sc.scrollHeight;
        pinnedToBottomRef.current = true;
        requestAnimationFrame(() => processThreadScrollRef.current());
      }
      return;
    }
    if (!pinnedToBottomRef.current && !isNearThreadScrollBottom(sc) && !pendingTailSnapAfterMediaRef.current)
      return;
    sc.scrollTop = sc.scrollHeight;
    pinnedToBottomRef.current = true;
  }, [messages, selectedId, messagesQuery.isLoading]);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => processThreadScroll());
    return () => cancelAnimationFrame(id);
  }, [messages, selectedId, messagesQuery.isLoading, processThreadScroll]);

  useEffect(() => {
    const sc = messagesScrollRef.current;
    if (!sc) return;
    const onScroll = () => {
      pinnedToBottomRef.current = isNearThreadScrollBottom(sc);
      processThreadScroll();
    };
    sc.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      if (pinnedToBottomRef.current || pendingTailSnapAfterMediaRef.current) {
        sc.scrollTop = sc.scrollHeight;
      }
      processThreadScroll();
    });
    ro.observe(sc);
    const inner = messagesScrollContentRef.current;
    if (inner) ro.observe(inner);
    return () => {
      sc.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [processThreadScroll, selectedId, messages.length, messagesQuery.isLoading]);

  const scrollThreadToBottom = useCallback(() => {
    const sc = messagesScrollRef.current;
    if (!sc) return;
    pinnedToBottomRef.current = true;
    sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
    window.setTimeout(() => processThreadScrollRef.current(), 420);
  }, []);

  /** Instant jump to tail when sending while scrolled up. */
  const scrollThreadToEndIfNotNearBottom = useCallback(() => {
    const sc = messagesScrollRef.current;
    if (!sc) return;
    if (!isNearThreadScrollBottom(sc)) sc.scrollTop = sc.scrollHeight;
  }, []);

  const adjustAutosizeTextArea = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_H)}px`;
  }, []);

  const adjustComposerHeight = useCallback(() => {
    adjustAutosizeTextArea(composerRef.current);
  }, [adjustAutosizeTextArea]);

  const adjustForwardCaptionHeight = useCallback(() => {
    adjustAutosizeTextArea(forwardCaptionRef.current);
  }, [adjustAutosizeTextArea]);

  useEffect(() => {
    adjustComposerHeight();
  }, [draft, adjustComposerHeight]);

  useEffect(() => {
    adjustForwardCaptionHeight();
  }, [forwardCaption, adjustForwardCaptionHeight]);

  useEffect(() => {
    if (forwardSourceId != null) {
      queueMicrotask(() => adjustForwardCaptionHeight());
    }
  }, [forwardSourceId, adjustForwardCaptionHeight]);

  useEffect(() => {
    if (msgActionsOpenId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMsgActionsOpenId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [msgActionsOpenId]);

  const stopVoiceRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === 'recording') {
      try {
        mr.stop();
      } catch {
        //
      }
    }
  }, []);

  const startVoiceRecording = useCallback(async () => {
    if (!selectedId || voiceRecording || sendMutation.isPending) return;
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      mediaChunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 })
        : new MediaRecorder(stream, { audioBitsPerSecond: 64000 });
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) mediaChunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        recordStreamRef.current = null;
        mediaRecorderRef.current = null;
        setVoiceRecording(false);
        const chunks = mediaChunksRef.current.slice();
        mediaChunksRef.current = [];
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        if (blob.size > 0) {
          setPendingAttachment(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type }));
        }
      };
      mediaRecorderRef.current = mr;
      mr.start(400);
      setVoiceRecording(true);
      window.setTimeout(() => {
        stopVoiceRecording();
      }, 4 * 60 * 1000);
    } catch {
      setMicError(t('teamChatMicDenied'));
      setVoiceRecording(false);
    }
  }, [selectedId, sendMutation.isPending, stopVoiceRecording, t, voiceRecording]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedId || sendMutation.isPending) return;
    const text = draft.trim();
    if (!text && !pendingAttachment) return;
    scrollThreadToEndIfNotNearBottom();
    let file = pendingAttachment;
    if (file && file.type.startsWith('image/') && file.type !== 'image/gif') {
      setCompressingAttachment(true);
      try {
        file = await compressImageForChat(file);
      } catch {
        //
      } finally {
        setCompressingAttachment(false);
      }
    }
    if (file) {
      sendMutation.mutate({
        convId: selectedId,
        body: text,
        file,
        replyToMessageId: replyToMessage?.id,
      });
    } else {
      sendMutation.mutate({
        convId: selectedId,
        body: text,
        replyToMessageId: replyToMessage?.id,
      });
    }
  };

  const handlePinMessage = async (messageId: number) => {
    if (!selectedId) return;
    try {
      await pinTenantChatMessageAPI(selectedId, messageId);
      queryClient.invalidateQueries({ queryKey: ['tenant-chat-conversations'] });
    } finally {
      setMsgActionsOpenId(null);
    }
  };

  const handleUnpinMessage = async (messageId: number) => {
    if (!selectedId) return;
    try {
      await unpinTenantChatMessageAPI(selectedId, messageId);
      queryClient.invalidateQueries({ queryKey: ['tenant-chat-conversations'] });
    } catch {
      //
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();
    handleSend();
  };

  const shellClass =
    'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm dark:shadow-none overflow-hidden';

  /** Empty: align placeholder with UI lang. Typing: auto like Telegram (first strong char sets paragraph direction). */
  const composerDir = draft.length > 0 ? 'auto' : language === 'ar' ? 'rtl' : 'ltr';
  const forwardCaptionDir =
    forwardCaption.length > 0 ? 'auto' : language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (variant !== 'dialog' || !onClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (newChatOpen || forwardSourceId != null) return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [variant, onClose, newChatOpen, forwardSourceId]);

  const shellMinH =
    variant === 'dialog' ? 'min-h-[260px] lg:min-h-[420px]' : 'min-h-[420px] lg:min-h-[580px]';
  const shellMaxH =
    variant === 'dialog' ? 'lg:max-h-[calc(90vh-8.5rem)]' : 'lg:max-h-[calc(100vh-13rem)]';

  const chatBody = (
    <>
      {(convQuery.isError || messagesQuery.isError) && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 dark:border-red-800/80 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 px-4 py-3 text-sm"
        >
          {t('teamChatCouldNotLoad')}
        </div>
      )}

      <div className={`flex flex-col lg:flex-row ${shellMinH} ${shellMaxH} ${shellClass}`}>
        {/* Conversation list */}
        <aside className="flex w-full flex-col border-b border-gray-200 dark:border-gray-700 lg:w-[300px] lg:shrink-0 lg:border-b-0 lg:border-e bg-gradient-to-b from-gray-50/90 to-white dark:from-gray-900/80 dark:to-gray-800 max-h-[45vh] lg:max-h-none">
          <div className="border-b border-gray-200/80 dark:border-gray-700 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('teamChat') || 'Team Chat'}
              </p>
              {totalUnread > 0 ? (
                <span
                  className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white tabular-nums"
                  aria-label={t('teamChatUnreadAria')}
                >
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              variant="primary"
              className="w-full justify-center rounded-lg text-sm shadow-sm shadow-primary/25"
              onClick={() => setNewChatOpen(true)}
            >
              {t('teamChatNewConversation')}
            </Button>
          </div>
          <div className="custom-scrollbar flex-1 overflow-y-auto">
            {convQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                {t('searchEllipsis')}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
                  <ChatBubbleIcon className="size-6" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('teamChatSelectThread')}</p>
              </div>
            ) : (
              <ul className="space-y-1.5 px-2 py-2">
                {conversations.map((c) => {
                  const active = c.id === selectedId;
                  const hasUnread = (c.unread_count ?? 0) > 0;
                  const peer = c.other_user;
                  const label = peerDisplayName(peer);
                  const previewFull = c.last_message?.body || '';
                  const preview = previewFull.slice(0, 80);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2.5 text-start shadow-sm transition-all duration-200 ${
                          active
                            ? 'border-primary/35 bg-gradient-to-br from-primary/[0.12] to-primary/[0.06] ring-1 ring-primary/20 dark:from-primary/20 dark:to-primary/10 dark:ring-primary/25'
                            : 'border-gray-200/90 bg-white/90 hover:border-gray-300 hover:bg-white dark:border-gray-600 dark:bg-gray-900/40 dark:hover:border-gray-500 dark:hover:bg-gray-800/90'
                        }`}
                      >
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold shadow-inner ${
                            active
                              ? 'bg-primary text-white shadow-md shadow-primary/30'
                              : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200/80 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600'
                          }`}
                        >
                          {peerInitials(peer)}
                        </span>
                        <span className={`flex min-w-0 flex-1 items-start gap-2 ${peerRowTextAlign}`}>
                          <span className="min-w-0 flex-1">
                          <ChatText
                            className={`block truncate text-gray-900 dark:text-gray-100 ${hasUnread ? 'font-semibold' : 'font-normal'}`}
                          >
                            {label}
                          </ChatText>
                          {previewFull.trim() ? (
                            <ChatText
                              className={`mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400 ${hasUnread ? 'font-semibold' : 'font-normal'}`}
                            >
                              {preview}
                              {previewFull.length > 80 ? '…' : ''}
                            </ChatText>
                          ) : (
                            <span className="mt-0.5 block text-xs font-normal italic text-gray-400 dark:text-gray-500">
                              {t('teamChatNoMessagesYet')}
                            </span>
                          )}
                          </span>
                          {(c.unread_count ?? 0) > 0 ? (
                            <span
                              className="mt-0.5 inline-flex min-w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums"
                              aria-label={t('teamChatUnreadAria')}
                            >
                              {(c.unread_count ?? 0) > 99 ? '99+' : c.unread_count}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className="flex min-h-[280px] flex-1 flex-col bg-gray-50/50 dark:bg-gray-950/30">
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner dark:from-primary/25 dark:to-primary/10">
                <ChatBubbleIcon className="size-8 opacity-90" />
              </div>
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-gray-100">{t('teamChatSelectThread')}</p>
                <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{t('teamChatSubtitle')}</p>
              </div>
            </div>
          ) : (
            /* dir=ltr: incoming left / outgoing right regardless of app RTL; message text uses dir=auto inside */
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col" dir="ltr" lang="und">
              <header className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white/90 px-4 py-3 backdrop-blur-sm dark:bg-gray-900/90">
                {selected ? (
                  <>
                    <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-sm font-bold text-white shadow-md shadow-primary/25">
                      {peerInitials(selected.other_user)}
                      {selected.other_user.is_online ? (
                        <span
                          className="absolute -bottom-0.5 -end-0.5 size-3 rounded-full border-2 border-white bg-emerald-400 shadow-sm dark:border-gray-900"
                          title={t('online')}
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                        <ChatText>{peerDisplayName(selected.other_user)}</ChatText>
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="capitalize" dir="auto">
                          {selected.other_user.role}
                        </span>
                        <span className="mx-1.5 text-gray-400 dark:text-gray-500">·</span>
                        {selected.other_user.is_online ? (
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">{t('online')}</span>
                        ) : (
                          <span dir="ltr">
                            {t('lastSeen')} {formatLastSeenRelative(selected.other_user.last_seen_at, t)}
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                ) : null}
              </header>

              {pinnedInThread.length > 0 ? (
                <div className="border-b border-gray-200/80 bg-white/85 px-3 py-2 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/85">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('teamChatPinnedHeader')}
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {pinnedInThread.map((pin) => (
                      <div
                        key={pin.pin_id}
                        className="flex max-w-[220px] shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 py-1 pe-1 ps-3 text-xs shadow-sm dark:border-gray-600 dark:bg-gray-800"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-start text-gray-800 dark:text-gray-100"
                          onClick={() => scrollToMessageAnchor(pin.message_id)}
                        >
                          <span className="font-semibold">{peerDisplayName(pin.sender)}:</span> {pin.body}
                        </button>
                        <button
                          type="button"
                          className="shrink-0 rounded-full p-1 leading-none text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                          onClick={() => void handleUnpinMessage(pin.message_id)}
                          aria-label={t('teamChatUnpin')}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {peerPresenceLabel ? (
                <div
                  className="border-b border-gray-200/70 bg-gray-50/95 px-4 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-400"
                  role="status"
                  aria-live="polite"
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                >
                  <span className="font-medium text-gray-800 dark:text-gray-200">{peerPresenceLabel}</span>
                </div>
              ) : null}

              <div className="relative flex min-h-0 flex-1 flex-col">
                <div
                  ref={messagesScrollRef}
                  className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-100/80 via-gray-50 to-transparent px-3 py-4 dark:from-gray-900 dark:via-gray-950 dark:to-transparent sm:px-5"
                >
                {messagesQuery.isLoading ? (
                  <div className="flex justify-center py-12">
                    <span className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
                    <ChatBubbleIcon className="mb-2 size-8 opacity-40" />
                    {t('teamChatNoMessagesYet')}
                  </div>
                ) : (
                  <div ref={messagesScrollContentRef} className="mx-auto flex max-w-3xl flex-col gap-3">
                    {messagesByDay.map((group) => (
                      <section key={group.dayKey} className="flex flex-col gap-3">
                        <div className="sticky top-2 z-10 flex justify-center py-1 pointer-events-none">
                          <time
                            dateTime={group.dayKey}
                            className="rounded-full bg-gray-900/40 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/95 shadow-md backdrop-blur-md ring-1 ring-black/10 dark:bg-black/50 dark:text-gray-100 dark:ring-white/10"
                          >
                            {formatChatDaySeparator(group.dayStart, daySeparatorClock, language, t)}
                          </time>
                        </div>
                        <div className="flex flex-col gap-3">
                          {group.messages.map((m) => {
                            const mine = currentUserId != null && m.sender?.id === currentUserId;
                            const bubbleBase = mine
                              ? 'rounded-br-md bg-gradient-to-br from-primary to-primary/90 text-white shadow-md shadow-primary/20'
                              : 'rounded-bl-md border border-gray-200/90 bg-white text-gray-900 shadow-md dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';
                            const quoteMine = mine
                              ? 'border-white/65 bg-black/15 text-white'
                              : 'border-primary bg-primary/[0.08] dark:bg-primary/15';
                            return (
                              <div
                                key={m.id}
                                className={`group flex min-w-0 w-full touch-pan-y ${mine ? 'justify-end' : 'justify-start'}`}
                                onDoubleClick={(e) => {
                                  e.preventDefault();
                                  setReplyToMessage(m);
                                  setMsgActionsOpenId(null);
                                }}
                              >
                                <div
                                  id={`tenant-chat-msg-${m.id}`}
                                  className="relative max-w-[min(85%,28rem)] touch-manipulation [-webkit-touch-callout:none]"
                                  role="presentation"
                                  onPointerDown={(e) => attachMsgPointerDown(m, e)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    disposeMsgGesture();
                                    setMsgActionsOpenId((id) => (id === m.id ? null : m.id));
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="absolute start-0 top-0 z-[70] m-0 h-px w-px overflow-hidden border-0 p-0 opacity-0 focus-visible:h-auto focus-visible:w-auto focus-visible:overflow-visible focus-visible:rounded-md focus-visible:border focus-visible:border-gray-300 focus-visible:bg-white focus-visible:px-2 focus-visible:py-1 focus-visible:text-xs focus-visible:text-gray-900 focus-visible:opacity-100 dark:focus-visible:border-gray-600 dark:focus-visible:bg-gray-800 dark:focus-visible:text-gray-100"
                                    aria-haspopup="menu"
                                    aria-expanded={msgActionsOpenId === m.id}
                                    aria-label={t('teamChatOpenMessageMenu')}
                                    data-tenant-chat-msg-menu="true"
                                    onClick={() => setMsgActionsOpenId((id) => (id === m.id ? null : m.id))}
                                  />

                                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${bubbleBase}`}>
                                    {!mine && (
                                      <div
                                        className="mb-1 text-xs font-semibold text-primary dark:text-primary-200"
                                        dir="auto"
                                      >
                                        {peerDisplayName(m.sender as TenantChatPeer)}
                                      </div>
                                    )}
                                    {m.forwarded_from ? (
                                      <div
                                        className={
                                          m.body.trim()
                                            ? `mb-3 border-b pb-3 ${mine ? 'border-white/20' : 'border-gray-300/80 dark:border-gray-600'}`
                                            : 'mb-2'
                                        }
                                      >
                                        <p
                                          className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${mine ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}`}
                                        >
                                          {t('teamChatForwarded')}
                                        </p>
                                        <button
                                          type="button"
                                          className={`w-full cursor-pointer rounded-md border-l-4 py-1.5 ps-2 text-start outline-none ring-primary/40 transition-[opacity,box-shadow] hover:opacity-95 focus-visible:ring-2 active:opacity-90 ${quoteMine}`}
                                          aria-label={t('teamChatJumpToForwardedMessage')}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            scrollToMessageAnchor(m.forwarded_from!.id);
                                          }}
                                          onDoubleClick={(e) => e.stopPropagation()}
                                        >
                                          <ChatText className="block text-[11px] leading-relaxed opacity-90 whitespace-pre-wrap break-words">
                                            {tenantChatQuoteLabel(m.forwarded_from, t)}
                                          </ChatText>
                                        </button>
                                      </div>
                                    ) : null}
                                    {m.reply_to ? (
                                      <button
                                        type="button"
                                        className={`mb-2 w-full cursor-pointer rounded-md border-l-4 py-1.5 ps-2 text-start outline-none ring-primary/40 transition-[opacity,box-shadow] hover:opacity-95 focus-visible:ring-2 active:opacity-90 ${quoteMine}`}
                                        aria-label={t('teamChatJumpToQuotedMessage')}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          scrollToMessageAnchor(m.reply_to!.id);
                                        }}
                                        onDoubleClick={(e) => e.stopPropagation()}
                                      >
                                        <ChatText className="block text-[11px] font-semibold opacity-95">
                                          {peerDisplayName(m.reply_to.sender)}
                                        </ChatText>
                                        <ChatText className="mt-0.5 block text-[11px] opacity-90">
                                          {tenantChatQuoteLabel(m.reply_to, t)}
                                        </ChatText>
                                      </button>
                                    ) : null}
                                    {m.attachment_kind && m.attachment_url ? (
                                      <div className="mb-2 w-[min(85vw,28rem)] max-w-full">
                                        <TenantChatBlobMedia
                                          url={m.attachment_url}
                                          kind={m.attachment_kind}
                                          mine={mine}
                                          filename={m.original_filename}
                                          attachmentWidth={m.attachment_width}
                                          attachmentHeight={m.attachment_height}
                                          t={t}
                                          onIntrinsicLayout={onChatMediaIntrinsicLayout}
                                        />
                                      </div>
                                    ) : null}
                                    {m.body.trim() ? (
                                      <div dir="auto" className={`whitespace-pre-wrap break-words ${chatAutoDirClass}`}>
                                        {m.body}
                                      </div>
                                    ) : null}
                                    <div
                                      dir="ltr"
                                      className={`mt-1.5 flex items-center gap-1.5 tabular-nums ${
                                        mine ? 'justify-end text-white/75' : 'justify-start text-gray-400 dark:text-gray-500'
                                      }`}
                                    >
                                      <span className="text-[10px]">
                                        {new Date(m.created_at).toLocaleString(language === 'ar' ? 'ar' : undefined, {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                      {mine ? (
                                        <span
                                          className={`inline-flex shrink-0 items-center ${
                                            m.read_by_peer ? 'text-sky-200' : 'text-white/60'
                                          }`}
                                          title={m.read_by_peer ? t('teamChatRead') : t('teamChatDelivered')}
                                          aria-label={m.read_by_peer ? t('teamChatRead') : t('teamChatDelivered')}
                                        >
                                          {m.read_by_peer ? (
                                            <>
                                              <CheckIcon className="size-3.5" aria-hidden />
                                              <CheckIcon className="size-3.5 -ms-2" aria-hidden />
                                            </>
                                          ) : (
                                            <CheckIcon className="size-3.5" aria-hidden />
                                          )}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
                </div>
                {threadScrollFab.show ? (
                  <button
                    type="button"
                    onClick={scrollThreadToBottom}
                    aria-label={
                      threadFabUnreadCount > 0
                        ? `${t('teamChatScrollToBottom')} (${threadFabUnreadCount})`
                        : t('teamChatScrollToBottom')
                    }
                    className="pointer-events-auto absolute end-4 bottom-4 z-20 flex size-11 items-center justify-center rounded-full bg-gray-900/85 text-white shadow-lg ring-1 ring-black/20 backdrop-blur-sm dark:bg-black/75 dark:ring-white/15"
                  >
                    <ChevronDownIcon className="size-5 shrink-0 opacity-90" aria-hidden />
                    {threadFabUnreadCount > 0 ? (
                      <span
                        className="absolute -top-1.5 left-1/2 flex min-w-[1.25rem] -translate-x-1/2 items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums shadow-sm dark:bg-primary-500"
                        aria-label={t('teamChatUnreadAria')}
                      >
                        {threadFabUnreadCount > 99 ? '99+' : threadFabUnreadCount}
                      </span>
                    ) : null}
                  </button>
                ) : null}
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-gray-200 bg-white/95 p-3 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95 sm:p-4"
              >
                {replyToMessage ? (
                  <div className="mx-auto mb-3 flex max-w-3xl items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.07] px-3 py-2 dark:bg-primary/15">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {t('teamChatReplyingTo')}
                      </p>
                      <p className="truncate text-sm text-gray-800 dark:text-gray-100">
                        {(() => {
                          const snippet = replyTargetSnippet(replyToMessage, t);
                          return (
                            <>
                              {peerDisplayName(replyToMessage.sender)} · {snippet.slice(0, 120)}
                              {snippet.length > 120 ? '…' : ''}
                            </>
                          );
                        })()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyToMessage(null)}
                      className="shrink-0 rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-black/10 dark:text-gray-300 dark:hover:bg-white/10"
                      aria-label={t('teamChatCancelReply')}
                    >
                      ×
                    </button>
                  </div>
                ) : null}
                {pendingAttachment ? (
                  <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800/90">
                    <PaperclipIcon className="size-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-100">
                      {pendingAttachment.name}
                    </span>
                    <button
                      type="button"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-black/10 dark:text-gray-400 dark:hover:bg-white/10"
                      onClick={() => setPendingAttachment(null)}
                      aria-label={t('teamChatClearAttachment')}
                    >
                      ×
                    </button>
                  </div>
                ) : null}
                {compressingAttachment ? (
                  <p className="mx-auto mb-2 max-w-3xl text-center text-xs text-gray-500 dark:text-gray-400">
                    {t('teamChatCompressing')}
                  </p>
                ) : null}
                {micError ? (
                  <p className="mx-auto mb-2 max-w-3xl text-center text-xs text-red-600 dark:text-red-400">{micError}</p>
                ) : null}
                <div className="mx-auto flex w-full max-w-3xl min-w-0 items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setPendingAttachment(f);
                      e.target.value = '';
                    }}
                  />
                  <div
                    className={`flex min-h-11 min-w-0 flex-1 items-end gap-0.5 rounded-[1.35rem] border bg-white px-1 py-1 shadow-sm dark:bg-gray-800/95 dark:shadow-none ${
                      voiceRecording
                        ? 'border-red-400/70 ring-1 ring-red-400/30 dark:border-red-500/50'
                        : 'border-gray-200/95 dark:border-gray-600'
                    }`}
                  >
                    <button
                      type="button"
                      className="flex size-10 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700/80"
                      disabled={sendMutation.isPending || voiceRecording || compressingAttachment}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label={t('teamChatAttach')}
                      title={t('teamChatAttach')}
                    >
                      <PaperclipIcon className="size-[1.35rem]" />
                    </button>
                    <textarea
                      ref={composerRef}
                      rows={1}
                      placeholder={t('teamChatMessagePlaceholder')}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      disabled={sendMutation.isPending || compressingAttachment}
                      autoComplete="off"
                      dir={composerDir}
                      className={`custom-scrollbar m-0 box-border max-h-[min(40vh,15rem)] min-h-10 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0.5 py-2 text-base leading-normal text-gray-900 shadow-none placeholder:text-gray-400 placeholder:text-base focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500 ${chatAutoDirClass}`}
                    />
                    <button
                      type="button"
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                        voiceRecording
                          ? 'bg-red-500/15 text-red-600 animate-pulse dark:bg-red-500/20 dark:text-red-400'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/80'
                      }`}
                      disabled={sendMutation.isPending || compressingAttachment}
                      onClick={() => {
                        if (voiceRecording) stopVoiceRecording();
                        else void startVoiceRecording();
                      }}
                      aria-label={voiceRecording ? t('teamChatStopRecording') : t('teamChatRecordVoice')}
                      title={voiceRecording ? t('teamChatStopRecording') : t('teamChatRecordVoice')}
                    >
                      {voiceRecording ? (
                        <SquareFillIcon className="size-[1.1rem]" />
                      ) : (
                        <MicrophoneIcon className="size-[1.35rem]" />
                      )}
                    </button>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={
                      sendMutation.isPending ||
                      compressingAttachment ||
                      (!draft.trim() && !pendingAttachment)
                    }
                    className="!flex !size-11 shrink-0 !items-center !justify-center !rounded-full !p-0 !min-h-11 !min-w-11 !leading-none shadow-md shadow-primary/30"
                    aria-label={t('teamChatSend')}
                    title={t('teamChatSend')}
                    onMouseDown={(ev) => {
                      if (!sendMutation.isPending && (draft.trim() || pendingAttachment)) ev.preventDefault();
                    }}
                  >
                    <SendPlaneIcon className="size-5" aria-hidden />
                  </Button>
                </div>
                {sendMutation.isError ? (
                  <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-red-600 dark:text-red-400">
                    {t('teamChatCouldNotSend')}
                  </p>
                ) : null}
              </form>

              {typeof document !== 'undefined' &&
              openActionsMessage != null &&
              displayFloatingMenuGeom != null
                ? createPortal(
                    <div
                      ref={msgActionsMenuPortalRef}
                      role="menu"
                      data-tenant-chat-msg-menu="true"
                      dir={language === 'ar' ? 'rtl' : 'ltr'}
                      className="min-w-[10rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-600 dark:bg-gray-800"
                      style={{
                        position: 'fixed',
                        top: displayFloatingMenuGeom.top,
                        left: displayFloatingMenuGeom.left,
                        zIndex: 10000,
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full px-3 py-2 text-start text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setReplyToMessage(openActionsMessage);
                          setMsgActionsOpenId(null);
                        }}
                      >
                        {t('teamChatReply')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full px-3 py-2 text-start text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setForwardSourceId(openActionsMessage.id);
                          setForwardCaption('');
                          setMsgActionsOpenId(null);
                        }}
                      >
                        {t('teamChatForward')}
                      </button>
                      {selectedId != null ? (
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full px-3 py-2 text-start text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                          onClick={() => void handlePinMessage(openActionsMessage.id)}
                        >
                          {t('teamChatPin')}
                        </button>
                      ) : null}
                    </div>,
                    document.body
                  )
                : null}
            </div>
          )}
        </section>
      </div>

      <Modal isOpen={newChatOpen} onClose={() => setNewChatOpen(false)} title={t('teamChatNewConversation')}>
        <div className="max-h-[min(22rem,50vh)] overflow-y-auto custom-scrollbar sm:max-h-96">
          {eligibleQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <span className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (eligibleQuery.data?.results?.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/90 px-5 py-10 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900/60 dark:text-gray-400">
              {t('teamChatNoEligiblePeers')}
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {eligibleQuery.data!.results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="group flex w-full items-center gap-3 rounded-2xl border border-gray-200/90 bg-gradient-to-br from-white to-gray-50/90 px-3.5 py-3 text-start shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 dark:border-gray-600 dark:from-gray-900/90 dark:to-gray-950/80 dark:hover:border-primary/45 dark:hover:shadow-primary/20 disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => startConvMutation.mutate(u.id)}
                    disabled={startConvMutation.isPending}
                  >
                    <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-xs font-bold text-primary shadow-inner ring-1 ring-primary/15 transition-transform group-hover:scale-[1.02] dark:from-primary/30 dark:to-primary/15 dark:text-primary-200 dark:ring-primary/25">
                      {peerInitials(u)}
                      {u.is_online ? (
                        <span
                          className="absolute -bottom-0.5 -end-0.5 size-3 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-900"
                          title={t('online')}
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <span className={`min-w-0 flex-1 ${peerRowTextAlign}`}>
                      <ChatText className="block truncate text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                        {peerDisplayName(u)}
                      </ChatText>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className="inline-flex max-w-full rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600 ring-1 ring-gray-200/80 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600"
                          dir="auto"
                        >
                          {u.role}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {u.is_online ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">{t('online')}</span>
                          ) : (
                            <span dir="ltr">
                              {t('lastSeen')} {formatLastSeenRelative(u.last_seen_at, t)}
                            </span>
                          )}
                        </span>
                      </div>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {startConvMutation.isError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{t('teamChatCouldNotLoad')}</p>
        ) : null}
      </Modal>

      <Modal
        isOpen={forwardSourceId != null}
        onClose={() => {
          setForwardSourceId(null);
          setForwardCaption('');
        }}
        title={t('teamChatForwardTo')}
      >
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('teamChatForwardCaption')}
          </span>
          <textarea
            ref={forwardCaptionRef}
            rows={1}
            placeholder={t('teamChatForwardCaptionPlaceholder')}
            value={forwardCaption}
            onChange={(e) => setForwardCaption(e.target.value)}
            disabled={forwardMutation.isPending}
            autoComplete="off"
            dir={forwardCaptionDir}
            className={`custom-scrollbar m-0 box-border block w-full min-h-11 max-h-[min(40vh,15rem)] resize-none overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-base leading-6 text-gray-900 shadow-sm placeholder:text-gray-400 placeholder:text-base focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 ${chatAutoDirClass}`}
          />
        </label>
        <div className="max-h-72 overflow-y-auto custom-scrollbar">
          {conversations.filter((c) => c.id !== selectedId).length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t('teamChatNoEligiblePeers')}</p>
          ) : (
            <ul className="space-y-2">
              {conversations
                .filter((c) => c.id !== selectedId)
                .map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={forwardMutation.isPending || forwardSourceId == null}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-start text-sm hover:border-primary/40 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-primary/50 disabled:opacity-50"
                      onClick={() => {
                        if (forwardSourceId == null) return;
                        forwardMutation.mutate({
                          targetConvId: c.id,
                          forwardFromMessageId: forwardSourceId,
                          body: forwardCaption.trim(),
                        });
                      }}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                        {peerInitials(c.other_user)}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{peerDisplayName(c.other_user)}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
        {forwardMutation.isError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t('teamChatCouldNotSend')}</p>
        ) : null}
      </Modal>
    </>
  );

  if (variant === 'dialog' && onClose) {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-chat-dialog-title"
          className="flex max-h-[90vh] w-full max-w-[min(72rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="min-w-0">
              <h2 id="team-chat-dialog-title" className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                {t('teamChat')}
              </h2>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{t('teamChatSubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-2xl leading-none text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              aria-label={t('close')}
            >
              ×
            </button>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">{chatBody}</div>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <PageWrapper title={t('teamChat')}>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mb-5 leading-relaxed">{t('teamChatSubtitle')}</p>
      {chatBody}
    </PageWrapper>
  );
};
