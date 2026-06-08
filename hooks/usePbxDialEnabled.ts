import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { getPbxExtensionsAPI, getPbxSettingsAPI } from '../services/api';

/** True when company PBX is on and the current user has a mapped desk extension. */
export function usePbxDialEnabled(): boolean {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id;

  const { data: pbxSettings } = useQuery({
    queryKey: ['pbxSettings'],
    queryFn: getPbxSettingsAPI,
  });
  const pbxEnabled = !!pbxSettings?.is_enabled;

  const { data: extensions, isSuccess } = useQuery({
    queryKey: ['pbxExtensions'],
    queryFn: getPbxExtensionsAPI,
    enabled: pbxEnabled && userId != null,
    staleTime: 60_000,
  });

  if (!pbxEnabled || userId == null) return false;
  if (!isSuccess || !extensions) return false;

  const username = (currentUser?.username || '').trim().toLowerCase();
  return extensions.some((row) => {
    if (row.user_id != null && Number(row.user_id) === Number(userId)) return true;
    if (username && row.username?.trim().toLowerCase() === username) return true;
    return false;
  });
}
