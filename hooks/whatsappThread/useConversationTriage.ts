import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConversationListAction } from '../../components/whatsapp/WhatsAppChatLayout';

type ThreadOverride = {
  clientId: number;
  status?: string;
  isStarred?: boolean;
  isUnsubscribed?: boolean;
};

type ConversationMeta = {
  status?: string;
  isStarred?: boolean;
  isUnsubscribed?: boolean;
};

type UpdateStateMutate = (args: {
  clientId: number;
  status?: string;
  snoozedUntil?: string | null;
  isStarred?: boolean;
  isUnsubscribed?: boolean;
}) => void;

export function useConversationTriage(opts: {
  selectedClientId: number | null;
  selectedMeta: ConversationMeta | null;
  updateConversationState: { mutate: UpdateStateMutate };
  onDeleteConversation: (client: { id: number }) => void;
}) {
  const [threadStateOverride, setThreadStateOverride] = useState<ThreadOverride | null>(null);

  useEffect(() => {
    setThreadStateOverride(null);
  }, [opts.selectedClientId]);

  const patchThreadOverride = useCallback(
    (clientId: number, patch: Partial<Omit<ThreadOverride, 'clientId'>>) => {
      setThreadStateOverride((prev) => ({
        clientId,
        status: patch.status ?? (prev?.clientId === clientId ? prev.status : undefined),
        isStarred:
          patch.isStarred ?? (prev?.clientId === clientId ? prev.isStarred : undefined),
        isUnsubscribed:
          patch.isUnsubscribed ??
          (prev?.clientId === clientId ? prev.isUnsubscribed : undefined),
      }));
    },
    []
  );

  const threadStatusForHeader = useMemo(() => {
    const clientId = opts.selectedClientId;
    if (
      clientId != null &&
      threadStateOverride?.clientId === clientId &&
      threadStateOverride.status
    ) {
      return threadStateOverride.status;
    }
    return opts.selectedMeta?.status || 'open';
  }, [opts.selectedClientId, opts.selectedMeta, threadStateOverride]);

  const threadStarredForHeader = useMemo(() => {
    const clientId = opts.selectedClientId;
    if (
      clientId != null &&
      threadStateOverride?.clientId === clientId &&
      threadStateOverride.isStarred !== undefined
    ) {
      return threadStateOverride.isStarred;
    }
    return Boolean(opts.selectedMeta?.isStarred);
  }, [opts.selectedClientId, opts.selectedMeta, threadStateOverride]);

  const threadUnsubscribedForHeader = useMemo(() => {
    const clientId = opts.selectedClientId;
    if (
      clientId != null &&
      threadStateOverride?.clientId === clientId &&
      threadStateOverride.isUnsubscribed !== undefined
    ) {
      return threadStateOverride.isUnsubscribed;
    }
    return Boolean(opts.selectedMeta?.isUnsubscribed);
  }, [opts.selectedClientId, opts.selectedMeta, threadStateOverride]);

  const applyConversationAction = useCallback(
    (client: { id?: number }, action: ConversationListAction) => {
      if (typeof client?.id !== 'number' || client.id <= 0) return;
      const clientId = client.id;
      if (action.type === 'delete') {
        opts.onDeleteConversation({ id: clientId });
        return;
      }
      if (action.type === 'status') {
        patchThreadOverride(clientId, { status: action.status });
        opts.updateConversationState.mutate({ clientId, status: action.status });
        return;
      }
      if (action.type === 'snooze') {
        patchThreadOverride(clientId, { status: 'snoozed' });
        opts.updateConversationState.mutate({
          clientId,
          status: 'snoozed',
          snoozedUntil: action.snoozedUntil,
        });
        return;
      }
      if (action.type === 'star') {
        patchThreadOverride(clientId, { isStarred: action.starred });
        opts.updateConversationState.mutate({ clientId, isStarred: action.starred });
        return;
      }
      if (action.type === 'unsubscribe') {
        patchThreadOverride(clientId, { isUnsubscribed: action.unsubscribed });
        opts.updateConversationState.mutate({
          clientId,
          isUnsubscribed: action.unsubscribed,
        });
      }
    },
    [opts, patchThreadOverride]
  );

  return {
    threadStatusForHeader,
    threadStarredForHeader,
    threadUnsubscribedForHeader,
    applyConversationAction,
  };
}
