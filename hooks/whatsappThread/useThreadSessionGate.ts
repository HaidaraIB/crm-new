import { useEffect, useMemo, useRef } from 'react';
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
    staleTime: 0,
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
    const key = `${newest.id}:${newest.created_at}`;
    if (key !== lastInboundKeyRef.current) {
      lastInboundKeyRef.current = key;
      void queryClient.invalidateQueries({ queryKey: ['whatsappSession'] });
      void refetchWaSession();
      onNewInbound?.();
    }
  }, [inboundMessages, queryClient, refetchWaSession, onNewInbound]);

  return {
    waSessionApi,
    refetchWaSession,
    derivedInSession,
    blockFreeText,
    effectiveSession,
    resetSessionTrackers: () => {
      lastInboundKeyRef.current = '';
    },
  };
}
