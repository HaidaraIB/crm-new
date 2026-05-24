import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useCurrentUser } from './useQueries';
import { isFieldVisitAllowed } from '../utils/fieldVisitAccess';

/** Live field-visit access from API user, falling back to AppContext user. */
export function useFieldVisitAllowed(): boolean {
  const { currentUser } = useAppContext();
  const { data: freshUser } = useCurrentUser({ enabled: !!currentUser });

  return useMemo(() => {
    const company = freshUser?.company ?? currentUser?.company;
    return isFieldVisitAllowed(company);
  }, [freshUser?.company, currentUser?.company]);
}
