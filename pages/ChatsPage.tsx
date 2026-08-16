import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IntegrationPlatformIcon } from '../components/integrations/IntegrationPlatformIcon';
import { PageHelpVideoButton } from '../components/PageHelpVideoButton';
import { ChatToast } from '../components/ChatToast';
import { ChatMediaViewer } from '../components/chat/ChatMediaViewer';
import {
  buildChatMediaAlbum,
  findChatMediaAlbumIndex,
  type ChatMediaAlbumItem,
} from '../components/chat/chatMediaAlbum';
import { StartNewConversationModal } from '../components/modals/StartNewConversationModal';
import { ShareLocationModal } from '../components/modals/ShareLocationModal';
import { WhatsAppChatLayout, type ChatBubbleMessage } from '../components/whatsapp/WhatsAppChatLayout';
import { useWhatsAppCallingOptional } from '../components/whatsapp/WhatsAppCallListener';
import { useAppContext } from '../context/AppContext';
import { useConnectedAccounts, useMarkWhatsAppConversationRead, useWhatsAppChatMessages, useWhatsAppConversations } from '../hooks/useQueries';
import { useWhatsAppChatsAllowed } from '../hooks/useWhatsAppChatsAllowed';
import { useWhatsAppConnected } from '../hooks/useWhatsAppConnected';
import {
  deleteWhatsAppConversationAPI,
  deleteWhatsAppMessageAPI,
  getMessageTemplatesAPI,
  getWhatsAppCallsAPI,
  getWhatsAppContactByPhoneAPI,
  getWhatsAppSessionWindowAPI,
  resolveLocalizedApiError,
  sendWhatsAppLocationAPI,
  sendWhatsAppMediaAPI,
  sendWhatsAppMessageAPI,
  sendWhatsAppTemplateAPI,
  type MessageTemplateType,
  type WhatsAppCallRecord,
} from '../services/api';
import { getUserDisplayName } from '../types';
import { compressImageForChat } from '../utils/compressImageForChat';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../utils/dateUtils';
import { normalizeRole } from '../utils/roles';
import {
  buildManualClientForPhone,
  isManualChatClient,
  loadManualConversations,
  loadManualMessages,
  loadSelectedManualPhone,
  mergeManualConversations,
  normalizeChatPhone,
  removeManualConversationForPhone,
  saveManualConversations,
  saveManualMessages,
  saveSelectedManualPhone,
  type ManualChatMessage,
} from '../utils/whatsappManualChatsStorage';
import {
  playIncomingWhatsAppSound,
  preloadIncomingWhatsAppSound,
} from '../utils/whatsappIncomingSound';
import { replaceTemplatePlaceholders } from '../utils/messagePlaceholders';

const SESSION_MS = 24 * 60 * 60 * 1000;

function inferChatAttachmentKind(file: File): 'image' | 'video' | 'audio' | 'document' {
  const t = (file.type || '').toLowerCase();
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  return 'document';
}

function deriveSessionFromMessages(messages: { direction?: string; created_at?: string }[]): boolean {
  let latest = 0;
  for (const m of messages) {
    if (m.direction !== 'inbound' || !m.created_at) continue;
    const ts = new Date(m.created_at).getTime();
    if (!Number.isNaN(ts) && ts > latest) latest = ts;
  }
  if (!latest) return false;
  return Date.now() - latest < SESSION_MS;
}

