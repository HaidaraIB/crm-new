import { useCallback, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { loadReportPrefs, saveReportPrefs, type ReportPrefs } from './reportPrefsStore';

export { loadReportPrefs, saveReportPrefs } from './reportPrefsStore';
export type { ReportPrefs } from './reportPrefsStore';

/** A piece of view state (a toggle, a sort column) that survives reloads. */
export function useReportPref<K extends 'basis' | 'employeeSort'>(
  name: K,
  fallback: NonNullable<ReportPrefs[K]>,
): [NonNullable<ReportPrefs[K]>, (value: NonNullable<ReportPrefs[K]>) => void] {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id;
  const [value, setValue] = useState<NonNullable<ReportPrefs[K]>>(
    () => (loadReportPrefs(userId)[name] as NonNullable<ReportPrefs[K]> | undefined) ?? fallback,
  );
  const update = useCallback(
    (next: NonNullable<ReportPrefs[K]>) => {
      setValue(next);
      saveReportPrefs(userId, { [name]: next } as Partial<ReportPrefs>);
    },
    [name, userId],
  );
  return [value, update];
}
