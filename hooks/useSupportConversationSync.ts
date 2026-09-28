import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { onRealtimeFrame, subscribeToSupportConversation } from './useRealtimeChannel';

const MESSAGES_KEY = ['support-chat-messages'] as const;
const CONVERSATION_KEY = ['support-chat-conversation'] as const;

/** Keep the owner support thread live while the panel is open. */
export function useSupportConversationSync(conversationId: number | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (conversationId == null) return;

    const subscription = subscribeToSupportConversation(conversationId);

    const unsubscribeFrames = onRealtimeFrame((frame) => {
      if (frame.scope !== 'support_conversation' || frame.conversation !== conversationId) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: MESSAGES_KEY });
      void queryClient.invalidateQueries({ queryKey: CONVERSATION_KEY });
    });

    return () => {
      unsubscribeFrames();
      subscription.release();
    };
  }, [conversationId, queryClient]);
}
