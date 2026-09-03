/**
 * Wire web push into the query cache.
 *
 * A push means "something of this type happened". Like the realtime socket, it
 * carries no data — this maps it to the queries it affects and lets them refetch
 * through the normal authenticated endpoints.
 *
 * The `invalidate` vocabulary is the backend's, already used by the mobile app's
 * SyncInvalidation bus (`whatsapp:conversations`, `tenant_chat:messages`,
 * `crm:leads`, `crm:deals`, `crm:arrivals`, `pbx:screen_pop`). Keeping one
 * vocabulary across web, mobile and server is what stops a new push type needing
 * three separate mapping tables.
 */

import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

import { queryKeys } from './useQueries';
import { registerWebPush, subscribeToPushMessages, type PushData } from '../services/webPush';

/** Backend `invalidate` key -> the query keys it affects. */
const INVALIDATION_MAP: Record<string, QueryKey[]> = {
  'whatsapp:conversations': [queryKeys.whatsAppConversations, ['whatsappChatMessages']],
  'whatsapp:calls': [queryKeys.whatsappCallsLive, ['whatsappCalls']],
  'tenant_chat:messages': [['tenant-chat-conversations'], ['tenant-chat-messages']],
  'crm:leads': [['leads'], ['dashboardSummary']],
  'crm:deals': [['deals'], ['dashboardSummary']],
  'crm:arrivals': [['leadArrivals'], queryKeys.pendingLeadArrivals],
  'pbx:screen_pop': [['notifications']],
};

export function useWebPush(enabled: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    // No permission prompt here — see registerWebPush(). This only picks up a
    // permission the user has already granted.
    void registerWebPush();

    const unsubscribe = subscribeToPushMessages((data: PushData) => {
      // The digest is invalidated for every push regardless of type: it holds all
      // the badge counts and the slice versions, so refreshing it is what makes
      // the rest of the UI catch up even for a push type not mapped below.
      void queryClient.invalidateQueries({ queryKey: queryKeys.syncDigest });

      const keys = data.invalidate ? INVALIDATION_MAP[data.invalidate] : undefined;
      if (!keys) return;
      for (const key of keys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    });

    return unsubscribe;
  }, [enabled, queryClient]);
}
