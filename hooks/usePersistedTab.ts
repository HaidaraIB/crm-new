import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'crm:tab:';

type Allowed<T extends string> = readonly T[] | '*';

function matchesAllowed<T extends string>(value: string | null, allowed: Allowed<T>): value is T {
  if (!value) return false;
  if (allowed === '*') return true;
  return (allowed as readonly string[]).includes(value);
}

export function readPersistedTab<T extends string>(
  key: string,
  allowed: Allowed<T>,
  fallback: T,
  legacyKeys: readonly string[] = [],
): T {
  try {
    const primary = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (matchesAllowed(primary, allowed)) return primary;

    for (const legacy of legacyKeys) {
      const saved = localStorage.getItem(legacy);
      if (matchesAllowed(saved, allowed)) {
        writePersistedTab(key, saved);
        return saved;
      }
    }
  } catch {
    // private mode / quota
  }
  return fallback;
}

export function writePersistedTab(key: string, value: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
  } catch {
    // private mode / quota
  }
}

/**
 * Last selected page tab, restored when the user leaves and comes back.
 * `allowed: '*'` accepts any stored string (dynamic tab ids).
 * `legacyKeys` are read once and migrated to `crm:tab:${key}`.
 */
export function usePersistedTab<T extends string>(
  key: string,
  allowed: Allowed<T>,
  fallback: T,
  legacyKeys: readonly string[] = [],
): [T, (next: T) => void] {
  const [tab, setTabState] = useState<T>(() =>
    readPersistedTab(key, allowed, fallback, legacyKeys),
  );

  // Re-read when the storage key changes (e.g. Leads-family pages share one component).
  useEffect(() => {
    setTabState(readPersistedTab(key, allowed, fallback, legacyKeys));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- allowed/fallback/legacy are stable per call site

  const setTab = useCallback(
    (next: T) => {
      if (!matchesAllowed(next, allowed)) return;
      setTabState(next);
      writePersistedTab(key, next);
    },
    [allowed, key],
  );

  return [tab, setTab];
}
