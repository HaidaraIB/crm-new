import React from 'react';
import { ConversationList, type ConversationRow, type ConversationListAction } from './ConversationList';
import { ChatThread } from './ChatThread';
import type { ChatBubbleMessage } from './ChatMessageBubble';
import type { ChatThreadCall } from './ChatCallBubble';
import type { SessionInfo } from './ChatComposer';
import type { MessageTemplateType } from '../../services/api';
import { translations } from '../../constants';

type Props = {
  t: (key: keyof typeof translations.en) => string;
  language: string;
  conversations: ConversationRow[];
  selectedClient: any | null;
  onSelectClient: (client: any) => void;
  onStartNew: () => void;
  onDeleteConversation?: (client: any) => void;
  onConversationAction?: (client: any, action: ConversationListAction) => void;
  search: string;
  onSearchChange: (value: string) => void;
  unreplied: boolean;
  onUnrepliedChange: (value: boolean) => void;
  totalCount?: number;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
  conversationStatus?: string;
  isStarred?: boolean;
  isUnsubscribed?: boolean;
  onThreadStatusChange?: (payload: {
    status?: string;
    snoozedUntil?: string;
    isStarred?: boolean;
    isUnsubscribed?: boolean;
  }) => void;
  messages: ChatBubbleMessage[];
  threadCalls?: ChatThreadCall[];
  newMessagesBeforeApiId?: number | null;
  isFetchingMessages?: boolean;
  isLoadingMessages?: boolean;
  onRefreshMessages?: () => void;
  onWhatsAppCall?: () => void;
  isWhatsAppCalling?: boolean;
  whatsappCallBlocked?: boolean;
  onViewCalls?: () => void;
  onDeleteMessage?: (msg: ChatBubbleMessage) => void;
  onResendMessage?: (msg: ChatBubbleMessage) => void;
  deletingMessageId?: string | null;
  resendingMessageId?: string | null;
  onOpenMedia?: (msg: ChatBubbleMessage) => void;
  composerProps: React.ComponentProps<typeof ChatThread>['composerProps'];
};

export const WhatsAppChatLayout: React.FC<Props> = (props) => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:flex-row">
      <ConversationList
        conversations={props.conversations}
        selectedId={props.selectedClient?.id}
        onSelect={props.onSelectClient}
        onStartNew={props.onStartNew}
        onDeleteConversation={props.onDeleteConversation}
        onConversationAction={props.onConversationAction}
        search={props.search}
        onSearchChange={props.onSearchChange}
        unreplied={props.unreplied}
        onUnrepliedChange={props.onUnrepliedChange}
        t={props.t}
        language={props.language}
        totalCount={props.totalCount}
        hasMore={props.hasMore}
        isFetchingMore={props.isFetchingMore}
        onLoadMore={props.onLoadMore}
      />
      <ChatThread
        t={props.t}
        language={props.language}
        selectedClient={props.selectedClient}
        messages={props.messages}
        threadCalls={props.threadCalls}
        newMessagesBeforeApiId={props.newMessagesBeforeApiId}
        isFetching={props.isFetchingMessages}
        isLoading={props.isLoadingMessages}
        onRefresh={props.onRefreshMessages}
        onWhatsAppCall={props.onWhatsAppCall}
        isWhatsAppCalling={props.isWhatsAppCalling}
        whatsappCallBlocked={props.whatsappCallBlocked}
        onViewCalls={props.onViewCalls}
        onDeleteMessage={props.onDeleteMessage}
        onResendMessage={props.onResendMessage}
        deletingMessageId={props.deletingMessageId}
        resendingMessageId={props.resendingMessageId}
        onOpenMedia={props.onOpenMedia}
        composerProps={props.composerProps}
        conversationStatus={props.conversationStatus}
        isStarred={props.isStarred}
        isUnsubscribed={props.isUnsubscribed}
        onThreadStatusChange={props.onThreadStatusChange}
      />
    </div>
  );
};

export type { ConversationRow, ChatBubbleMessage, SessionInfo, MessageTemplateType, ChatThreadCall, ConversationListAction };
