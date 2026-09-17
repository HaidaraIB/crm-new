import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PhoneText, isPhoneLike, RefreshButton } from '../index';
import { RefreshIcon, PhoneIcon, ListIcon, ChatBubbleIcon } from '../icons';
import {
  getWhatsAppContactAvatarLabel,
  getWhatsAppContactSubtitle,
  getWhatsAppContactTitle,
} from '../../utils/whatsappContactDisplay';
import { ChatMessageBubble, type ChatBubbleMessage } from './ChatMessageBubble';
import { ChatCallBubble, type ChatThreadCall } from './ChatCallBubble';
import { ChatStatusSeparator } from './ChatStatusSeparator';
import { ChatComposer, type SessionInfo } from './ChatComposer';
import { ChatConversationStatusMenu } from '../chat/ChatConversationStatusMenu';
import {
  WA_AVATAR,
  WA_HEADER_BAR,
  WA_HEADER_TEXT,
  WA_THREAD_WALLPAPER,
} from './whatsappChatTheme';
import type { MessageTemplateType } from '../../services/api';
import { translations } from '../../constants';
import { buildWhatsAppThreadItems } from '../../utils/whatsappThreadItems';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';

/** Slack under the divider when opening on unread, so the last read message stays visible above it. */
const NEW_DIVIDER_TOP_GAP_PX = 24;
const THREAD_NEAR_BOTTOM_PX = 80;
/**
 * How long after opening a conversation the transcript is still considered to be
 * settling: long enough to cover the cached render being replaced by the fetch
 * (`refetchOnMount: 'always'`) and the blob media in it resolving to real heights.
 */
const OPEN_SETTLE_MS = 1500;

type Props = {
  t: (key: keyof typeof translations.en) => string;
  language: string;
  selectedClient: any | null;
  messages: ChatBubbleMessage[];
  threadCalls?: ChatThreadCall[];
  /** First unread inbound api id — inserts “New Messages” divider before it. */
  newMessagesBeforeApiId?: number | null;
  isFetching?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  onWhatsAppCall?: () => void;
  isWhatsAppCalling?: boolean;
  /** WhatsApp account missing/disconnected — disable call chrome. */
  whatsappCallBlocked?: boolean;
  onViewCalls?: () => void;
  onDeleteMessage?: (msg: ChatBubbleMessage) => void;
  onResendMessage?: (msg: ChatBubbleMessage) => void;
  deletingMessageId?: string | null;
  resendingMessageId?: string | null;
  onOpenMedia?: (msg: ChatBubbleMessage) => void;
  composerProps: Omit<React.ComponentProps<typeof ChatComposer>, 't'>;
  emptyHint?: string;
  conversationStatus?: string;
  isStarred?: boolean;
  isUnsubscribed?: boolean;
  onThreadStatusChange?: (payload: {
    status?: string;
    snoozedUntil?: string;
    isStarred?: boolean;
    isUnsubscribed?: boolean;
  }) => void;
};

