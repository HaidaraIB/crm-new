const STORAGE_KEY = 'wa_live_call_toast_dismissed';

function readIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
    );
  } catch {
    return new Set();
  }
}

function writeIds(ids: Set<number>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota / private mode */
  }
}

export function isLiveCallToastDismissed(callId: number): boolean {
  return readIds().has(callId);
}

export function dismissLiveCallToast(callId: number): void {
  const ids = readIds();
  ids.add(callId);
  writeIds(ids);
}

/** Drop dismissed ids that are no longer ringing so storage stays small. */
export function pruneLiveCallToastDismissed(activeIds: Iterable<number>): void {
  const active = new Set(activeIds);
  const ids = readIds();
  let changed = false;
  for (const id of [...ids]) {
    if (!active.has(id)) {
      ids.delete(id);
      changed = true;
    }
  }
  if (changed) writeIds(ids);
}
