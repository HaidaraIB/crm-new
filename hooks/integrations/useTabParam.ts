import { useState } from 'react';
import { readPersistedTab, writePersistedTab } from '../usePersistedTab';

/**
 * Active tab in `?tab=` (refresh / deep-link), with localStorage fallback so
 * navigating away and back without a query still restores the last tab.
 */
export function useTabParam<T extends string>(
  ids: readonly T[],
  fallback: T,
  persistKey?: string,
): [T, (next: T) => void] {
  const storageKey = persistKey ?? `param:${ids.join('|')}`;

  const read = (): T => {
    const value = new URLSearchParams(window.location.search).get('tab');
    if ((ids as readonly string[]).includes(value || '')) return value as T;
    return readPersistedTab(storageKey, ids, fallback);
  };

  const [tab, setTab] = useState<T>(read);

  const set = (next: T) => {
    setTab(next);
    writePersistedTab(storageKey, next);
    const params = new URLSearchParams(window.location.search);
    if (next === fallback) params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`,
    );
  };

  return [tab, set];
}
