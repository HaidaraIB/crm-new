import { useQuery } from '@tanstack/react-query';
import { getIntegrationPolicyAPI } from '../../services/api';
import { useAppContext } from '../../context/AppContext';
import { resolveIntegrationPolicyMessage } from '../../utils/integrationPolicyMessage';

export function useIntegrationPolicy(key: string | undefined) {
  const { t } = useAppContext();
  const query = useQuery({
    queryKey: ['integrationPolicy'],
    queryFn: getIntegrationPolicyAPI,
    enabled: !!key,
  });
  const entry = key ? query.data?.[key] : undefined;
  const disabled = entry?.enabled === false;
  return {
    ...query,
    entry,
    disabled,
    message: disabled ? resolveIntegrationPolicyMessage(entry?.message, entry?.scope, t) : '',
    scope: entry?.scope,
    title: undefined as string | undefined,
  };
}
