import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWhatsAppSessionWindowAPI } from '../../services/api';
import { deriveSessionFromMessages } from './sessionUtils';

type InboundMessage = { id?: number; direction?: string; created_at?: string };

type Args = {
  enabled: boolean;
  clientId?: number;
  peerPhone?: string;
  inboundMessages: InboundMessage[];
  blockFreeTextRequiresClientId?: boolean;
  onNewInbound?: () => void;
};

export function useThreadSessionGate({
  enabled,
  clientId,
  peerPhone = '',
  inboundMessages,
  blockFreeTextRequiresClientId = true,
  onNewInbound,
}: Args) {
  const queryClient = useQueryClient();
  const lastInboundKeyRef = useRef('');
  // Callers pass `onNewInbound` inline; keeping it out of effect deps prevents a render loop.
  const onNewInboundRef = useRef(onNewInbound);
  onNewInboundRef.current = onNewInbound;
  const phoneDigits = peerPhone.replace(/\D/g, '');

  const { data: waSessionApi, refetch: refetchWaSession } = useQuery({
    queryKey: ['whatsappSession', clientId, peerPhone],
    queryFn: () =>
      typeof clientId === 'number'
        ? getWhatsAppSessionWindowAPI({ clientId })
        : getWhatsAppSessionWindowAPI({ phone: peerPhone }),
    enabled:
      enabled &&
      (typeof clientId === 'number' || phoneDigits.length >= 7),
    staleTime: 15_000,
    retry: false,
  });

  const derivedInSession = deriveSessionFromMessages(inboundMessages);
  const blockFreeText =
    blockFreeTextRequiresClientId &&
    typeof clientId === 'number' &&
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

  useEffect(() => {
    const inbounds = inboundMessages.filter(
      (m) => m.direction === 'inbound' || m.direction === 'in'
    );
    if (!inbounds.length) return;
    const newest = inbounds.reduce((a, b) =>
      new Date(a.created_at || 0).getTime() >= new Date(b.created_at || 0).getTime() ? a : b
    );
    const threadPrefix = `${clientId ?? ''}|${peerPhone}|`;
    const key = `${threadPrefix}${newest.id}:${newest.created_at}`;
    const prev = lastInboundKeyRef.current;
    if (key === prev) return;
    lastInboundKeyRef.current = key;
    if (!prev.startsWith(threadPrefix)) return;
    void queryClient.invalidateQueries({ queryKey: ['whatsappSession', clientId, peerPhone] });
    onNewInboundRef.current?.();
  }, [inboundMessages, queryClient, clientId, peerPhone]);

  const resetSessionTrackers = useCallback(() => {
    lastInboundKeyRef.current = '';
  }, []);

  return {
    waSessionApi,
    refetchWaSession,
    derivedInSession,
    blockFreeText,
    effectiveSession,
    resetSessionTrackers,
  };
}
