import { useInvalidateOnSliceChange } from '../hooks/useSliceVersion';
import { queryKeys } from '../hooks/useQueries';

/** Refetch session identity when permissions or company subscription change. */
export function RealtimeSessionSync() {
  useInvalidateOnSliceChange('access', [queryKeys.currentUser]);
  useInvalidateOnSliceChange('account', [queryKeys.currentUser]);
  return null;
}
