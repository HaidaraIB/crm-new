import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ChatBlobMedia } from '../components/chat/ChatBlobMedia';
import { ChatConversationStatusMenu } from '../components/chat/ChatConversationStatusMenu';
import { ChatMediaViewer } from '../components/chat/ChatMediaViewer';
import {
  buildChatMediaAlbum,
  findChatMediaAlbumIndex,
  type ChatMediaAlbumItem,
} from '../components/chat/chatMediaAlbum';
import { ChatPendingAttachmentChip } from '../components/chat/ChatPendingAttachmentChip';
import { ChatVoiceRecordingBar } from '../components/chat/ChatVoiceRecordingBar';
import {
  InboxFilterRail,
  INBOX_CHANNEL_FILTERS,
  INBOX_STATUS_FILTERS,
} from '../components/chat/InboxFilterRail';
import { ConvertConversationModal } from '../components/modals/ConvertConversationModal';
import { AttachmentSourceModal } from '../components/modals/AttachmentSourceModal';
import {
  InstagramIcon,
  MapPinIcon,
  MessengerIcon,
  MicrophoneIcon,
  PaperclipIcon,
  SearchIcon,
  StarIcon,
} from '../components/index';
import { useAppContext } from '../context/AppContext';
import { useChatVoiceRecorder } from '../hooks/useChatVoiceRecorder';
import {
  queryKeys,
  useConvertSocialConversation,
  useMarkSocialConversationRead,
  useSendSocialMedia,
  useSendSocialMessage,
  useSocialConversations,
  useSocialMessages,
  useSocialSendWindow,
  useUpdateSocialConversationState,
} from '../hooks/useQueries';
import { useInvalidateOnSliceChange } from '../hooks/useSliceVersion';
import { useRealtimeConnected } from '../hooks/useRealtimeChannel';
import { getSocialMessageAttachmentUrl } from '../services/api';
import type { SocialConversationPayload, SocialMessagePayload } from '../services/api';
import type { Lead } from '../types';
import { clientLocationMapsUrl } from '../utils/leadLocation';
import { getCompanyViewLeadRoute } from '../utils/routing';
import {
  canConvertSocialConversation,
  isSocialInboxStaffScoped,
} from '../utils/socialInboxAccess';
import {
  WA_ALERT_ERROR,
  WA_ALERT_INFO,
  WA_ALERT_WARN,
  WA_AVATAR,
  WA_BUBBLE_IN,
  WA_BUBBLE_OUT,
  WA_BUBBLE_OUT_FAILED,
  WA_COMPOSER_BG,
  WA_HEADER_BAR,
  WA_HEADER_TEXT,
  WA_INPUT_SHELL,
  WA_LAYOUT_SHELL,
  WA_LIST_ACTIVE,
  WA_LIST_BG,
  WA_LIST_HOVER,
  WA_SEND_BTN,
  WA_THREAD_WALLPAPER,
} from '../components/whatsapp/whatsappChatTheme';

/** Backstop only — the `inbox` sync slice delivers changes sooner. */
const POLL_WHEN_REALTIME_DOWN = 20000;
const POLL_WHEN_REALTIME_UP = 60000;

const COMPOSER_MIN_H_PX = 32;
const COMPOSER_MAX_H_PX = 160;

/** Survives refresh / leaving the page — same idea as WhatsApp messaging tabs. */
const INBOX_FILTERS_STORAGE_KEY = 'crm.socialInboxFilters';

type InboxFiltersPersist = {
  channel: string;
  status: string;
  unreplied: boolean;
};

