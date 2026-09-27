import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getSupportConversationAPI,
  getSupportMessagesAPI,
  markSupportReadAPI,
  sendSupportMessageAPI,
  sendSupportMessageWithAttachmentAPI,
  type SupportChatMessage,
} from '../services/api';
import { useRealtimeConnected } from './useRealtimeChannel';
import { useInvalidateOnSliceChange } from './useSliceVersion';

const MESSAGES_KEY = ['support-chat-messages'] as const;
const CONVERSATION_KEY = ['support-chat-conversation'] as const;

export function useSupportChat(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();
  const [olderLoading, setOlderLoading] = useState(false);
  const realtimeConnected = useRealtimeConnected();
  const pollMs = realtimeConnected ? false : 30_000;

  useInvalidateOnSliceChange('support_chat', [MESSAGES_KEY, CONVERSATION_KEY], { enabled });

  const conversationQuery = useQuery({
    queryKey: CONVERSATION_KEY,
    queryFn: () => getSupportConversationAPI(),
    enabled,
    staleTime: 5_000,
  });

  const messagesQuery = useQuery({
    queryKey: MESSAGES_KEY,
    queryFn: () => getSupportMessagesAPI({ page_size: 80 }),
    enabled,
    refetchInterval: pollMs,
    staleTime: 2_000,
  });

  const messages = messagesQuery.data?.results ?? [];
  const conversation = messagesQuery.data?.conversation ?? conversationQuery.data;
  const hasOlder = messagesQuery.data?.has_older ?? false;

  const latestIncoming = useMemo(() => {
    const incoming = messages.filter((m) => m.side === 'support');
    return incoming.length ? incoming[incoming.length - 1] : null;
  }, [messages]);

  const markedRef = useRef<number>(0);
  useEffect(() => {
    if (!enabled || !latestIncoming) return;
    if (markedRef.current >= latestIncoming.id) return;
    markedRef.current = latestIncoming.id;
    markSupportReadAPI(latestIncoming.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: CONVERSATION_KEY });
      })
      .catch(() => {
        markedRef.current = Math.min(markedRef.current, latestIncoming.id - 1);
      });
  }, [enabled, latestIncoming, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async (input: { body?: string; file?: File; replyToMessageId?: number }) => {
      if (input.file) {
        return sendSupportMessageWithAttachmentAPI(input.file, {
          body: input.body,
          replyToMessageId: input.replyToMessageId,
        });
      }
      return sendSupportMessageAPI(input.body ?? '', { replyToMessageId: input.replyToMessageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSAGES_KEY });
      queryClient.invalidateQueries({ queryKey: CONVERSATION_KEY });
    },
  });

  const loadOlder = useCallback(async () => {
    if (!hasOlder || olderLoading || messages.length === 0) return;
    setOlderLoading(true);
    try {
      const firstId = messages[0]?.id;
      if (!firstId) return;
      const page = await getSupportMessagesAPI({ before_id: firstId, page_size: 50 });
      queryClient.setQueryData(MESSAGES_KEY, (prev: Awaited<ReturnType<typeof getSupportMessagesAPI>> | undefined) => {
        if (!prev) return page;
        const existingIds = new Set(prev.results.map((m) => m.id));
        const merged = [...page.results.filter((m) => !existingIds.has(m.id)), ...prev.results];
        return { ...prev, results: merged, has_older: page.has_older };
      });
    } finally {
      setOlderLoading(false);
    }
  }, [hasOlder, olderLoading, messages, queryClient]);

  const optimisticAppend = useCallback(
    (msg: SupportChatMessage) => {
      queryClient.setQueryData(
        MESSAGES_KEY,
        (prev: Awaited<ReturnType<typeof getSupportMessagesAPI>> | undefined) => {
          if (!prev) return prev;
          if (prev.results.some((m) => m.id === msg.id)) return prev;
          return { ...prev, results: [...prev.results, msg] };
        }
      );
    },
    [queryClient]
  );

  return {
    conversation,
    messages,
    hasOlder,
    olderLoading,
    loadOlder,
    isLoading: conversationQuery.isLoading || messagesQuery.isLoading,
    isFetching: messagesQuery.isFetching,
    refetch: messagesQuery.refetch,
    sendMutation,
    optimisticAppend,
  };
}
