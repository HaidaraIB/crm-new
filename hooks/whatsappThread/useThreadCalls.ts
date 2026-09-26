import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWhatsAppCallsAPI, type WhatsAppCallRecord } from '../../services/api';

type Args = {
  enabled: boolean;
  pollMs: number | false;
  clientId?: number;
  conversationId?: number;
  peerPhone?: string;
};

export function useThreadCalls({
  enabled,
  pollMs,
  clientId,
  conversationId,
  peerPhone = '',
}: Args) {
  const phoneDigits = peerPhone.replace(/\D/g, '');
  const { data, refetch } = useQuery({
    queryKey: ['whatsappCalls', 'thread', clientId, conversationId, peerPhone],
    queryFn: async () => {
      if (typeof conversationId === 'number') {
        return getWhatsAppCallsAPI({
          conversation: conversationId,
          ordering: 'started_at',
          limit: 100,
        });
      }
      if (typeof clientId === 'number') {
        return getWhatsAppCallsAPI({
          client: clientId,
          ordering: 'started_at',
          limit: 100,
        });
      }
      if (phoneDigits.length < 7) return { count: 0, results: [] as WhatsAppCallRecord[] };
      return getWhatsAppCallsAPI({
        search: phoneDigits,
        ordering: 'started_at',
        limit: 100,
      });
    },
    enabled:
      enabled &&
      (typeof conversationId === 'number' ||
        typeof clientId === 'number' ||
        phoneDigits.length >= 7),
    refetchInterval: enabled ? pollMs : false,
  });

  const threadCalls = useMemo(() => {
    const rows = data?.results || [];
    if (typeof conversationId === 'number' || typeof clientId === 'number') return rows;
    if (!phoneDigits) return rows;
    return rows.filter((c) => {
      const peer = String(c.peer_phone || '').replace(/\D/g, '');
      return (
        peer === phoneDigits ||
        peer.endsWith(phoneDigits.slice(-10)) ||
        phoneDigits.endsWith(peer.slice(-10))
      );
    });
  }, [data, clientId, conversationId, phoneDigits]);

  return { threadCalls, refetchThreadCalls: refetch };
}