export const ChatsPage: React.FC = () => {
  const {
    t,
    language,
    currentUser,
    selectedLead,
    pendingChatPhone,
    setPendingChatPhone,
    setAlertMessage,
    setAlertVariant,
    setIsAlertModalOpen,
    setConfirmDeleteConfig,
    setIsConfirmDeleteModalOpen,
    openCallsFiltered,
    hasSupervisorPermission,
  } = useAppContext();
  const whatsappCalling = useWhatsAppCallingOptional();
  const chatsAllowed = useWhatsAppChatsAllowed();
  const queryClient = useQueryClient();
  const companyId = currentUser?.company?.id as number | string | undefined;
  const companyName = currentUser?.company?.name || '';
  /** { اسم الموظف } signs with the sender — matches the API's send-time rule. */
  const senderName = currentUser ? getUserDisplayName(currentUser) : '';
  const role = normalizeRole(currentUser?.role);
  const isStaff = role === 'Employee' || role === 'Doctor';
  const chatAccessAllowed =
    role === 'Supervisor'
      ? hasSupervisorPermission('can_manage_whatsapp_chats')
      : currentUser?.whatsapp_chat_enabled !== false;

  const showAlert = (message: string, variant: 'info' | 'warning' | 'error' = 'info') => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setIsAlertModalOpen(true);
  };

  const [selectedChatClient, setSelectedChatClient] = useState<any>(null);
  const [extraConversations, setExtraConversations] = useState<Array<{ client: any }>>([]);
  const manualChatsHydratedRef = useRef(false);
  const [optimisticMessages, setOptimisticMessages] = useState<ManualChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [pendingIsVoiceNote, setPendingIsVoiceNote] = useState(false);
  const [compressingAttachment, setCompressingAttachment] = useState(false);
  const mediaResendFilesRef = useRef<Map<string, { file: File; isVoiceNote: boolean }>>(new Map());
  const locationResendRef = useRef<
    Map<string, { latitude: number; longitude: number; name?: string; address?: string }>
  >(new Map());
  const [shareLocationOpen, setShareLocationOpen] = useState(false);
  const [shareLocationSending, setShareLocationSending] = useState(false);
  const [chatTemplateSendId, setChatTemplateSendId] = useState<number | ''>('');
  const [chatTemplateSending, setChatTemplateSending] = useState(false);
  const [isStartNewOpen, setIsStartNewOpen] = useState(false);
  const [chatToast, setChatToast] = useState<{ message: string; variant: 'error' | 'warning' } | null>(null);
  const [composerAlert, setComposerAlert] = useState<{
    variant: 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [resendingMessageId, setResendingMessageId] = useState<string | null>(null);
  const [mediaViewer, setMediaViewer] = useState<{
    items: ChatMediaAlbumItem[];
    index: number;
  } | null>(null);
  const lastInboundKeyRef = useRef<string>('');
  const markReadClientKeyRef = useRef<string>('');
  /** Hydrate-safe tracker so opening a thread with history does not play sound. */
  const inboundSoundHydratedRef = useRef(false);
  const inboundSoundLatestIdRef = useRef<number | null>(null);
  /** Persist unread divider across mark-read clearing is_read. */
  const [newMessagesBeforeApiId, setNewMessagesBeforeApiId] = useState<number | null>(null);

  const markConversationRead = useMarkWhatsAppConversationRead();

  const { data: accountsResponse } = useConnectedAccounts('whatsapp');
  const accounts = useMemo(() => {
    const list = Array.isArray(accountsResponse) ? accountsResponse : accountsResponse?.results || [];
    return list.map((acc: any) => ({
      ...acc,
      status:
        acc.status === 'connected'
          ? 'Connected'
          : acc.status === 'disconnected'
            ? 'Disconnected'
            : acc.status_display || 'Disconnected',
      is_active: acc.is_active !== false,
    }));
  }, [accountsResponse]);

  const { isConnected: hasConnectedWhatsApp, phoneNumberId: currentWhatsAppPhoneNumberId } =
    useWhatsAppConnected();
  const whatsappSendBlocked = !hasConnectedWhatsApp;

  const displayNameBlockedHint = useMemo(() => {
    const pending = accounts.some((a: any) => {
      if (a.status !== 'Connected') return false;
      const meta = a.metadata || {};
      const st = String(meta.display_name_status || meta.name_status || '').toUpperCase();
      if (st === 'PENDING' || st === 'PENDING_REVIEW' || st === 'DECLINED' || st === 'EXPIRED') {
        return true;
      }
      return meta.display_name_approved === false;
    });
    return pending ? t('whatsapp_display_name_not_approved') : null;
  }, [accounts, t]);

  // Drop sticky display-name alert when Meta metadata no longer shows pending.
  useEffect(() => {
    if (!composerAlert) return;
    if (displayNameBlockedHint) return;
    if (composerAlert.message === t('whatsapp_display_name_not_approved')) {
      setComposerAlert(null);
    }
  }, [displayNameBlockedHint, composerAlert, t]);

  // Never poll for a user whose WhatsApp access is off — every 3s tick would 403.
  const { data: conversationsList = [], refetch: refetchConversations } = useWhatsAppConversations({
    enabled: chatsAllowed,
    refetchInterval: chatsAllowed ? 3000 : false,
  });

  const selectedChatLeadId =
    selectedChatClient && typeof selectedChatClient.id === 'number' ? selectedChatClient.id : undefined;
  const selectedChatPhone = selectedChatClient ? normalizeChatPhone(selectedChatClient) : '';

  useEffect(() => {
    setComposerAlert(null);
  }, [selectedChatClient?.id, selectedChatPhone]);

  const {
    data: leadWhatsAppMessages = [],
    refetch: refetchLeadWhatsApp,
    isFetching: isFetchingChatMessages,
    isFetched: isChatMessagesFetched,
    isSuccess: isChatMessagesSuccess,
  } = useWhatsAppChatMessages({
    clientId: selectedChatLeadId,
    phone: selectedChatPhone || undefined,
    enabled: !!selectedChatClient,
    refetchInterval: selectedChatClient ? 5000 : false,
  });

  const { data: threadCallsData, refetch: refetchThreadCalls } = useQuery({
    queryKey: ['whatsappCalls', 'thread', selectedChatLeadId, selectedChatPhone],
    queryFn: async () => {
      if (typeof selectedChatLeadId === 'number') {
        return getWhatsAppCallsAPI({
          client: selectedChatLeadId,
          ordering: 'started_at',
          limit: 100,
        });
      }
      const phone = selectedChatPhone.replace(/\D/g, '');
      if (phone.length < 7) return { count: 0, results: [] as WhatsAppCallRecord[] };
      return getWhatsAppCallsAPI({
        search: phone,
        ordering: 'started_at',
        limit: 100,
      });
    },
    enabled:
      !!selectedChatClient &&
      (typeof selectedChatLeadId === 'number' ||
        (!!selectedChatPhone && selectedChatPhone.replace(/\D/g, '').length >= 7)),
    refetchInterval: selectedChatClient ? 5000 : false,
  });

  const threadCalls = useMemo(() => {
    const rows = threadCallsData?.results || [];
    // For phone-only search, keep rows that match this peer closely.
    if (typeof selectedChatLeadId === 'number') return rows;
    const phone = selectedChatPhone.replace(/\D/g, '');
    if (!phone) return rows;
    return rows.filter((c) => {
      const peer = String(c.peer_phone || '').replace(/\D/g, '');
      return peer === phone || peer.endsWith(phone.slice(-10)) || phone.endsWith(peer.slice(-10));
    });
  }, [threadCallsData, selectedChatLeadId, selectedChatPhone]);

  const { data: waSessionApi, refetch: refetchWaSession } = useQuery({
    queryKey: ['whatsappSession', selectedChatLeadId, selectedChatPhone],
    queryFn: () =>
      typeof selectedChatLeadId === 'number'
        ? getWhatsAppSessionWindowAPI({ clientId: selectedChatLeadId })
        : getWhatsAppSessionWindowAPI({ phone: selectedChatPhone }),
    enabled:
      !!selectedChatClient &&
      (typeof selectedChatLeadId === 'number' ||
        (!!selectedChatPhone && selectedChatPhone.replace(/\D/g, '').length >= 7)),
    staleTime: 0,
  });

  // Derive session from loaded inbound messages so UI doesn't lag the poll.
  const derivedInSession = deriveSessionFromMessages(leadWhatsAppMessages as any[]);
  const blockFreeText =
    typeof selectedChatClient?.id === 'number' &&
    ((waSessionApi != null && !waSessionApi.in_session && !derivedInSession) ||
      (waSessionApi == null && !derivedInSession));

  const effectiveSession = useMemo(() => {
    if (derivedInSession) {
      return {
        in_session: true,
        hours_remaining: waSessionApi?.hours_remaining ?? null,
        last_inbound_at: waSessionApi?.last_inbound_at ?? null,
      };
    }
    return waSessionApi
      ? {
          in_session: !!waSessionApi.in_session,
          hours_remaining: waSessionApi.hours_remaining,
          last_inbound_at: waSessionApi.last_inbound_at,
        }
      : null;
  }, [derivedInSession, waSessionApi]);

  // Invalidate session when a newer inbound appears in the thread.
  useEffect(() => {
    const inbounds = (leadWhatsAppMessages as any[]).filter((m) => m.direction === 'inbound');
    if (!inbounds.length) return;
    const newest = inbounds.reduce((a, b) =>
      new Date(a.created_at).getTime() >= new Date(b.created_at).getTime() ? a : b
    );
    const key = `${newest.id}:${newest.created_at}`;
    if (key !== lastInboundKeyRef.current) {
      lastInboundKeyRef.current = key;
      void queryClient.invalidateQueries({ queryKey: ['whatsappSession'] });
      void refetchWaSession();
      // Thread is open: new inbound should not keep the sidebar badge elevated.
      if (typeof selectedChatLeadId === 'number') {
        markConversationRead.mutate({ clientId: selectedChatLeadId });
      }
    }
  }, [leadWhatsAppMessages, queryClient, refetchWaSession, selectedChatLeadId, markConversationRead]);

  // Reset trackers when switching conversations (must run before in-thread sound hydrate).
  useEffect(() => {
    inboundSoundHydratedRef.current = false;
    inboundSoundLatestIdRef.current = null;
    lastInboundKeyRef.current = '';
    setNewMessagesBeforeApiId(null);
  }, [selectedChatClient?.id, selectedChatPhone]);

  // Capture first unread inbound once (before mark-read clears is_read).
  useEffect(() => {
    if (!selectedChatClient || newMessagesBeforeApiId != null) return;
    const chronological = [...(leadWhatsAppMessages as any[])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const firstUnread = chronological.find(
      (m) => m.direction === 'inbound' && m.is_read === false && typeof m.id === 'number'
    );
    if (firstUnread) {
      setNewMessagesBeforeApiId(firstUnread.id as number);
    }
  }, [leadWhatsAppMessages, selectedChatClient, newMessagesBeforeApiId]);

  // Real WhatsApp–style: play notification_whatsapp when inbound arrives in the open thread.
  // Never hydrate from a stale cache snapshot that will be replaced by an in-flight refetch —
  // that falsely treats history as a brand-new inbound and plays sound on open.
  useEffect(() => {
    if (!selectedChatClient) {
      inboundSoundHydratedRef.current = false;
      inboundSoundLatestIdRef.current = null;
      return;
    }
    if (!isChatMessagesFetched || !isChatMessagesSuccess) return;
    if (isFetchingChatMessages && !inboundSoundHydratedRef.current) return;

    preloadIncomingWhatsAppSound();

    const inboundIds = (leadWhatsAppMessages as any[])
      .filter((m) => m.direction === 'inbound' && typeof m.id === 'number')
      .map((m) => m.id as number);
    const latestId = inboundIds.length ? Math.max(...inboundIds) : null;

    if (!inboundSoundHydratedRef.current) {
      inboundSoundLatestIdRef.current = latestId;
      inboundSoundHydratedRef.current = true;
      return;
    }

    if (latestId != null && (inboundSoundLatestIdRef.current == null || latestId > inboundSoundLatestIdRef.current)) {
      playIncomingWhatsAppSound();
    }
    if (latestId != null) {
      inboundSoundLatestIdRef.current = latestId;
    }
  }, [
    leadWhatsAppMessages,
    selectedChatClient?.id,
    selectedChatPhone,
    isChatMessagesFetched,
    isChatMessagesSuccess,
    isFetchingChatMessages,
  ]);

  useEffect(() => {
    if (!selectedChatClient) return;
    void refetchWaSession();
  }, [selectedChatClient?.id, selectedChatPhone, refetchWaSession]);

  // Upgrade manual chat → CRM lead when accessible
  useEffect(() => {
    if (!selectedChatPhone || !selectedChatClient) return;
    if (!isManualChatClient(selectedChatClient)) return;
    let cancelled = false;
    getWhatsAppContactByPhoneAPI(selectedChatPhone)
      .then((contact) => {
        if (cancelled || !contact?.id) return;
        setSelectedChatClient({
          id: contact.id,
          name: contact.name,
          phone_number: contact.phone_number || selectedChatPhone,
          lead_company_name: contact.lead_company_name || contact.company_name || '',
        });
        saveSelectedManualPhone(companyId, null);
        refetchConversations();
        refetchLeadWhatsApp();
      })
      .catch((e: any) => {
        const key = e?.error_key || e?.code;
        if (key === 'whatsapp_contact_not_found' || e?.status === 404) {
          setChatToast({
            message: t('whatsappContactNotFound') || 'Contact not found',
            variant: 'warning',
          });
          setSelectedChatClient(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedChatPhone, selectedChatClient?.id, companyId]);

  useEffect(() => {
    if (!selectedChatClient) {
      markReadClientKeyRef.current = '';
      return;
    }
    if (isManualChatClient(selectedChatClient) && typeof selectedChatClient.id !== 'number') {
      return;
    }
    const key =
      typeof selectedChatClient.id === 'number'
        ? `c:${selectedChatClient.id}`
        : `p:${normalizeChatPhone(selectedChatClient)}`;
    if (!key || key === 'p:' || markReadClientKeyRef.current === key) return;
    markReadClientKeyRef.current = key;
    if (typeof selectedChatClient.id === 'number') {
      markConversationRead.mutate({ clientId: selectedChatClient.id });
      return;
    }
    const phone = normalizeChatPhone(selectedChatClient);
    if (!phone) return;
    markConversationRead.mutate({ phone });
  }, [selectedChatClient?.id, selectedChatPhone]);

  useEffect(() => {
    if (!leadWhatsAppMessages.length) return;
    setOptimisticMessages((prev) => prev.filter((m) => m.status === 'sending' || m.status === 'failed'));
  }, [leadWhatsAppMessages]);

  useEffect(() => {
    if (!companyId) return;
    const merged = mergeManualConversations(companyId);
    // Staff cannot keep orphan manual numbers
    setExtraConversations(isStaff ? [] : merged);
    manualChatsHydratedRef.current = true;
    if (isStaff) return;
    const phone = loadSelectedManualPhone(companyId);
    if (!phone) return;
    const match = merged.find((e) => normalizeChatPhone(e.client) === phone);
    const client = match?.client ?? buildManualClientForPhone(phone);
    if (!match) {
      setExtraConversations((prev) => {
        if (prev.some((e) => normalizeChatPhone(e.client) === phone)) return prev;
        return [{ client }, ...prev];
      });
    }
    setSelectedChatClient(client);
    setOptimisticMessages(loadManualMessages(companyId, phone));
  }, [companyId, isStaff]);

  useEffect(() => {
    if (!companyId || !manualChatsHydratedRef.current || isStaff) return;
    saveManualConversations(companyId, extraConversations);
  }, [companyId, extraConversations, isStaff]);

  const { data: templates = [] } = useQuery({
    queryKey: ['messageTemplates'],
    queryFn: getMessageTemplatesAPI,
  });

  const approvedWaTemplates = useMemo(
    () =>
      (templates as MessageTemplateType[]).filter((tpl) => {
        const ch = (tpl.channel_type || '').toLowerCase();
        if (ch !== 'whatsapp' && ch !== 'whatsapp_api') return false;
        return (tpl.meta_status || '').toUpperCase() === 'APPROVED';
      }),
    [templates]
  );

  const conversations = useMemo(() => {
    const fromApi = (conversationsList as any[]).map((c: any) => ({
      client: {
        id: c.id,
        name: c.name,
        phone_number: c.phone_number || '',
        lead_company_name: c.lead_company_name || '',
      },
      lastMessagePreview: c.last_message_preview || '',
      lastMessageAt: c.last_message_at || null,
      unreadCount: Number(c.unread_count) > 0 ? Number(c.unread_count) : 0,
    }));
    const extra = extraConversations.filter((e) => {
      const ep = normalizeChatPhone(e.client);
      return !fromApi.some((a) => {
        const ap = normalizeChatPhone(a.client);
        return a.client.id === e.client.id || (ep && ap === ep);
      });
    });
    return [
      ...fromApi,
      ...extra.map((e) => ({
        client: e.client,
        lastMessagePreview: '',
        lastMessageAt: null,
        unreadCount: 0,
      })),
    ];
  }, [conversationsList, extraConversations]);

  const formatChatTime = () =>
    new Date().toLocaleTimeString(
      language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
      withLatinDigits({ hour: '2-digit', minute: '2-digit' })
    );

  const newChatMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const ensureManualListed = (client: any) => {
    const phone = normalizeChatPhone(client);
    if (!phone || !isManualChatClient(client) || isStaff) return;
    setExtraConversations((prev) => {
      if (prev.some((c) => normalizeChatPhone(c.client) === phone)) return prev;
      return [{ client }, ...prev];
    });
  };

  const pushOptimistic = (client: any, updater: (prev: ManualChatMessage[]) => ManualChatMessage[]) => {
    ensureManualListed(client);
    setOptimisticMessages((prev) => {
      const next = updater(prev);
      if (isManualChatClient(client)) {
        const phone = normalizeChatPhone(client);
        if (phone && companyId) saveManualMessages(companyId, phone, next);
      }
      return next;
    });
  };

  const selectChatClient = (client: any) => {
    setChatToast(null);
    setComposerAlert(null);
    setPendingAttachment(null);
    setPendingIsVoiceNote(false);
    setSelectedChatClient(client);
    const phone = normalizeChatPhone(client);
    if (isManualChatClient(client)) {
      setOptimisticMessages(phone && companyId ? loadManualMessages(companyId, phone) : []);
      saveSelectedManualPhone(companyId, phone || null);
    } else {
      setOptimisticMessages([]);
      saveSelectedManualPhone(companyId, null);
    }
  };

  const autoOpenedChatLeadRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      autoOpenedChatLeadRef.current = null;
    };
  }, []);

  // Open a lead conversation when navigating from notifications / View Lead "Open in Chats"
  // / the WhatsApp button on a phone number. `pendingChatPhone` is set when the caller
  // picked a specific number, so a lead with several numbers opens the right thread —
  // and it always re-opens, even for the lead already showing.
  useEffect(() => {
    const leadId = selectedLead?.id;
    if (typeof leadId !== 'number') return;
    if (!pendingChatPhone && autoOpenedChatLeadRef.current === leadId) return;

    const match = conversations.find((c) => c.client?.id === leadId);
    const base =
      match?.client ??
      ({
        id: selectedLead.id,
        name: selectedLead.name,
        phone_number:
          selectedLead.phone ||
          selectedLead.phoneNumbers?.find((p) => p.is_primary)?.phone_number ||
          selectedLead.phoneNumbers?.[0]?.phone_number ||
          '',
        lead_company_name: selectedLead.leadCompanyName || '',
      } as const);
    const client = pendingChatPhone ? { ...base, phone_number: pendingChatPhone } : base;

    autoOpenedChatLeadRef.current = leadId;
    selectChatClient(client);
    if (pendingChatPhone) setPendingChatPhone(null);
  }, [selectedLead?.id, pendingChatPhone, conversations, selectedLead]);

  const addConversation = async (client: any) => {
    // Manual phone: resolve via API (staff get not-found for foreign/unassigned)
    if (isManualChatClient(client)) {
      const phone = normalizeChatPhone(client);
      try {
        const contact = await getWhatsAppContactByPhoneAPI(phone);
        if (contact?.id) {
          selectChatClient({
            id: contact.id,
            name: contact.name,
            phone_number: contact.phone_number || phone,
            lead_company_name: contact.lead_company_name || '',
          });
          return;
        }
        if (isStaff) {
          setChatToast({
            message: t('whatsappContactNotFound') || 'Contact not found',
            variant: 'warning',
          });
          return;
        }
      } catch (e: any) {
        const key = e?.error_key || e?.code;
        if (key === 'whatsapp_contact_not_found' || e?.status === 404) {
          setChatToast({
            message: t('whatsappContactNotFound') || 'Contact not found',
            variant: 'warning',
          });
          return;
        }
      }
    }
    ensureManualListed(client);
    selectChatClient(client);
  };

  const mapApiErrorToComposer = (e: any) => {
    const key = e?.error_key || e?.code || '';
    if (key === 'whatsapp_display_name_not_approved') {
      setComposerAlert({
        variant: 'error',
        message: t('whatsapp_display_name_not_approved'),
      });
      return;
    }
    if (key === 'whatsapp_outside_session_use_template') {
      setComposerAlert({
        variant: 'warning',
        message:
          t('whatsappOutsideSessionUseTemplate') ||
          'Outside the 24-hour window. Send an approved template instead.',
      });
      return;
    }
    if (key === 'whatsapp_template_not_found_or_language') {
      setComposerAlert({
        variant: 'error',
        message: t('whatsapp_template_not_found_or_language'),
      });
      return;
    }
    if (key === 'whatsapp_contact_not_found') {
      setChatToast({ message: t('whatsappContactNotFound') || 'Contact not found', variant: 'warning' });
      return;
    }
    if (key === 'whatsapp_voice_note_requires_ogg') {
      showAlert(t('whatsapp_voice_note_requires_ogg'), 'error');
      return;
    }
    showAlert(resolveLocalizedApiError(e, t, t('error') || 'Error'), 'error');
  };

  const sendOutbound = async (
    client: any,
    msgId: string,
    payload:
      | { kind: 'text'; body: string }
      | { kind: 'template'; templateId: number; previewBody: string }
      | { kind: 'media'; file: File; caption: string; isVoiceNote: boolean }
      | {
          kind: 'location';
          latitude: number;
          longitude: number;
          name?: string;
          address?: string;
        }
  ) => {
    const to = normalizeChatPhone(client);
    if (!to) {
      showAlert(t('sms_error_invalid_to_number') || 'No phone number', 'warning');
      return;
    }
    try {
      if (payload.kind === 'template') {
        await sendWhatsAppTemplateAPI({
          to,
          template_id: payload.templateId,
          client_id: typeof client.id === 'number' ? client.id : undefined,
        });
      } else if (payload.kind === 'media') {
        await sendWhatsAppMediaAPI({
          to,
          file: payload.file,
          caption: payload.caption || undefined,
          client_id: typeof client.id === 'number' ? client.id : undefined,
          is_voice_note: payload.isVoiceNote,
        });
        mediaResendFilesRef.current.delete(msgId);
      } else if (payload.kind === 'location') {
        await sendWhatsAppLocationAPI({
          to,
          latitude: payload.latitude,
          longitude: payload.longitude,
          name: payload.name,
          address: payload.address,
          client_id: typeof client.id === 'number' ? client.id : undefined,
        });
        locationResendRef.current.delete(msgId);
      } else {
        await sendWhatsAppMessageAPI({
          to,
          message: payload.body,
          client_id: typeof client.id === 'number' ? client.id : undefined,
        });
      }
      pushOptimistic(client, (prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, status: 'sent' as const } : m))
      );
      setComposerAlert(null);
      await refetchLeadWhatsApp();
      await refetchConversations();
      await refetchWaSession();
    } catch (e: any) {
      pushOptimistic(client, (prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, status: 'failed' as const, deliveryError: resolveLocalizedApiError(e, t, '') }
            : m
        )
      );
      mapApiErrorToComposer(e);
    }
  };

  const handleSendLocation = async (payload: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }) => {
    if (!selectedChatClient) return;
    if (whatsappSendBlocked) {
      showAlert(t('whatsappReconnectRequired') || 'WhatsApp disconnected', 'warning');
      return;
    }
    if (blockFreeText) {
      setComposerAlert({
        variant: 'warning',
        message:
          t('whatsappOutsideSessionUseTemplate') ||
          'Outside the 24-hour window. Send an approved template instead.',
      });
      return;
    }
    const preview =
      payload.name && payload.address
        ? `${payload.name} — ${payload.address}`
        : payload.name || payload.address || t('whatsappMediaLocationPlaceholder');
    const msgId = newChatMessageId();
    locationResendRef.current.set(msgId, payload);
    pushOptimistic(selectedChatClient, (prev) => [
      ...prev,
      {
        id: msgId,
        body: preview,
        direction: 'out',
        time: formatChatTime(),
        status: 'sending',
        sendKind: 'location',
        createdByUsername: currentUser?.username,
        attachmentKind: 'location',
        locationLatitude: payload.latitude,
        locationLongitude: payload.longitude,
        locationName: payload.name || null,
        locationAddress: payload.address || null,
      },
    ]);
    setShareLocationSending(true);
    try {
      await sendOutbound(selectedChatClient, msgId, { kind: 'location', ...payload });
      setShareLocationOpen(false);
    } finally {
      setShareLocationSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChatClient) return;
    if (!messageInput.trim() && !pendingAttachment) return;
    if (whatsappSendBlocked) {
      showAlert(t('whatsappReconnectRequired') || 'WhatsApp disconnected', 'warning');
      return;
    }
    if (blockFreeText) {
      setComposerAlert({
        variant: 'warning',
        message:
          t('whatsappOutsideSessionUseTemplate') ||
          'Outside the 24-hour window. Send an approved template instead.',
      });
      return;
    }
    const body = messageInput.trim();
    let file = pendingAttachment;
    const isVoice = pendingIsVoiceNote;
    setMessageInput('');
    setPendingAttachment(null);
    setPendingIsVoiceNote(false);

    if (file && file.type.startsWith('image/') && file.type !== 'image/gif') {
      setCompressingAttachment(true);
      try {
        file = await compressImageForChat(file);
      } catch {
        // keep original
      } finally {
        setCompressingAttachment(false);
      }
    }

    const msgId = newChatMessageId();
    if (file) {
      const kind = inferChatAttachmentKind(file);
      const previewUrl = URL.createObjectURL(file);
      mediaResendFilesRef.current.set(msgId, { file, isVoiceNote: isVoice });
      pushOptimistic(selectedChatClient, (prev) => [
        ...prev,
        {
          id: msgId,
          body,
          direction: 'out',
          time: formatChatTime(),
          status: 'sending',
          sendKind: 'media',
          createdByUsername: currentUser?.username,
          attachmentKind: kind,
          attachmentUrl: previewUrl,
          attachmentFilename: file!.name,
          isVoiceNote: isVoice,
        },
      ]);
      await sendOutbound(selectedChatClient, msgId, {
        kind: 'media',
        file,
        caption: body,
        isVoiceNote: isVoice,
      });
      return;
    }

    pushOptimistic(selectedChatClient, (prev) => [
      ...prev,
      {
        id: msgId,
        body,
        direction: 'out',
        time: formatChatTime(),
        status: 'sending',
        sendKind: 'text',
        createdByUsername: currentUser?.username,
      },
    ]);
    await sendOutbound(selectedChatClient, msgId, { kind: 'text', body });
  };

  const handleSendTemplate = async () => {
    if (!selectedChatClient || !chatTemplateSendId) return;
    if (whatsappSendBlocked) {
      showAlert(t('whatsappReconnectRequired') || 'WhatsApp disconnected', 'warning');
      return;
    }
    const tpl = approvedWaTemplates.find((x) => x.id === chatTemplateSendId);
    if (!tpl) return;
    setChatTemplateSending(true);
    const preview = replaceTemplatePlaceholders(tpl.content || tpl.name, selectedChatClient, {
      tenantCompanyName: companyName,
      variableMap: tpl.meta_variable_map?.body ?? undefined,
      senderName,
    });
    const msgId = newChatMessageId();
    pushOptimistic(selectedChatClient, (prev) => [
      ...prev,
      {
        id: msgId,
        body: preview,
        direction: 'out',
        time: formatChatTime(),
        status: 'sending',
        sendKind: 'template',
        templateId: tpl.id,
        createdByUsername: currentUser?.username,
      } as any,
    ]);
    try {
      await sendOutbound(selectedChatClient, msgId, {
        kind: 'template',
        templateId: tpl.id,
        previewBody: preview,
      });
    } finally {
      setChatTemplateSending(false);
    }
  };

  const threadMessages: ChatBubbleMessage[] = useMemo(() => {
    const apiMsgs = (leadWhatsAppMessages as any[])
      .map((wa) => {
        const delivery = String(wa.delivery_status || 'sent').toLowerCase();
        let status: ChatBubbleMessage['status'] = 'sent';
        if (delivery === 'failed') status = 'failed';
        else if (delivery === 'delivered') status = 'delivered';
        else if (delivery === 'read') status = 'read';
        const msgPhoneId = String(wa.phone_number_id || '').trim();
        const fromPreviousNumber = Boolean(
          currentWhatsAppPhoneNumberId &&
            msgPhoneId &&
            msgPhoneId !== currentWhatsAppPhoneNumberId
        );
        return {
          id: `api-${wa.id}`,
          body: wa.body,
          direction: (wa.direction === 'outbound' ? 'out' : 'in') as 'in' | 'out',
          time: new Date(wa.created_at).toLocaleTimeString(
            language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
            withLatinDigits({ hour: '2-digit', minute: '2-digit' })
          ),
          createdAt: wa.created_at,
          status,
          deliveryError: wa.delivery_error || undefined,
          createdByUsername: wa.created_by_username || null,
          apiId: wa.id,
          attachmentKind: wa.attachment_kind || null,
          attachmentUrl: wa.attachment_url || null,
          attachmentFilename: wa.original_filename || null,
          attachmentWidth: wa.attachment_width ?? null,
          attachmentHeight: wa.attachment_height ?? null,
          isVoiceNote: Boolean(wa.is_voice_note),
          locationLatitude:
            wa.location_latitude != null && wa.location_latitude !== ''
              ? Number(wa.location_latitude)
              : null,
          locationLongitude:
            wa.location_longitude != null && wa.location_longitude !== ''
              ? Number(wa.location_longitude)
              : null,
          locationName: wa.location_name || null,
          locationAddress: wa.location_address || null,
          fromPreviousNumber,
        };
      })
      .reverse();
    const optimistic: ChatBubbleMessage[] = optimisticMessages.map((m) => ({
      id: m.id!,
      body: m.body,
      direction: m.direction,
      time: m.time,
      createdAt: new Date().toISOString(),
      status: m.status,
      deliveryError: m.deliveryError,
      createdByUsername: m.createdByUsername || currentUser?.username,
      attachmentKind: m.attachmentKind,
      attachmentUrl: m.attachmentUrl,
      attachmentFilename: m.attachmentFilename,
      isVoiceNote: m.isVoiceNote,
      locationLatitude: m.locationLatitude ?? null,
      locationLongitude: m.locationLongitude ?? null,
      locationName: m.locationName ?? null,
      locationAddress: m.locationAddress ?? null,
    }));
    return [...apiMsgs, ...optimistic];
  }, [
    leadWhatsAppMessages,
    optimisticMessages,
    language,
    currentUser?.username,
    currentWhatsAppPhoneNumberId,
  ]);

  const mediaAlbum = useMemo(
    () =>
      buildChatMediaAlbum(
        threadMessages.map((m) => ({
          id: m.id,
          kind: m.attachmentKind,
          url: m.attachmentUrl,
          filename: m.attachmentFilename,
          width: m.attachmentWidth,
          height: m.attachmentHeight,
        }))
      ),
    [threadMessages]
  );

  useEffect(() => {
    setMediaViewer(null);
  }, [selectedChatClient?.id]);

  const handleDeleteConversation = (client: any) => {
    const phone = normalizeChatPhone(client);
    const clientId = typeof client.id === 'number' ? client.id : undefined;
    setConfirmDeleteConfig({
      title: t('delete') || 'Delete',
      message: t('deleteConversationConfirm') || 'Delete this conversation?',
      itemName: phone || String(client.id),
      confirmButtonText: t('delete'),
      confirmButtonVariant: 'danger',
      onConfirm: async () => {
        try {
          await deleteWhatsAppConversationAPI({ clientId, phone: phone || undefined });
          if (phone && companyId) removeManualConversationForPhone(companyId, phone);
          setExtraConversations((prev) =>
            prev.filter((e) => normalizeChatPhone(e.client) !== phone)
          );
          if (selectedChatClient && (selectedChatClient.id === client.id || normalizeChatPhone(selectedChatClient) === phone)) {
            setSelectedChatClient(null);
          }
          refetchConversations();
        } catch (e: any) {
          showAlert(resolveLocalizedApiError(e, t, 'Delete failed'), 'error');
        }
      },
    });
    setIsConfirmDeleteModalOpen(true);
  };

  const handleDeleteMessage = (msg: ChatBubbleMessage) => {
    setDeletingMessageId(msg.id);
    const run = async () => {
      try {
        if (msg.apiId) {
          await deleteWhatsAppMessageAPI(msg.apiId);
          await refetchLeadWhatsApp();
        } else if (selectedChatClient) {
          pushOptimistic(selectedChatClient, (prev) => prev.filter((m) => m.id !== msg.id));
        }
      } catch (e: any) {
        showAlert(resolveLocalizedApiError(e, t, 'Delete failed'), 'error');
      } finally {
        setDeletingMessageId(null);
      }
    };
    void run();
  };

  const handleResend = async (msg: ChatBubbleMessage) => {
    if (!selectedChatClient || !msg.id) return;
    setResendingMessageId(msg.id);
    try {
      const media = mediaResendFilesRef.current.get(msg.id);
      const location = locationResendRef.current.get(msg.id);
      pushOptimistic(selectedChatClient, (prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, status: 'sending' as const, deliveryError: undefined } : m
        )
      );
      if (media) {
        await sendOutbound(selectedChatClient, msg.id, {
          kind: 'media',
          file: media.file,
          caption: msg.body || '',
          isVoiceNote: media.isVoiceNote,
        });
      } else if (location) {
        await sendOutbound(selectedChatClient, msg.id, {
          kind: 'location',
          ...location,
        });
      } else {
        await sendOutbound(selectedChatClient, msg.id, { kind: 'text', body: msg.body });
      }
    } finally {
      setResendingMessageId(null);
    }
  };

  if (!chatAccessAllowed) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 p-6 text-center">
        <IntegrationPlatformIcon platform="whatsapp" size="sm" variant="inline" />
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl">{t('chats')}</h1>
        <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
          {t('whatsappChatAccessDisabled') || 'You do not have access to WhatsApp Chats.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2 sm:p-3 md:p-4">
      <div className="flex shrink-0 items-center gap-2 px-0.5">
        <IntegrationPlatformIcon platform="whatsapp" size="sm" variant="inline" />
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl">{t('chats')}</h1>
        <PageHelpVideoButton pageKey="chats" />
      </div>
      <div className="min-h-0 flex-1">
        <WhatsAppChatLayout
          t={t}
          language={language}
          conversations={conversations}
          selectedClient={selectedChatClient}
          onSelectClient={selectChatClient}
          onStartNew={() => setIsStartNewOpen(true)}
          onDeleteConversation={handleDeleteConversation}
          messages={threadMessages}
          threadCalls={threadCalls}
          newMessagesBeforeApiId={newMessagesBeforeApiId}
          isFetchingMessages={isFetchingChatMessages}
          onRefreshMessages={() => {
            void refetchLeadWhatsApp();
            void refetchWaSession();
            void refetchThreadCalls();
          }}
          onWhatsAppCall={() => {
            if (!selectedChatClient || !whatsappCalling) return;
            if (whatsappCalling.isStartingOutbound) return;
            const phone =
              selectedChatClient.phone_number ||
              selectedChatClient.phone ||
              selectedChatClient.manual_phone ||
              '';
            if (!phone) return;
            void whatsappCalling.startOutboundCall({
              to: String(phone),
              clientId:
                typeof selectedChatClient.id === 'number' ? selectedChatClient.id : undefined,
            });
          }}
          isWhatsAppCalling={Boolean(
            whatsappCalling?.isStartingOutbound ||
              whatsappCalling?.phase === 'connecting' ||
              whatsappCalling?.phase === 'ringing'
          )}
          onViewCalls={() => {
            if (!selectedChatClient) return;
            const id =
              typeof selectedChatClient.id === 'number'
                ? selectedChatClient.id
                : Number(selectedChatClient.id);
            if (!Number.isFinite(id) || id <= 0 || isManualChatClient(selectedChatClient)) {
              openCallsFiltered({
                search: String(
                  selectedChatClient.phone_number ||
                    selectedChatClient.phone ||
                    selectedChatClient.manual_phone ||
                    ''
                ).replace(/\s+/g, ''),
              });
              return;
            }
            openCallsFiltered({ clientId: String(id) });
          }}
          onDeleteMessage={handleDeleteMessage}
          onResendMessage={handleResend}
          deletingMessageId={deletingMessageId}
          resendingMessageId={resendingMessageId}
          onOpenMedia={(msg) => {
            setMediaViewer({
              items: mediaAlbum,
              index: findChatMediaAlbumIndex(mediaAlbum, String(msg.id)),
            });
          }}
          composerProps={{
            messageInput,
            setMessageInput,
            onSend: handleSendMessage,
            whatsappSendBlocked,
            blockFreeText,
            approvedTemplates: approvedWaTemplates,
            chatTemplateSendId,
            setChatTemplateSendId,
            onSendTemplate: handleSendTemplate,
            chatTemplateSending,
            session: effectiveSession,
            displayNameBlockedHint,
            composerAlert,
            pendingAttachment,
            setPendingAttachment,
            pendingIsVoiceNote,
            setPendingIsVoiceNote,
            compressingAttachment,
            onShareLocation: () => {
              if (whatsappSendBlocked || blockFreeText) return;
              setShareLocationOpen(true);
            },
            onOpenPendingMedia: (_url, kind) => {
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
            onInsertQuickTemplate: (content, templateId) => {
              if (blockFreeText || whatsappSendBlocked) return;
              const tpl = templateId
                ? approvedWaTemplates.find((x) => x.id === templateId)
                : undefined;
              const resolved = replaceTemplatePlaceholders(content, selectedChatClient, {
                tenantCompanyName: companyName,
                variableMap: tpl?.meta_variable_map?.body ?? undefined,
                senderName,
              });
              setMessageInput((prev) => (prev ? `${prev}\n${resolved}` : resolved));
              if (templateId) setChatTemplateSendId(templateId);
            },
          }}
        />
      </div>
      <StartNewConversationModal
        isOpen={isStartNewOpen}
        onClose={() => setIsStartNewOpen(false)}
        t={t}
        onSelectClient={(c) => {
          void addConversation(c);
        }}
      />
      <ShareLocationModal
        isOpen={shareLocationOpen}
        onClose={() => {
          if (!shareLocationSending) setShareLocationOpen(false);
        }}
        onSend={handleSendLocation}
        sending={shareLocationSending}
        t={t}
      />
      {chatToast && (
        <ChatToast
          message={chatToast.message}
          variant={chatToast.variant}
          onDismiss={() => setChatToast(null)}
        />
      )}
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