export const ChatThread: React.FC<Props> = ({
  t,
  language,
  selectedClient,
  messages,
  threadCalls = [],
  newMessagesBeforeApiId = null,
  isFetching,
  isLoading,
  onRefresh,
  onWhatsAppCall,
  isWhatsAppCalling,
  whatsappCallBlocked = false,
  onViewCalls,
  onDeleteMessage,
  onResendMessage,
  deletingMessageId,
  resendingMessageId,
  onOpenMedia,
  composerProps,
  emptyHint,
  conversationStatus = 'open',
  isStarred = false,
  isUnsubscribed = false,
  onThreadStatusChange,
}) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  /** Inner transcript column: its height grows as blob media resolves, so it is observed too. */
  const scrollerContentRef = useRef<HTMLDivElement | null>(null);
  const newDividerRef = useRef<HTMLDivElement | null>(null);
  const chatKey = `${selectedClient?.id ?? ''}|${selectedClient?.phone_number ?? ''}|${selectedClient?.manual_phone ?? ''}`;
  const hasSelection = !!selectedClient;

  const threadItems = useMemo(
    () =>
      buildWhatsAppThreadItems(messages, {
        language,
        t: t as (key: string) => string,
        newMessagesBeforeApiId,
        calls: threadCalls,
      }),
    [messages, threadCalls, language, t, newMessagesBeforeApiId]
  );

  const lastThreadItem = threadItems[threadItems.length - 1];
  const tailKey = lastThreadItem
    ? lastThreadItem.kind === 'message'
      ? `m:${lastThreadItem.msg.id}`
      : lastThreadItem.id
    : '';

  /**
   * Where this thread should sit *until the user scrolls it themselves*, or null
   * once they have.
   *
   * It has to be a standing instruction rather than a one-shot scroll. Media in
   * these bubbles is fetched into a blob URL, so every image and video renders as
   * a one-line placeholder first and only grows to its real height a few hundred
   * milliseconds later. A single scroll issued on open therefore targets an
   * offset that is about to stop being the bottom of the transcript, which is how
   * the thread ended up parked mid-conversation. The ResizeObserver below
   * re-applies this anchor every time the transcript changes height.
   */
  const openAnchorRef = useRef<'divider' | 'bottom' | null>('bottom');
  const anchorChatKeyRef = useRef<string>('');
  /** Set while we are moving the scroller ourselves, so our own scroll events do not read as the user taking over. */
  const programmaticScrollRef = useRef(false);
  /** True while the viewport is following the tail, so late media growth keeps it there. */
  const pinnedToBottomRef = useRef(true);
  const lastTailKeyRef = useRef<string>('');
  /** When this conversation was opened — bounds the settle window below. */
  const openedAtRef = useRef(0);

  const setScrollTop = useCallback((sc: HTMLDivElement, top: number) => {
    programmaticScrollRef.current = true;
    // Always an instant jump, never `behavior: 'smooth'`. A smooth scroll animates
    // toward an offset captured when it started, so anything that grows the
    // transcript mid-animation (media resolving, a poll landing) leaves it short
    // — and a second smooth scroll cancels the first outright.
    sc.scrollTop = top;
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, []);

  const applyOpenAnchor = useCallback(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const divider = newDividerRef.current;
    if (openAnchorRef.current === 'divider' && divider) {
      // Divider near the top of the viewport, so the unread messages it marks
      // read downward from it. Centring it (what this used to do) left the
      // newest message halfway up the screen with dead space below, which is
      // indistinguishable from the thread having stopped scrolling halfway.
      const offset =
        sc.scrollTop + (divider.getBoundingClientRect().top - sc.getBoundingClientRect().top);
      const top = Math.max(0, Math.min(offset - NEW_DIVIDER_TOP_GAP_PX, sc.scrollHeight - sc.clientHeight));
      setScrollTop(sc, top);
      return;
    }
    setScrollTop(sc, sc.scrollHeight);
  }, [setScrollTop]);

  useLayoutEffect(() => {
    if (anchorChatKeyRef.current !== chatKey) {
      anchorChatKeyRef.current = chatKey;
      openAnchorRef.current = 'bottom';
      pinnedToBottomRef.current = true;
      lastTailKeyRef.current = '';
      openedAtRef.current = Date.now();
    }
    // The unread id is captured by ChatsPage a commit after the messages land, so
    // the anchor starts at the tail and upgrades to the divider when there is one.
    if (openAnchorRef.current !== null) {
      openAnchorRef.current = newMessagesBeforeApiId ? 'divider' : 'bottom';
    }
  }, [chatKey, newMessagesBeforeApiId]);

  useLayoutEffect(() => {
    const sc = scrollerRef.current;
    if (!sc || threadItems.length === 0) return;
    const prevTailKey = lastTailKeyRef.current;
    lastTailKeyRef.current = tailKey;
    const tailGrew = prevTailKey !== '' && tailKey !== prevTailKey;

    // A message arriving *after* the thread has settled means the opening
    // position has been superseded — follow the tail, exactly as before. Inside
    // the settle window a longer tail is still part of opening (the cached
    // transcript being replaced by the refetch), so the anchor keeps precedence;
    // otherwise a thread with unread would be yanked off its divider by the
    // very fetch that discovered the unread.
    if (tailGrew && Date.now() - openedAtRef.current > OPEN_SETTLE_MS) {
      openAnchorRef.current = null;
    }

    if (openAnchorRef.current !== null) {
      applyOpenAnchor();
      return;
    }
    if (tailGrew) {
      pinnedToBottomRef.current = true;
      setScrollTop(sc, sc.scrollHeight);
    }
  }, [chatKey, newMessagesBeforeApiId, tailKey, threadItems.length, applyOpenAnchor, setScrollTop]);

  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const onScroll = () => {
      if (programmaticScrollRef.current) return;
      // The user has taken over — stop re-imposing the opening position.
      openAnchorRef.current = null;
      pinnedToBottomRef.current =
        sc.scrollHeight - sc.scrollTop - sc.clientHeight < THREAD_NEAR_BOTTOM_PX;
    };
    sc.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      if (openAnchorRef.current !== null) {
        applyOpenAnchor();
        return;
      }
      if (pinnedToBottomRef.current) setScrollTop(sc, sc.scrollHeight);
    });
    ro.observe(sc);
    if (scrollerContentRef.current) ro.observe(scrollerContentRef.current);
    return () => {
      sc.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
    // `hasSelection` is what mounts/unmounts the scroller; `chatKey` covers
    // switching between two conversations without it unmounting in between.
  }, [applyOpenAnchor, setScrollTop, chatKey, hasSelection]);

  if (!selectedClient) {
    return (
      <div className={`flex h-full min-h-0 flex-1 items-center justify-center ${WA_THREAD_WALLPAPER}`}>
        <p className="rounded-lg border border-gray-200/80 bg-white/90 px-4 py-2 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-300">
          {emptyHint || `${t('startNewConversation')} ${t('chooseClientFromDb')}`}
        </p>
      </div>
    );
  }

  const title = getWhatsAppContactTitle(selectedClient);
  const subtitle = getWhatsAppContactSubtitle(selectedClient);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-gray-900">
      <div className={`${WA_HEADER_BAR} ${WA_HEADER_TEXT} gap-3`}>
        <div className={`${WA_AVATAR} !h-9 !w-9 !bg-white/20 !text-white !ring-white/30`}>
          {getWhatsAppContactAvatarLabel(selectedClient)}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          {isPhoneLike(title) ? (
            <PhoneText as="p" className="truncate text-sm font-semibold">
              {title}
            </PhoneText>
          ) : (
            <p className="truncate text-sm font-semibold">{title}</p>
          )}
          {subtitle ? (
            isPhoneLike(subtitle) ? (
              <PhoneText className="block truncate text-xs opacity-80">{subtitle}</PhoneText>
            ) : (
              <p className="truncate text-xs opacity-80">{subtitle}</p>
            )
          ) : null}
        </div>
        {onThreadStatusChange && typeof selectedClient?.id === 'number' && selectedClient.id > 0 ? (
          <ChatConversationStatusMenu
            t={t}
            status={conversationStatus || 'open'}
            isStarred={isStarred}
            isUnsubscribed={isUnsubscribed}
            onChange={onThreadStatusChange}
          />
        ) : null}
        {onViewCalls && (
          <button
            type="button"
            onClick={onViewCalls}
            className="rounded-full p-2 hover:bg-white/10"
            aria-label={t('viewLeadCalls')}
            title={t('viewLeadCalls')}
          >
            <ListIcon className="h-4 w-4" />
          </button>
        )}
        {onWhatsAppCall && (
          <button
            type="button"
            onClick={onWhatsAppCall}
            disabled={isWhatsAppCalling || whatsappCallBlocked}
            className="rounded-full p-2 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t('whatsappCallButton')}
            title={
              whatsappCallBlocked
                ? t('whatsappReconnectRequired')
                : isWhatsAppCalling
                  ? t('whatsappCallStarting')
                  : t('whatsappCallButton')
            }
            aria-busy={isWhatsAppCalling || undefined}
          >
            {isWhatsAppCalling ? (
              <RefreshIcon className="h-4 w-4 animate-spin" />
            ) : (
              <PhoneIcon className="h-4 w-4" />
            )}
          </button>
        )}
        {onRefresh && (
          <RefreshButton
            scope="handler"
            iconOnly
            onClick={onRefresh}
            loading={Boolean(isFetching && !isLoading)}
            className="text-inherit"
          />
        )}
      </div>

      <div
        ref={scrollerRef}
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar ${WA_THREAD_WALLPAPER}`}
        dir="ltr"
        lang="und"
      >
        {threadItems.length === 0 ? (
          <div
            className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16 text-center"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ChatBubbleIcon className="size-10 opacity-90" aria-hidden />
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('whatsappThreadEmpty')}
            </p>
            <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              {t('whatsappThreadEmptyHint')}
            </p>
          </div>
        ) : (
        <div ref={scrollerContentRef} className="mt-auto flex flex-col space-y-2 px-3 py-2">
          {threadItems.map((item) => {
            if (item.kind === 'status') {
              return (
                <div
                  key={item.id}
                  ref={item.variant === 'new' ? newDividerRef : undefined}
                >
                  <ChatStatusSeparator variant={item.variant} label={item.label} />
                </div>
              );
            }
            if (item.kind === 'call') {
              const timeLabel = item.createdAt
                ? new Date(item.createdAt).toLocaleTimeString(
                    language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
                    withLatinDigits({ hour: '2-digit', minute: '2-digit' })
                  )
                : '';
              return (
                <ChatCallBubble
                  key={item.id}
                  call={item.call}
                  t={t}
                  timeLabel={timeLabel}
                  onCallback={onWhatsAppCall}
                />
              );
            }
            return (
              <ChatMessageBubble
                key={item.msg.id}
                msg={item.msg}
                t={t}
                onDelete={onDeleteMessage}
                onResend={onResendMessage}
                deleting={deletingMessageId === item.msg.id}
                resending={resendingMessageId === item.msg.id}
                onOpenMedia={onOpenMedia}
              />
            );
          })}
        </div>
        )}
      </div>

      <div className="shrink-0">
        <ChatComposer t={t} {...composerProps} />
      </div>
    </div>
  );
};

export type { SessionInfo, MessageTemplateType };