function loadInboxFilters(): InboxFiltersPersist {
  const defaults: InboxFiltersPersist = { channel: 'all', status: 'all', unreplied: false };
  try {
    const raw = localStorage.getItem(INBOX_FILTERS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<InboxFiltersPersist>;
    const channel =
      typeof parsed.channel === 'string' &&
      INBOX_CHANNEL_FILTERS.some((c) => c.value === parsed.channel)
        ? parsed.channel
        : defaults.channel;
    const status =
      typeof parsed.status === 'string' &&
      (INBOX_STATUS_FILTERS as readonly string[]).includes(parsed.status)
        ? parsed.status
        : defaults.status;
    return {
      channel,
      status,
      unreplied: Boolean(parsed.unreplied),
    };
  } catch {
    return defaults;
  }
}

function saveInboxFilters(next: InboxFiltersPersist) {
  try {
    localStorage.setItem(INBOX_FILTERS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — filters still work for the session.
  }
}

function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function formatTime(iso: string | null | undefined, language: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(language === 'ar' ? 'ar' : 'en', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function humanizeRemaining(expiresAt: string | null, language: string): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return '';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (language === 'ar') {
    return hours > 0 ? `${hours} ساعة ${minutes} دقيقة` : `${minutes} دقيقة`;
  }
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function blobMediaKind(
  kind: string | null
): 'image' | 'video' | 'audio' | 'document' | null {
  if (kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'document') {
    return kind;
  }
  return null;
}

/** Caret/base direction from UI language when empty, else first strong letter. */
function composerTextDir(text: string, uiIsRtl: boolean): 'ltr' | 'rtl' {
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code == null) continue;
    if (
      (code >= 0x0590 && code <= 0x08ff) ||
      (code >= 0xfb1d && code <= 0xfdff) ||
      (code >= 0xfe70 && code <= 0xfeff)
    ) {
      return 'rtl';
    }
    if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0xc0 && code <= 0x24f)
    ) {
      return 'ltr';
    }
  }
  return uiIsRtl ? 'rtl' : 'ltr';
}

const ChannelBadge: React.FC<{ channel: string; className?: string }> = ({ channel, className }) => {
  const Icon = channel === 'instagram' ? InstagramIcon : MessengerIcon;
  return <Icon className={className ?? 'w-3.5 h-3.5'} />;
};

/**
 * Attachment / location block for one bubble.
 * Uses ChatBlobMedia (auth blob cache) when bytes exist; Meta CDN-expired kinds
 * stay as labels because ChatBlobMedia cannot recover them.
 */
