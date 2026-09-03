/**
 * Refetch when the server says a slice changed, instead of on a timer.
 *
 * The app runs exactly one poll: the sync digest (App.tsx). Alongside its badge
 * counts the digest reports a monotonic counter per slice of company data — chat,
 * calls, arrivals, team chat. A view that watches its slice learns "your data
 * changed" from that one shared request, and fetches once in response.
 *
 * This replaces the pattern where each view kept its own interval. Those cost a
 * request per view per tick whether or not anything had happened; an idle Calls
 * page alone made three every eight seconds. The digest poll they now share
 * answers 304 with no database work at all when nothing changed, so an idle tab
 * settles to roughly one free request per cycle regardless of which pages are open.
 *
 * These hooks never fetch. They read the digest already in the React Query cache,
 * so mounting one adds no traffic — only App.tsx's poll (and later the realtime
 * socket) writes that entry.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

import { queryKeys, useSyncDigest } from './useQueries';
import type { SyncSliceName } from '../services/api';

/**
 * Current value of one slice counter, or null when it is not knowable yet.
 *
 * Null covers three cases that must not be confused with zero: no digest fetched
 * yet, a server that does not send `versions`, and a slice the user has no access
 * to. Callers treat null as "no signal" and leave their fallback behaviour alone,
 * rather than reading it as "nothing has ever changed".
 */
export function useSliceVersion(slice: SyncSliceName): number | null {
  // Subscribes to the digest query rather than reading queryClient.getQueryData().
  //
  // getQueryData returns a snapshot and registers no subscription, so a component
  // using it is never re-rendered when the digest changes — the version would
  // only appear to move if something else happened to re-render first. That bug
  // shipped once: the Team Chat badge (which subscribes properly) counted new
  // messages while the open thread never refetched, so the dialog showed nothing.
  //
  // `enabled: false` still subscribes to the cache and still re-renders on every
  // update — it only stops this hook from *starting* a fetch. That matters as
  // more components adopt it: a purely observational hook must never put a
  // request on the wire, least of all one that would 401 if it ran before login.
  // App.tsx owns the single poll that keeps the entry warm.
  const { data: digest } = useSyncDigest({ enabled: false, refetchInterval: false });
  const value = digest?.versions?.[slice];
  return typeof value === 'number' ? value : null;
}

/**
 * Invalidate `keys` whenever `slice` moves.
 *
 * The first observed value only establishes the baseline — it must not trigger a
 * fetch, or every mount would refetch everything it watches and we would have
 * rebuilt the polling we are removing. Only a *change* from a known value counts.
 *
 * Pass `enabled: false` while the user lacks access to the data, so a slice that
 * moves for a teammate does not fire a request that comes back 403.
 */
export function useInvalidateOnSliceChange(
  slice: SyncSliceName,
  keys: QueryKey[],
  options?: { enabled?: boolean }
): void {
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();
  const version = useSliceVersion(slice);
  const lastSeen = useRef<number | null>(null);

  // Keys are usually written inline, so a new array identity arrives on every
  // render. Comparing the serialised value keeps the effect keyed to what the
  // caller means rather than to how often its parent re-renders.
  const serializedKeys = JSON.stringify(keys);

  useEffect(() => {
    if (!enabled) {
      // Forget the baseline: while disabled we stop observing, so whatever value
      // we last held may be arbitrarily old. Resuming from it would fire a
      // spurious invalidation for changes that happened while we were not
      // watching — the next observed value re-establishes the baseline instead.
      lastSeen.current = null;
      return;
    }
    if (version === null) return;

    const previous = lastSeen.current;
    lastSeen.current = version;
    if (previous === null || previous === version) return;

    for (const key of JSON.parse(serializedKeys) as QueryKey[]) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  }, [enabled, version, serializedKeys, queryClient]);
}
