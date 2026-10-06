import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ChatMediaViewer } from '../components/chat/ChatMediaViewer';
import {
  buildChatMediaAlbum,
  findChatMediaAlbumIndex,
  type ChatMediaAlbumItem,
} from '../components/chat/chatMediaAlbum';
import { SocialContactAvatar } from '../components/chat/SocialContactAvatar';
import { WhatsAppAgentStatusControl } from '../components/whatsapp/WhatsAppAgentStatusControl';
import {
  InboxFilterRail,
  INBOX_CHANNEL_FILTERS,
  INBOX_STATUS_FILTERS,
} from '../components/chat/InboxFilterRail';
import { ConvertConversationModal } from '../components/modals/ConvertConversationModal';
import { InboxChannelBadge } from '../components/inbox/InboxMessageList';
import { SearchIcon, StarIcon } from '../components/index';
import { ChatThread } from '../components/whatsapp/ChatThread';
import type { ChatBubbleMessage } from '../components/whatsapp/ChatMessageBubble';
import { useAppContext } from '../context/AppContext';
import { normalizeRole } from '../utils/roles';
import type { translations } from '../constants';
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
  useUsers,
} from '../hooks/useQueries';
import { useInvalidateOnSliceChange } from '../hooks/useSliceVersion';
import { useRealtimeConnected } from '../hooks/useRealtimeChannel';
import {
  deleteSocialConversationAPI,
  getMessageTemplatesAPI,
  getWhatsAppCallsAPI,
  resolveLocalizedApiError,
  sendSocialInboxLocationAPI,
  sendSocialInboxTemplateAPI,
  updateSocialContactAPI,
} from '../services/api';
import { ShareLocationModal } from '../components/modals/ShareLocationModal';
import { useWhatsAppCallingOptional } from '../components/whatsapp/WhatsAppCallListener';
import { inboxWhatsappThreadAdapter } from '../hooks/whatsappThread/inboxThreadAdapter';
import { socialMessageToBubble } from '../utils/chatBubbleMapping';
import type { SocialConversationPayload, SocialMessagePayload } from '../services/api';
import { consumePendingInboxConversationId } from '../utils/inboxDeepLink';
import {
  canAccessSocialInbox,
  canConvertSocialConversation,
  isSocialInboxStaffScoped,
  userSeesAllSocialConversations,
} from '../utils/socialInboxAccess';
import {
  localizeWhatsAppListPreview,
} from '../utils/whatsappMessageBodyDisplay';
import {
  WA_ALERT_INFO,
  WA_ALERT_WARN,
  WA_LAYOUT_SHELL,
  WA_LIST_ACTIVE,
  WA_LIST_BG,
  WA_LIST_HOVER,
  WA_HEADER_BAR,
  WA_HEADER_TEXT,
} from '../components/whatsapp/whatsappChatTheme';

/** Backstop only — the `inbox` sync slice delivers changes sooner. */
const POLL_WHEN_REALTIME_DOWN = 20000;
const POLL_WHEN_REALTIME_UP = 60000;

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

function formatTime(iso: string | null | undefined, language: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(language === 'ar' ? 'ar' : 'en', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function humanizeRemaining(
  expiresAt: string | null,
  t: (key: keyof typeof translations.en) => string
): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return '';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) {
    return t('inboxWindowTimeRemainingHours')
      .replace('{hours}', String(hours))
      .replace('{minutes}', String(minutes));
  }
  return t('inboxWindowTimeRemainingMinutes').replace('{minutes}', String(minutes));
}

