import { useMemo } from 'react';
import { useConnectedAccounts } from './useQueries';

type ConnectedAccountLike = {
  platform?: string;
  status?: string;
  is_active?: boolean;
  metadata?: { phone_number_id?: string } | null;
};

function isConnectedWhatsAppAccount(acc: ConnectedAccountLike): boolean {
  // `!a.platform` kept for older payloads that omitted the field on the
  // platform-filtered endpoint.
  return (
    (!acc.platform || acc.platform === 'whatsapp') &&
    acc.status === 'connected' &&
    acc.is_active !== false
  );
}

/**
 * Whether the tenant has a WhatsApp account we can actually send from — the
 * single source of truth for "is the WhatsApp integration connected?".
 *
 * Mirrors the backend's `has_connected_whatsapp_integration`: an
 * `IntegrationAccount` row with `platform=whatsapp`, `status=connected` and
 * `is_active`. Note this is tenant-level connectivity, distinct from the
 * per-user permission in `useWhatsAppChatsAllowed`.
 */
export function useWhatsAppConnected(): {
  isConnected: boolean;
  phoneNumberId: string | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useConnectedAccounts('whatsapp');

  return useMemo(() => {
    const list: ConnectedAccountLike[] = Array.isArray(data) ? data : data?.results || [];
    const connected = list.find(isConnectedWhatsAppAccount);
    return {
      isConnected: !!connected,
      phoneNumberId: String(connected?.metadata?.phone_number_id || '').trim() || null,
      isLoading,
    };
  }, [data, isLoading]);
}
