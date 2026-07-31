import React, { useEffect, useRef } from 'react';
import { PhoneText, isPhoneLike } from '../index';
import { RefreshIcon } from '../icons';
import {
  getWhatsAppContactAvatarLabel,
  getWhatsAppContactSubtitle,
  getWhatsAppContactTitle,
} from '../../utils/whatsappContactDisplay';
import { ChatMessageBubble, type ChatBubbleMessage } from './ChatMessageBubble';
import { ChatComposer, type SessionInfo } from './ChatComposer';
import {
  WA_AVATAR,
  WA_HEADER_BG,
  WA_HEADER_TEXT,
  WA_THREAD_WALLPAPER,
} from './whatsappChatTheme';
import type { MessageTemplateType } from '../../services/api';

type Props = {
  t: (key: string) => string;
  selectedClient: any | null;
  messages: ChatBubbleMessage[];
  isFetching?: boolean;
  onRefresh?: () => void;
  onDeleteMessage?: (msg: ChatBubbleMessage) => void;
  onResendMessage?: (msg: ChatBubbleMessage) => void;
  deletingMessageId?: string | null;
  resendingMessageId?: string | null;
  composerProps: Omit<React.ComponentProps<typeof ChatComposer>, 't'>;
  emptyHint?: string;
};

export const ChatThread: React.FC<Props> = ({
  t,
  selectedClient,
  messages,
  isFetching,
  onRefresh,
  onDeleteMessage,
  onResendMessage,
  deletingMessageId,
  resendingMessageId,
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
      <div className={`${WA_HEADER_BG} ${WA_HEADER_TEXT} flex shrink-0 items-center gap-3 px-3 py-2`}>
        <div className={`${WA_AVATAR} !bg-white/20 !text-white !ring-white/30`}>
          {getWhatsAppContactAvatarLabel(selectedClient)}
        </div>
        <div className="min-w-0 flex-1">
          {isPhoneLike(title) ? (
            <PhoneText as="p" className="font-semibold truncate">
              {title}
            </PhoneText>
          ) : (
            <p className="font-semibold truncate">{title}</p>
          )}
          {subtitle ? (
            isPhoneLike(subtitle) ? (
              <PhoneText className="text-xs opacity-80 truncate block">{subtitle}</PhoneText>
            ) : (
              <p className="text-xs opacity-80 truncate">{subtitle}</p>
            )
          ) : null}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label={t('refresh') || 'Refresh'}
          >
            <RefreshIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div className={`min-h-0 flex-1 space-y-2 overflow-y-auto custom-scrollbar px-3 py-2 ${WA_THREAD_WALLPAPER}`}>
        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            msg={msg}
            t={t}
            onDelete={onDeleteMessage}
            onResend={onResendMessage}
            deleting={deletingMessageId === msg.id}
            resending={resendingMessageId === msg.id}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0">
        <ChatComposer t={t} {...composerProps} />
      </div>
    </div>
  );
};

export type { SessionInfo, MessageTemplateType };