export const InboxPage: React.FC = () => {
  const {
    t,
    language,
    currentUser,
    openLeadDetails,
    setConfirmDeleteConfig,
    setIsConfirmDeleteModalOpen,
    showAlert,
  } = useAppContext();
  const queryClient = useQueryClient();
  const realtimeConnected = useRealtimeConnected();
  const inboxAccessAllowed = canAccessSocialInbox(currentUser);
  const canConvert = canConvertSocialConversation(currentUser);
  const staffScopedInbox = isSocialInboxStaffScoped(currentUser);
  const role = normalizeRole(currentUser?.role);
  const isCallCenter = role === 'CallCenter';
  const canReassign =
    role === 'Owner' ||
    (role === 'Supervisor' && userSeesAllSocialConversations(currentUser));

  const [filtersInit] = useState(loadInboxFilters);
  const [channel, setChannel] = useState(filtersInit.channel);
  const [status, setStatus] = useState<string>(filtersInit.status);
  const [unreplied, setUnreplied] = useState(filtersInit.unreplied);
  const [starredOnly, setStarredOnly] = useState(false);
  const [assignment, setAssignment] = useState<string>('all');
  const [agentId, setAgentId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [shareLocationOpen, setShareLocationOpen] = useState(false);
  const waCalling = useWhatsAppCallingOptional();
  const waCapabilities = inboxWhatsappThreadAdapter.capabilities;
  const [selectedId, setSelectedId] = useState<number | null>(() => consumePendingInboxConversationId());
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [editingContactName, setEditingContactName] = useState(false);
  const [contactNameDraft, setContactNameDraft] = useState('');
  const [savingContactName, setSavingContactName] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [pendingIsVoiceNote, setPendingIsVoiceNote] = useState(false);
  const [resendingMessageId, setResendingMessageId] = useState<string | null>(null);
  const [mediaViewer, setMediaViewer] = useState<{
    items: ChatMediaAlbumItem[];
    index: number;
  } | null>(null);

  const listParams = useMemo(
    () => ({
      channel,
      status,
      search: search.trim() || undefined,
      unreplied: unreplied || undefined,
      starred: starredOnly || undefined,
      assignment: assignment !== 'all' ? assignment : undefined,
      agent: agentId === '' ? undefined : agentId,
      limit: 100,
    }),
    [channel, status, search, unreplied, starredOnly, assignment, agentId]
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

  const { data: agentsData } = useUsers(undefined, { enabled: canReassign }, 200, {
    roles: ['call_center'],
  });
  const agents: { id: number; full_name?: string; username?: string }[] = Array.isArray(agentsData)
    ? agentsData
    : agentsData?.results ?? [];

  const { data: listData, isLoading: listLoading } = useSocialConversations(listParams, {
    refetchInterval: inboxAccessAllowed ? pollMs : false,
    enabled: inboxAccessAllowed,
  });
  const conversations: SocialConversationPayload[] = listData?.results ?? [];
  const statusCounts = listData?.status_counts ?? {};

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const { data: threadData, isLoading: threadLoading } = useSocialMessages(
    selectedId ?? undefined,
    { refetchInterval: inboxAccessAllowed ? pollMs : false, enabled: inboxAccessAllowed }
  );
  const messages: SocialMessagePayload[] = threadData?.results ?? [];
  const threadConversation = threadData?.conversation ?? selected;
  const isWhatsappThread = selected?.channel === 'whatsapp';

  const { data: threadCallsData } = useQuery({
    queryKey: ['whatsappCalls', 'inbox-thread', selectedId],
    queryFn: () => getWhatsAppCallsAPI({ conversation: selectedId!, limit: 50 }),
    enabled: Boolean(selectedId && isWhatsappThread && waCapabilities.calling),
    refetchInterval: pollMs,
  });
  const threadCalls = threadCallsData?.results ?? [];

  const { data: sendWindow } = useSocialSendWindow(selectedId ?? undefined);

  const sendText = useSendSocialMessage();
  const sendMedia = useSendSocialMedia();
  const markRead = useMarkSocialConversationRead();
  const updateState = useUpdateSocialConversationState();
  const convert = useConvertSocialConversation();

  const requiresTemplate = Boolean(sendWindow?.requires_template);
  const composerBlocked = sendWindow ? !sendWindow.open && !requiresTemplate : false;
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [templateSending, setTemplateSending] = useState(false);
  const { data: messageTemplates } = useQuery({
    queryKey: ['messageTemplates', 'inbox'],
    queryFn: () => getMessageTemplatesAPI(),
    enabled: Boolean(selectedId && isWhatsappThread),
  });
  const approvedTemplates = useMemo(
    () =>
      inboxWhatsappThreadAdapter.approvedTemplatesFilter(
        Array.isArray(messageTemplates) ? messageTemplates : []
      ),
    [messageTemplates]
  );
  const sending = sendText.isPending || sendMedia.isPending;

  useEffect(() => {
    setMediaViewer(null);
    setPendingAttachment(null);
    setPendingIsVoiceNote(false);
    setDraft('');
    setSendError(null);
  }, [selectedId]);

  const threadBubbleMessages: ChatBubbleMessage[] = useMemo(
    () => messages.map((m) => socialMessageToBubble(m, language, t)),
    [messages, language, t]
  );

  const mediaAlbum = useMemo(
    () =>
      buildChatMediaAlbum(
        threadBubbleMessages.map((m) => ({
          id: m.id,
          kind: m.attachmentKind,
          url: m.attachmentUrl,
          filename: m.attachmentFilename,
          width: m.attachmentWidth,
          height: m.attachmentHeight,
        }))
      ),
    [threadBubbleMessages]
  );

  const inboxWindowAlerts = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    if (sendWindow?.mode === 'response' && sendWindow.expires_at) {
      nodes.push(
        <div key="response" className={WA_ALERT_INFO}>
          {t('replyWindowOpen').replace('{time}', humanizeRemaining(sendWindow.expires_at, t))}
        </div>
      );
    }
    if (sendWindow?.mode === 'human_agent' && sendWindow.expires_at) {
      nodes.push(
        <div key="human" className={WA_ALERT_WARN}>
          {t('replyWindowHumanAgent').replace('{time}', humanizeRemaining(sendWindow.expires_at, t))}
        </div>
      );
    }
    if (requiresTemplate) {
      nodes.push(
        <div key="template" className={WA_ALERT_WARN}>
          <p className="font-semibold">{t('replyWindowClosed')}</p>
          <p>{t('inboxTemplateRequiredHint')}</p>
        </div>
      );
    }
    if (composerBlocked && !requiresTemplate) {
      nodes.push(
        <div key="closed" className={WA_ALERT_WARN}>
          <p className="font-semibold">{t('replyWindowClosed')}</p>
          <p>{t('replyWindowClosedHint')}</p>
        </div>
      );
    }
    return nodes.length ? <>{nodes}</> : null;
  }, [sendWindow, requiresTemplate, composerBlocked, t]);

  // Opening a thread clears its unread badge.
  useEffect(() => {
    if (selectedId && selected && selected.unread_count > 0) {
      markRead.mutate(selectedId);
    }
    // markRead intentionally omitted: including it would re-fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.unread_count]);

  const handleResendMessage = useCallback(
    async (msg: ChatBubbleMessage) => {
      if (!selectedId || !msg.body.trim()) return;
      setResendingMessageId(msg.id);
      try {
        await sendText.mutateAsync({ conversationId: selectedId, text: msg.body.trim() });
        queryClient.invalidateQueries({ queryKey: queryKeys.socialSendWindow(selectedId) });
      } catch (err: any) {
        const code = err?.code || err?.error?.code;
        setSendError(code ? t(code as any) || err?.message : err?.message || t('socialSendFailed'));
      } finally {
        setResendingMessageId(null);
      }
    },
    [selectedId, sendText, queryClient, t]
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
          isVoiceNote: pendingIsVoiceNote,
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
      openLeadDetails(
        { id: clientId, name: clientName || `#${clientId}` },
        selectedId ? { inboxConversationId: selectedId } : undefined
      );
    },
    [openLeadDetails, selectedId]
  );

  const handleDeleteConversation = useCallback(() => {
    if (!selectedId || !selected) return;
    const conversationId = selectedId;
    const label = selected.contact.display_name;
    setConfirmDeleteConfig({
      title: t('delete'),
      message: t('deleteConversationConfirm'),
      itemName: label,
      confirmButtonText: t('delete'),
      confirmButtonVariant: 'danger',
      onConfirm: async () => {
        try {
          await deleteSocialConversationAPI(conversationId);
          setSelectedId(null);
          queryClient.invalidateQueries({ queryKey: ['socialConversations'] });
        } catch (e: unknown) {
          showAlert(resolveLocalizedApiError(e, t, 'Delete failed'), 'error');
        }
      },
    });
    setIsConfirmDeleteModalOpen(true);
  }, [
    selected,
    selectedId,
    t,
    setConfirmDeleteConfig,
    setIsConfirmDeleteModalOpen,
    queryClient,
    showAlert,
  ]);

  useEffect(() => {
    setEditingContactName(false);
    setContactNameDraft(selected?.contact.name || selected?.contact.display_name || '');
  }, [selectedId, selected?.contact.id, selected?.contact.name, selected?.contact.display_name]);

  const saveContactName = useCallback(async () => {
    if (!selected?.contact?.id) return;
    const next = contactNameDraft.trim();
    if (!next) {
      showAlert(t('name'), 'error');
      return;
    }
    setSavingContactName(true);
    try {
      await updateSocialContactAPI(selected.contact.id, next);
      setEditingContactName(false);
      queryClient.invalidateQueries({ queryKey: ['socialConversations'] });
    } catch (e: unknown) {
      showAlert(resolveLocalizedApiError(e, t, 'Save failed'), 'error');
    } finally {
      setSavingContactName(false);
    }
  }, [selected, contactNameDraft, queryClient, showAlert, t]);

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
            {isCallCenter ? (
              <WhatsAppAgentStatusControl t={t} />
            ) : null}
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
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={starredOnly}
                  onChange={(e) => setStarredOnly(e.target.checked)}
                />
                {t('chatFilterStarred')}
              </label>
            </div>
            {!staffScopedInbox ? (
              <select
                value={assignment}
                onChange={(e) => setAssignment(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="all">{t('chatFilterAll')}</option>
                <option value="mine">{t('chatFilterAssignedToMe')}</option>
                <option value="unassigned">{t('chatFilterUnassigned')}</option>
              </select>
            ) : null}
            {canReassign && agents.length > 0 ? (
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="">{t('inboxFilterByAgent')}</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.full_name || agent.username}
                  </option>
                ))}
              </select>
            ) : null}
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
                <SocialContactAvatar
                  displayName={row.contact.display_name}
                  avatarUrl={row.contact.avatar_url}
                  profilePicUrl={row.contact.profile_pic_url}
                />
                <div className="min-w-0 flex-1">
                  {/* Name alone on the first line — the converted badge used to
                      sit inline with shrink-0 and ate the whole title in Arabic. */}
                  <div className="flex min-w-0 items-center gap-1.5">
                    <InboxChannelBadge
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
                  {row.assigned_to ? (
                    <p className="truncate text-[10px] font-medium text-primary-700 dark:text-primary-200">
                      {row.assigned_to.full_name || row.assigned_to.username}
                    </p>
                  ) : null}
                  <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300">
                    {localizeWhatsAppListPreview(row.last_message_preview || '', t)}
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
            <ChatThread
              t={t}
              language={language}
              selectedClient={{ id: selected.id }}
              messages={threadBubbleMessages}
              threadCalls={isWhatsappThread ? threadCalls : []}
              isLoading={threadLoading}
              isFetching={threadLoading}
              conversationStatus={selected.status}
              isStarred={selected.is_starred}
              isUnsubscribed={selected.is_unsubscribed}
              onThreadStatusChange={handleThreadStatusChange}
              headerAvatar={
                <SocialContactAvatar
                  displayName={selected.contact.display_name}
                  avatarUrl={selected.contact.avatar_url}
                  profilePicUrl={selected.contact.profile_pic_url}
                />
              }
              headerTitle={
                <div className="flex min-w-0 items-center gap-2">
                  <InboxChannelBadge channel={selected.channel} className="h-4 w-4 shrink-0" />
                  {editingContactName ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void saveContactName();
                      }}
                    >
                      <input
                        autoFocus
                        value={contactNameDraft}
                        onChange={(e) => setContactNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingContactName(false);
                            setContactNameDraft(
                              selected.contact.name || selected.contact.display_name
                            );
                          }
                        }}
                        dir="auto"
                        className="min-w-0 flex-1 rounded border border-white/40 bg-white/15 px-1.5 py-0.5 text-sm font-semibold text-white outline-none placeholder:text-white/60"
                        aria-label={t('name')}
                      />
                      <button
                        type="submit"
                        disabled={savingContactName}
                        className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                      >
                        {t('save')}
                      </button>
                      <button
                        type="button"
                        disabled={savingContactName}
                        onClick={() => {
                          setEditingContactName(false);
                          setContactNameDraft(
                            selected.contact.name || selected.contact.display_name
                          );
                        }}
                        className="shrink-0 rounded px-1.5 py-0.5 text-xs text-white/80 hover:bg-white/20"
                      >
                        {t('cancel')}
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      title={t('name')}
                      onClick={() => {
                        setContactNameDraft(
                          selected.contact.name || selected.contact.display_name
                        );
                        setEditingContactName(true);
                      }}
                      className="min-w-0 truncate text-start text-sm font-semibold hover:underline"
                    >
                      {selected.contact.display_name}
                    </button>
                  )}
                </div>
              }
              headerActions={
                <>
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
                  {canReassign ? (
                    <select
                      value={selected.assigned_to?.id ?? ''}
                      aria-label={t('inboxAssignAgent')}
                      onChange={(e) => {
                        if (!selectedId) return;
                        updateState.mutate({
                          conversationId: selectedId,
                          assignedTo: e.target.value ? Number(e.target.value) : null,
                        });
                      }}
                      className="max-w-[9rem] rounded-md border border-white/30 bg-white/10 px-1.5 py-1 text-xs text-white"
                    >
                      <option value="">{t('chatFilterUnassigned')}</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id} className="text-gray-900">
                          {agent.full_name || agent.username}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {(currentUser?.is_company_owner || currentUser?.isCompanyOwner) ? (
                    <Button
                      variant="ghost"
                      className="!h-8 !text-white hover:!bg-white/20"
                      onClick={handleDeleteConversation}
                    >
                      {t('delete')}
                    </Button>
                  ) : null}
                </>
              }
              onWhatsAppCall={
                isWhatsappThread &&
                waCapabilities.calling &&
                waCalling &&
                selected.contact?.external_id
                  ? () => {
                      const target = inboxWhatsappThreadAdapter.callTarget({
                        peerPhone: selected.contact.external_id,
                        clientId: threadConversation?.client?.id,
                        conversationId: selected.id,
                        waInboxNumberId: selected.connection?.id,
                      });
                      if (!target) return;
                      void waCalling.startOutboundCall({
                        to: target.to,
                        clientId: target.clientId,
                        conversationId: target.conversationId,
                        waInboxNumberId: target.waInboxNumberId,
                      });
                    }
                  : undefined
              }
              onOpenMedia={(msg) => {
                setMediaViewer({
                  items: mediaAlbum,
                  index: findChatMediaAlbumIndex(mediaAlbum, String(msg.id)),
                });
              }}
              onResendMessage={handleResendMessage}
              resendingMessageId={resendingMessageId}
              composerProps={{
                messageInput: draft,
                setMessageInput: setDraft,
                onSend: () => void handleSend(),
                // Never map Meta reply-window closed → WhatsApp disconnect.
                // ChatComposerAlerts treats whatsappSendBlocked as reconnect-required.
                whatsappSendBlocked: false,
                blockFreeText: composerBlocked || requiresTemplate,
                suppressBlockFreeTextAlert: true,
                approvedTemplates,
                chatTemplateSendId: templateId,
                setChatTemplateSendId: setTemplateId,
                chatTemplateSending: templateSending,
                onSendTemplate: async () => {
                  if (!selectedId || !templateId) return;
                  setTemplateSending(true);
                  try {
                    await sendSocialInboxTemplateAPI({
                      conversation: selectedId,
                      template_id: Number(templateId),
                    });
                    setTemplateId('');
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.socialMessages(selectedId),
                    });
                  } catch (e: any) {
                    setSendError(resolveLocalizedApiError(e, t, t('socialSendFailed')));
                  } finally {
                    setTemplateSending(false);
                  }
                },
                session: null,
                composerAlert: sendError
                  ? { variant: 'error' as const, message: sendError }
                  : null,
                windowAlerts: inboxWindowAlerts,
                showTemplatePicker: isWhatsappThread,
                placeholder: composerBlocked ? t('replyWindowClosed') : t('typeAMessage'),
                pendingAttachment,
                setPendingAttachment,
                pendingIsVoiceNote,
                setPendingIsVoiceNote,
                onInsertQuickTemplate: (content) => setDraft(content),
                onShareLocation:
                  isWhatsappThread && waCapabilities.location
                    ? () => setShareLocationOpen(true)
                    : undefined,
                onOpenPendingMedia: (_previewUrl, kind) => {
                  if (!pendingAttachment) return;
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
                },
              }}
            />
          )}
        </div>
      </div>
        </div>
      </div>

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

      {shareLocationOpen && selectedId && isWhatsappThread ? (
        <ShareLocationModal
          isOpen={shareLocationOpen}
          onClose={() => setShareLocationOpen(false)}
          t={t}
          onSend={async (loc) => {
            if (!selectedId) return;
            await sendSocialInboxLocationAPI({
              conversation: selectedId,
              latitude: loc.latitude,
              longitude: loc.longitude,
              name: loc.name,
              address: loc.address,
            });
            setShareLocationOpen(false);
            queryClient.invalidateQueries({ queryKey: queryKeys.socialMessages(selectedId) });
          }}
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
