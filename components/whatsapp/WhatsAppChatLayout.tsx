import React from 'react';
import { ConversationList, type ConversationRow } from './ConversationList';
import { ChatThread } from './ChatThread';
import type { ChatBubbleMessage } from './ChatMessageBubble';
import type { SessionInfo } from './ChatComposer';
import type { MessageTemplateType } from '../../services/api';

type Props = {
  t: (key: string) => string;
  language: string;
  conversations: ConversationRow[];
  selectedClient: any | null;
  onSelectClient: (client: any) => void;
  onStartNew: () => void;
  onDeleteConversation?: (client: any) => void;
  messages: ChatBubbleMessage[];
  isFetchingMessages?: boolean;
  onRefreshMessages?: () => void;
  onDeleteMessage?: (msg: ChatBubbleMessage) => void;
  onResendMessage?: (msg: ChatBubbleMessage) => void;
  deletingMessageId?: string | null;
  resendingMessageId?: string | null;
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
        t={props.t}
        language={props.language}
      />
      <ChatThread
        t={props.t}
        selectedClient={props.selectedClient}
        messages={props.messages}
        isFetching={props.isFetchingMessages}
        onRefresh={props.onRefreshMessages}
        onDeleteMessage={props.onDeleteMessage}
        onResendMessage={props.onResendMessage}
        deletingMessageId={props.deletingMessageId}
        resendingMessageId={props.resendingMessageId}
        composerProps={props.composerProps}
      />
    </div>
  );
};

export type { ConversationRow, ChatBubbleMessage, SessionInfo, MessageTemplateType };
