import { useSyncExternalStore } from 'react';
import type { WorkSessionState } from '../../hooks/useWorkSessionTracker';

/**
 * Tiny external store bridging the tracker host to the Header pill.
 *
 * The two live in different subtrees, and this value changes on every ping, so the
 * alternatives are both bad: AppContext would re-render every consumer in the app on
 * each tick, and prop drilling would have to cross the whole layout. `useSyncExternalStore`
 * keeps the re-render scoped to whoever actually reads it.
 */
export interface WorkSessionSnapshot {
  state: WorkSessionState;
  todaySeconds: number;
}

const INITIAL: WorkSessionSnapshot = { state: 'off', todaySeconds: 0 };

let snapshot: WorkSessionSnapshot = INITIAL;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => snapshot;

export const setWorkSessionSnapshot = (next: WorkSessionSnapshot) => {
  // Identity must stay stable when nothing changed, or useSyncExternalStore loops.
  if (snapshot.state === next.state && snapshot.todaySeconds === next.todaySeconds) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
};

export const useWorkSessionSnapshot = (): WorkSessionSnapshot =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
