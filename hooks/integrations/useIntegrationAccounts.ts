import { useMemo } from 'react';
import { useConnectedAccounts } from '../useQueries';
import { ConnectionStatus, normalizeConnectionStatus } from '../../components/integrations/kit/status';

export type IntegrationAccount = {
  id: number;
  name: string;
  status: ConnectionStatus;
  platform?: string;
  metadata?: Record<string, unknown>;
  is_active?: boolean;
};

export function useIntegrationAccounts(platform: string | undefined, enabled = true) {
  const query = useConnectedAccounts(platform, { enabled: enabled && !!platform });
  const accounts = useMemo<IntegrationAccount[]>(() => {
    const raw = Array.isArray(query.data) ? query.data : query.data?.results || [];
    return raw.map((acc: Record<string, unknown>) => ({
      id: Number(acc.id),
      name: String(acc.name || ''),
      status: normalizeConnectionStatus(
        acc.status === 'expired' || acc.status === 'error'
          ? String(acc.status)
          : String(acc.status || 'disconnected'),
      ),
      platform: acc.platform ? String(acc.platform) : undefined,
      metadata: (acc.metadata as Record<string, unknown>) || undefined,
      is_active: acc.is_active !== false,
    }));
  }, [query.data]);
  return { ...query, accounts };
}