const MessageAttachment: React.FC<{
  message: SocialMessagePayload;
  t: (key: string) => string;
  onOpenMedia?: (messageId: number) => void;
}> = ({ message, t, onOpenMedia }) => {
  const outbound = message.direction === 'outbound';
  const lat = message.location_latitude != null ? Number(message.location_latitude) : null;
  const lng = message.location_longitude != null ? Number(message.location_longitude) : null;
  const hasCoords =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const mapsUrl = hasCoords ? clientLocationMapsUrl(`${lat},${lng}`) : null;

  const expiredLabel =
    !message.has_attachment && message.attachment_kind
      ? message.attachment_kind === 'story_mention'
        ? t('storyMention')
        : message.attachment_kind === 'share'
          ? t('sharedPost')
          : message.attachment_kind === 'reel'
            ? t('sharedReel')
            : null
      : null;

  const mediaKind = message.has_attachment ? blobMediaKind(message.attachment_kind) : null;
  const url = mediaKind ? getSocialMessageAttachmentUrl(message.id) : null;

  return (
    <>
      {hasCoords ? (
        <div className="mb-1 w-[min(70vw,16rem)] max-w-full">
          <div
            className={`flex gap-2 rounded-md px-2.5 py-2 ${
              outbound ? 'bg-black/10' : 'bg-black/[0.04] dark:bg-white/5'
            }`}
          >
            <span
              className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                outbound
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}
            >
              <MapPinIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium [unicode-bidi:plaintext]" dir="auto">
                {(message.location_name || '').trim() ||
                  (message.location_address || '').trim() ||
                  t('openInMaps')}
              </p>
              {hasCoords ? (
                <p
                  className={`mt-0.5 font-mono text-[10px] tabular-nums ${
                    outbound ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                  }`}
                  dir="ltr"
                >
                  {lat!.toFixed(5)}, {lng!.toFixed(5)}
                </p>
              ) : null}
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-1 inline-block text-xs font-medium ${
                    outbound ? 'text-white/90 hover:text-white' : 'text-primary hover:underline'
                  }`}
                >
                  {t('openInMaps')}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {expiredLabel ? <div className="text-xs italic opacity-80">{expiredLabel}</div> : null}

      {mediaKind && url ? (
        <div
          className={
            mediaKind === 'audio' ? 'mb-1 w-full min-w-0' : 'mb-1 w-[min(70vw,20rem)] max-w-full'
          }
        >
          <ChatBlobMedia
            url={url}
            kind={mediaKind}
            mine={outbound}
            filename={message.original_filename}
            attachmentWidth={message.attachment_width}
            attachmentHeight={message.attachment_height}
            t={t as any}
            onOpen={
              onOpenMedia && (mediaKind === 'image' || mediaKind === 'video')
                ? () => onOpenMedia(message.id)
                : undefined
            }
          />
        </div>
      ) : null}
    </>
  );
};

export const InboxPage: React.FC = () => {
  const { t, language, currentUser, setCurrentPage, setSelectedLead } = useAppContext();
  const queryClient = useQueryClient();
  const realtimeConnected = useRealtimeConnected();
  const isRtl = language === 'ar';
  const canConvert = canConvertSocialConversation(currentUser);
  const staffScopedInbox = isSocialInboxStaffScoped(currentUser);

  const [filtersInit] = useState(loadInboxFilters);
  const [channel, setChannel] = useState(filtersInit.channel);
  const [status, setStatus] = useState<string>(filtersInit.status);
  const [unreplied, setUnreplied] = useState(filtersInit.unreplied);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [pendingIsVoiceNote, setPendingIsVoiceNote] = useState(false);
  const [attachSourceOpen, setAttachSourceOpen] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [mediaViewer, setMediaViewer] = useState<{
    items: ChatMediaAlbumItem[];
    index: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const listParams = useMemo(
    () => ({
      channel,
      status,
      search: search.trim() || undefined,
      unreplied: unreplied || undefined,
      limit: 100,
    }),
    [channel, status, search, unreplied]
  );

  useEffect(() => {
    saveInboxFilters({ channel, status, unreplied });
  }, [channel, status, unreplied]);

  const pollMs = realtimeConnected ? POLL_WHEN_REALTIME_UP : POLL_WHEN_REALTIME_DOWN;

  // The slice is the primary refresh path; the interval above only covers a
  // dropped socket.
  useInvalidateOnSliceChange('inbox', [
    queryKeys.socialConversations(listParams as Record<string, unknown>),
    queryKeys.socialMessages(selectedId ?? undefined),
  ]);

  const { data: listData, isLoading: listLoading } = useSocialConversations(listParams, {
    refetchInterval: pollMs,
  });
  const conversations: SocialConversationPayload[] = listData?.results ?? [];
  const statusCounts = listData?.status_counts ?? {};

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const { data: threadData, isFetching: threadFetching } = useSocialMessages(
    selectedId ?? undefined,
    { refetchInterval: pollMs }
  );
  const messages: SocialMessagePayload[] = threadData?.results ?? [];
  const threadConversation = threadData?.conversation ?? selected;

  const { data: window } = useSocialSendWindow(selectedId ?? undefined);

  const sendText = useSendSocialMessage();
  const sendMedia = useSendSocialMedia();
  const markRead = useMarkSocialConversationRead();
  const updateState = useUpdateSocialConversationState();
  const convert = useConvertSocialConversation();

  const composerBlocked = window ? !window.open : false;
  const sending = sendText.isPending || sendMedia.isPending;
  const textDir = composerTextDir(draft, isRtl);
  const canSend = Boolean(draft.trim() || pendingAttachment);
  const showMic = !canSend;

  const {
    voiceRecording,
    voicePaused,
    elapsedLabel,
    startVoiceRecording,
    stopVoiceRecording,
    pauseVoiceRecording,
    resumeVoiceRecording,
    cancelVoiceRecording,
  } = useChatVoiceRecorder({
    enabled: !composerBlocked,
    busy: composerBlocked || sending,
    onRecordingComplete: (file) => {
      setPendingAttachment(file);
      setPendingIsVoiceNote(true);
    },
    onError: (key) => setMicError(t(key) || key),
  });

  const mediaAlbum = useMemo(
    () =>
      buildChatMediaAlbum(
        messages.map((m) => ({
          id: m.id,
          kind: m.has_attachment ? m.attachment_kind : null,
          url: m.has_attachment && blobMediaKind(m.attachment_kind)
            ? getSocialMessageAttachmentUrl(m.id)
            : null,
          filename: m.original_filename,
          width: m.attachment_width,
          height: m.attachment_height,
        }))
      ),
    [messages]
  );

  useEffect(() => {
    setMediaViewer(null);
    setPendingAttachment(null);
    setPendingIsVoiceNote(false);
    setDraft('');
    setSendError(null);
    setMicError(null);
  }, [selectedId]);

  // Opening a thread clears its unread badge.
  useEffect(() => {
    if (selectedId && selected && selected.unread_count > 0) {
      markRead.mutate(selectedId);
    }
    // markRead intentionally omitted: including it would re-fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.unread_count]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, selectedId]);

  const resizeComposer = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(Math.max(el.scrollHeight, COMPOSER_MIN_H_PX), COMPOSER_MAX_H_PX);
    el.style.height = `${next}px`;
  };

  useEffect(() => {
    resizeComposer();
  }, [draft]);

  const openMedia = useCallback(
    (messageId: number) => {
      if (!mediaAlbum.length) return;
      setMediaViewer({
        items: mediaAlbum,
        index: findChatMediaAlbumIndex(mediaAlbum, String(messageId)),
      });
    },
    [mediaAlbum]
  );

  const handleSend = useCallback(async () => {
    if (!selectedId || (!draft.trim() && !pendingAttachment)) return;
    if (composerBlocked) return;
    setSendError(null);
    try {
      if (pendingAttachment) {
        const file = pendingAttachment;
        const caption = draft.trim() || undefined;
        const kind = pendingIsVoiceNote
          ? 'audio'
          : file.type.startsWith('image/')
            ? 'image'
            : file.type.startsWith('video/')
              ? 'video'
              : file.type.startsWith('audio/')
                ? 'audio'
                : undefined;
        setDraft('');
        setPendingAttachment(null);
        setPendingIsVoiceNote(false);
        await sendMedia.mutateAsync({
          conversationId: selectedId,
          file,
          text: caption,
          kind,
        });
      } else {
        const text = draft.trim();
        setDraft('');
        await sendText.mutateAsync({ conversationId: selectedId, text });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.socialSendWindow(selectedId) });
    } catch (err: any) {
      const code = err?.code || err?.error?.code;
      setSendError(code ? t(code as any) || err?.message : err?.message || t('socialSendFailed'));
    }
  }, [
    selectedId,
    draft,
    pendingAttachment,
    pendingIsVoiceNote,
    composerBlocked,
    sendText,
    sendMedia,
    queryClient,
    t,
  ]);

  const handleConvert = useCallback(
    async (payload: {
      name: string;
      phone?: string;
      assignedTo: number | null;
      autoAssign: boolean;
      notes?: string;
    }) => {
      if (!selectedId) return;
      setConvertError(null);
      try {
        await convert.mutateAsync({ conversationId: selectedId, ...payload });
        setConvertOpen(false);
      } catch (err: any) {
        const code = err?.code || err?.error?.code;
        setConvertError(code ? t(code as any) || err?.message : err?.message);
      }
    },
    [selectedId, convert, t]
  );

  const toggleStar = useCallback(
    (conversationId: number, starred: boolean, e?: React.MouseEvent) => {
      e?.stopPropagation();
      updateState.mutate({ conversationId, isStarred: starred });
    },
    [updateState]
  );

  const handleThreadStatusChange = useCallback(
    (payload: {
      status?: string;
      snoozedUntil?: string;
      isStarred?: boolean;
      isUnsubscribed?: boolean;
    }) => {
      if (!selectedId) return;
      updateState.mutate({
        conversationId: selectedId,
        status: payload.status,
        snoozedUntil: payload.snoozedUntil,
        isStarred: payload.isStarred,
        isUnsubscribed: payload.isUnsubscribed,
      });
    },
    [selectedId, updateState]
  );

  // Same navigation shape as CallErrorLogsPanel: seed the selected lead, push the
  // company-scoped path, then switch the page.
  const openLead = useCallback(
    (clientId: number, clientName: string) => {
      setSelectedLead({ id: clientId, name: clientName || `#${clientId}` } as Lead);
      const path = currentUser?.company
        ? getCompanyViewLeadRoute(
            currentUser.company.name,
            currentUser.company.domain,
            clientId
          )
        : `/view-lead/${clientId}`;
      globalThis.history.pushState({}, '', path);
      setCurrentPage('ViewLead');
    },
    [currentUser, setCurrentPage, setSelectedLead]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2 sm:p-3 md:p-4">
      <div className="flex shrink-0 items-center gap-2 px-0.5">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl">
          {t('omniChannelInbox')}
        </h1>
      </div>
      <div className="shrink-0 lg:hidden">
        <InboxFilterRail
          channel={channel}
          status={status}
          onChannelChange={setChannel}
          onStatusChange={setStatus}
          statusCounts={statusCounts}
          t={t}
          variant="chips"
        />
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="hidden lg:flex lg:shrink-0">
          <InboxFilterRail
            channel={channel}
            status={status}
            onChannelChange={setChannel}
            onStatusChange={setStatus}
            statusCounts={statusCounts}
            t={t}
            variant="rail"
          />
        </div>
        <div className="min-h-0 min-w-0 flex-1">
          <div className={WA_LAYOUT_SHELL}>
        {/* Conversation list */}
        <div
          className={`${WA_LIST_BG} flex w-full shrink-0 flex-col border-e border-gray-200 dark:border-gray-800 md:w-80`}
        >
          <div className={`${WA_HEADER_BAR} ${WA_HEADER_TEXT}`}>
            <span className="font-semibold">{t('inbox')}</span>
          </div>

          <div className="space-y-2 border-b border-gray-200 p-2 dark:border-gray-800">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  role="switch"
                  checked={unreplied}
                  onChange={(e) => setUnreplied(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${
                    unreplied ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                      unreplied ? 'start-4' : 'start-0.5'
                    }`}
                  />
                </span>
                {t('chatFilterUnreplied')}
              </label>
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              icon={<SearchIcon className="h-4 w-4 text-gray-400" />}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {listLoading && (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>
            )}
            {!listLoading && conversations.length === 0 && (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                <p className="font-medium">{t('noSocialConversations')}</p>
                <p className="mt-1 text-xs">
                  {t(
                    staffScopedInbox
                      ? 'noSocialConversationsHintAssigned'
                      : 'noSocialConversationsHint',
                  )}
                </p>
              </div>
            )}
            {conversations.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`flex w-full items-start gap-3 border-b border-gray-100 p-3 text-start transition-colors dark:border-gray-800 ${WA_LIST_HOVER} ${
                  selectedId === row.id ? WA_LIST_ACTIVE : ''
                }`}
              >
                <div className={WA_AVATAR}>{initialsOf(row.contact.display_name)}</div>
                <div className="min-w-0 flex-1">
                  {/* Name alone on the first line — the converted badge used to
                      sit inline with shrink-0 and ate the whole title in Arabic. */}
                  <div className="flex min-w-0 items-center gap-1.5">
                    <ChannelBadge
                      channel={row.channel}
                      className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-300"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {row.contact.display_name}
                    </span>
                    {row.is_starred ? (
                      <StarIcon className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300">
                    {row.last_message_preview}
                  </p>
                  {row.client ? (
                    <span className="mt-1 inline-block max-w-full truncate rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100">
                      {t('convertedToLead')}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[10px] tabular-nums text-gray-500 dark:text-gray-300">
                    {formatTime(row.last_message_at, language)}
                  </span>
                  {row.unread_count > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {row.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!selected && (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
              <p className="font-medium">{t('selectConversation')}</p>
              <p className="mt-1 text-sm">{t('selectConversationHint')}</p>
            </div>
          )}

          {selected && (
            <>
              <div className={`${WA_HEADER_BAR} ${WA_HEADER_TEXT} justify-between gap-2`}>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ChannelBadge channel={selected.channel} className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate font-semibold">
                    {selected.contact.display_name}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {threadConversation?.client ? (
                    <Button
                      variant="ghost"
                      className="!h-8 !text-white hover:!bg-white/20"
                      onClick={() =>
                        openLead(threadConversation.client!.id, threadConversation.client!.name)
                      }
                    >
                      {t('viewLead')}
                    </Button>
                  ) : canConvert ? (
                    <Button
                      variant="ghost"
                      className="!h-8 !text-white hover:!bg-white/20"
                      onClick={() => {
                        setConvertError(null);
                        setConvertOpen(true);
                      }}
                    >
                      {t('convertToLead')}
                    </Button>
                  ) : null}
                  <ChatConversationStatusMenu
                    t={t}
                    status={selected.status}
                    isStarred={selected.is_starred}
                    isUnsubscribed={selected.is_unsubscribed}
                    onChange={handleThreadStatusChange}
                  />
                </div>
              </div>

              <div className={`${WA_THREAD_WALLPAPER} min-h-0 flex-1 space-y-2 overflow-y-auto p-4`}>
                {threadFetching && messages.length === 0 && (
                  <p className="text-center text-xs text-gray-500">{t('loading')}</p>
                )}
                {messages.map((message) => {
                  const outbound = message.direction === 'outbound';
                  const failed = message.delivery_status === 'failed';
                  return (
                    <div
                      key={message.id}
                      className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] space-y-1 rounded-lg px-3 py-2 text-sm ${
                          outbound ? (failed ? WA_BUBBLE_OUT_FAILED : WA_BUBBLE_OUT) : WA_BUBBLE_IN
                        }`}
                      >
                        <MessageAttachment message={message} t={t} onOpenMedia={openMedia} />
                        {message.body ? (
                          <p className="whitespace-pre-wrap break-words [unicode-bidi:plaintext]" dir="auto">
                            {message.body}
                          </p>
                        ) : null}
                        <div className="flex items-center justify-end gap-1.5 text-[10px] opacity-70">
                          {message.reaction && <span>{message.reaction}</span>}
                          {/* An echo is the business replying from the native app. */}
                          {message.is_echo && <span>· {t('facebookMessenger')}</span>}
                          <span>{formatTime(message.sent_at || message.created_at, language)}</span>
                        </div>
                        {failed && message.delivery_error && (
                          <p className="text-[10px]">{message.delivery_error}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>

              <div className={`${WA_COMPOSER_BG} space-y-1.5 px-2 py-1.5 sm:px-3`}>
                {window && window.mode === 'response' && window.expires_at && (
                  <div className={WA_ALERT_INFO}>
                    {t('replyWindowOpen').replace(
                      '{time}',
                      humanizeRemaining(window.expires_at, language)
                    )}
                  </div>
                )}
                {window && window.mode === 'human_agent' && window.expires_at && (
                  <div className={WA_ALERT_WARN}>
                    {t('replyWindowHumanAgent').replace(
                      '{time}',
                      humanizeRemaining(window.expires_at, language)
                    )}
                  </div>
                )}
                {composerBlocked && (
                  <div className={WA_ALERT_WARN}>
                    <p className="font-semibold">{t('replyWindowClosed')}</p>
                    <p>{t('replyWindowClosedHint')}</p>
                  </div>
                )}
                {sendError && <div className={WA_ALERT_ERROR}>{sendError}</div>}
                {micError ? (
                  <p className="px-0.5 text-[10px] text-red-600 dark:text-red-400">{micError}</p>
                ) : null}

                {pendingAttachment ? (
                  <ChatPendingAttachmentChip
                    file={pendingAttachment}
                    onClear={() => {
                      setPendingAttachment(null);
                      setPendingIsVoiceNote(false);
                    }}
                    clearAriaLabel={t('teamChatClearAttachment')}
                    openAriaLabel={t('chatMediaOpenAria')}
                    onOpen={(_previewUrl, kind) => {
                      // Own blob URL so closing the viewer does not revoke the chip's preview.
                      const ownUrl = URL.createObjectURL(pendingAttachment);
                      setMediaViewer({
                        items: [
                          {
                            id: 'pending-attachment',
                            kind,
                            url: ownUrl,
                            filename: pendingAttachment.name,
                          },
                        ],
                        index: 0,
                      });
                    }}
                  />
                ) : null}

                {/* dir=ltr keeps attach | input | action spacing stable under Arabic page RTL */}
                <div className="flex w-full min-w-0 items-center gap-2" dir="ltr">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setPendingAttachment(f);
                        setPendingIsVoiceNote(false);
                      }
                      e.target.value = '';
                    }}
                  />
                  <div
                    className={`${WA_INPUT_SHELL} flex min-h-11 min-w-0 flex-1 items-center gap-0.5 rounded-3xl py-1.5 ${
                      voiceRecording ? 'ring-1 ring-red-400/40 border-red-400/50' : ''
                    }`}
                  >
                    {voiceRecording ? (
                      <ChatVoiceRecordingBar
                        variant="whatsapp"
                        elapsedLabel={elapsedLabel}
                        paused={voicePaused}
                        onPause={pauseVoiceRecording}
                        onResume={resumeVoiceRecording}
                        onStop={stopVoiceRecording}
                        onCancel={cancelVoiceRecording}
                        t={t}
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/10"
                          disabled={composerBlocked || sending}
                          onClick={() => setAttachSourceOpen(true)}
                          aria-label={t('teamChatAttach')}
                          title={t('teamChatAttach')}
                        >
                          <PaperclipIcon className="size-[1.2rem]" />
                        </button>
                        <textarea
                          ref={textareaRef}
                          rows={1}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onInput={resizeComposer}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (!composerBlocked && canSend) void handleSend();
                            }
                          }}
                          disabled={composerBlocked || sending}
                          placeholder={composerBlocked ? t('replyWindowClosed') : t('typeAMessage')}
                          dir={textDir}
                          wrap="soft"
                          className={`custom-scrollbar box-border min-h-0 min-w-0 flex-1 resize-none overflow-x-hidden overflow-y-auto border-0 bg-transparent px-1 py-1 text-sm leading-5 text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60 dark:text-gray-100 [overflow-wrap:anywhere] whitespace-pre-wrap ${
                            textDir === 'rtl' ? 'text-right' : 'text-left'
                          }`}
                          style={{
                            height: COMPOSER_MIN_H_PX,
                            minHeight: COMPOSER_MIN_H_PX,
                            maxHeight: COMPOSER_MAX_H_PX,
                          }}
                        />
                      </>
                    )}
                  </div>
                  {voiceRecording ? null : showMic ? (
                    <button
                      type="button"
                      className={`inline-flex shrink-0 items-center justify-center self-center ${WA_SEND_BTN}`}
                      disabled={composerBlocked || sending}
                      onClick={() => {
                        setMicError(null);
                        void startVoiceRecording();
                      }}
                      aria-label={t('teamChatRecordVoice')}
                    >
                      <MicrophoneIcon className="h-5 w-5 text-white" />
                    </button>
                  ) : (
                    <Button
                      className={`${WA_SEND_BTN} !self-center`}
                      disabled={composerBlocked || !canSend || sending}
                      loading={sending}
                      onClick={() => void handleSend()}
                      aria-label={t('send')}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5 text-white"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
        </div>
      </div>

      <AttachmentSourceModal
        isOpen={attachSourceOpen}
        onClose={() => setAttachSourceOpen(false)}
        onPickDevice={() => fileInputRef.current?.click()}
        onPickLibraryFile={(file) => {
          setPendingAttachment(file);
          setPendingIsVoiceNote(false);
        }}
        t={t}
      />

      {canConvert ? (
        <ConvertConversationModal
          isOpen={convertOpen}
          onClose={() => setConvertOpen(false)}
          conversation={threadConversation ?? null}
          onSubmit={handleConvert}
          isSubmitting={convert.isPending}
          errorMessage={convertError}
        />
      ) : null}

      {mediaViewer && mediaViewer.items.length > 0 ? (
        <ChatMediaViewer
          items={mediaViewer.items}
          initialIndex={mediaViewer.index}
          onClose={() => {
            for (const it of mediaViewer.items) {
              if (it.id === 'pending-attachment' && it.url.startsWith('blob:')) {
                URL.revokeObjectURL(it.url);
              }
            }
            setMediaViewer(null);
          }}
          t={t}
        />
      ) : null}
    </div>
  );
};

export default InboxPage;
