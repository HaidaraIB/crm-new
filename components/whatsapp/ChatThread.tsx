import React, { useEffect, useRef } from 'react';
import { PhoneText, isPhoneLike } from '../index';
import { RefreshIcon, PhoneIcon, ListIcon } from '../icons';
import {
  getWhatsAppContactAvatarLabel,
  getWhatsAppContactSubtitle,
  getWhatsAppContactTitle,
} from '../../utils/whatsappContactDisplay';
import { ChatMessageBubble, type ChatBubbleMessage } from './ChatMessageBubble';
import { ChatComposer, type SessionInfo } from './ChatComposer';
import {
  WA_AVATAR,
  WA_HEADER_BAR,
  WA_HEADER_TEXT,
  WA_THREAD_WALLPAPER,
} from './whatsappChatTheme';
import type { MessageTemplateType } from '../../services/api';
import { translations } from '../../constants';

type Props = {
  t: (key: keyof typeof translations.en) => string;
  selectedClient: any | null;
  messages: ChatBubbleMessage[];
  isFetching?: boolean;
  onRefresh?: () => void;
  onWhatsAppCall?: () => void;
  isWhatsAppCalling?: boolean;
  onViewCalls?: () => void;
  onDeleteMessage?: (msg: ChatBubbleMessage) => void;
  onResendMessage?: (msg: ChatBubbleMessage) => void;
  deletingMessageId?: string | null;
  resendingMessageId?: string | null;
  onOpenMedia?: (msg: ChatBubbleMessage) => void;
  composerProps: Omit<React.ComponentProps<typeof ChatComposer>, 't'>;
  emptyHint?: string;
};

export const ChatThread: React.FC<Props> = ({
  t,
  selectedClient,
  messages,
  isFetching,
  onRefresh,
  onWhatsAppCall,
  isWhatsAppCalling,
  onViewCalls,
  onDeleteMessage,
  onResendMessage,
  deletingMessageId,
  resendingMessageId,
  onOpenMedia,
  composerProps,
  emptyHint,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedClient?.id]);

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
            disabled={isWhatsAppCalling}
            className="rounded-full p-2 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
            aria-label={t('whatsappCallButton')}
            title={isWhatsAppCalling ? t('whatsappCallStarting') : t('whatsappCallButton')}
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
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full p-2 hover:bg-white/10"
            aria-label={t('refresh')}
          >
            <RefreshIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar ${WA_THREAD_WALLPAPER}`}
        dir="ltr"
        lang="und"
      >
        <div className="mt-auto flex flex-col space-y-2 px-3 py-2">
          {messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              msg={msg}
              t={t}
              onDelete={onDeleteMessage}
              onResend={onResendMessage}
              deleting={deletingMessageId === msg.id}
              resending={resendingMessageId === msg.id}
              onOpenMedia={onOpenMedia}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0">
        <ChatComposer t={t} {...composerProps} />
      </div>
    </div>
  );
};

export type { SessionInfo, MessageTemplateType };
