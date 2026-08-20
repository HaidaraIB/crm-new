import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { sendWorkSessionPingAPI } from '../services/api';
import { queryKeys } from './useQueries';
import { roleTracksWorkHours } from '../utils/roles';
import { isImpersonating } from '../utils/impersonation';
import type { WorkSessionStatus } from '../types';

export type WorkSessionState = 'off' | 'active' | 'paused';

/** How often the state machine re-evaluates. Shorter than the ping interval so the
 *  idle transition is detected promptly and browser tab-throttling has less leverage. */
const TICK_MS = 15 * 1000;
const DEFAULT_PING_INTERVAL_MS = 60 * 1000;

/** Ignore repeat activity within this window — a mousemove can fire per pixel. */
const ACTIVITY_WRITE_THROTTLE_MS = 1000;
/** How often activity is broadcast to other tabs. */
const ACTIVITY_BROADCAST_MS = 5000;
const CROSS_TAB_KEY = 'loop.workTracker.lastActivity';

const ACTIVITY_EVENTS = [
  'pointermove',
  'pointerdown',
  'keydown',
  'wheel',
  'scroll',
  'touchstart',
] as const;

export interface WorkSessionTracker {
  state: WorkSessionState;
  todaySeconds: number;
  idleTimeoutMinutes: number;
  resume: () => void;
}

/**
 * Measures how long the user actively uses the CRM, and pauses with an alert after the
 * company's idle timeout.
 *
 * Two implementation rules carry most of the weight:
 *
 * 1. Activity handlers write to a ref and never call `setState`. They fire on every
 *    pixel of mouse movement; re-rendering there would be ruinous. React state changes
 *    only on an actual active <-> paused transition.
 * 2. Every elapsed-time decision is a `Date.now()` delta, never a count of ticks, so a
 *    throttled or frozen background tab still reaches the right conclusion once it runs.
 *
 * Accrual itself is the server's job — this only decides *when* to ping.
 */
export const useWorkSessionTracker = (): WorkSessionTracker => {
  const { isLoggedIn, currentUser } = useAppContext();
  const queryClient = useQueryClient();

  const company = currentUser?.company;
  const enabled =
    Boolean(isLoggedIn) &&
    Boolean(currentUser?.id) &&
    Boolean(company?.work_hours_tracking_enabled) &&
    roleTracksWorkHours(currentUser?.role) &&
    !isImpersonating();

  const configuredIdleMinutes = Number(company?.work_hours_idle_timeout_minutes) || 10;

  const [state, setState] = useState<WorkSessionState>('off');
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(configuredIdleMinutes);

  const lastActivityRef = useRef(Date.now());
  const lastBroadcastRef = useRef(0);
  const lastPingRef = useRef(0);
  const pingIntervalRef = useRef(DEFAULT_PING_INTERVAL_MS);
  const idleMsRef = useRef(configuredIdleMinutes * 60 * 1000);
  const stateRef = useRef<WorkSessionState>('off');
  const pingInFlightRef = useRef(false);

  const setTrackerState = useCallback((next: WorkSessionState) => {
    if (stateRef.current === next) return;
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    idleMsRef.current = configuredIdleMinutes * 60 * 1000;
    setIdleTimeoutMinutes(configuredIdleMinutes);
  }, [configuredIdleMinutes]);

  const markActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
    lastActivityRef.current = now;

    // Tell the other tabs. Without this, a tab left idle in the background pops the
    // "you're inactive" dialog while the user is working in a different tab — the
    // most likely false positive by a wide margin.
    if (now - lastBroadcastRef.current > ACTIVITY_BROADCAST_MS) {
      lastBroadcastRef.current = now;
      try {
        window.localStorage.setItem(CROSS_TAB_KEY, String(now));
      } catch {
        // Private mode / quota — cross-tab sync is a nicety, not a requirement.
      }
    }
  }, []);

  const resume = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastPingRef.current = now;
    setTrackerState('active');
  }, [setTrackerState]);

  const applyStatus = useCallback(
    (status: WorkSessionStatus | undefined) => {
      if (!status) return;
      if (status.ping_interval_seconds) {
        pingIntervalRef.current = status.ping_interval_seconds * 1000;
      }
      if (status.idle_timeout_minutes) {
        idleMsRef.current = status.idle_timeout_minutes * 60 * 1000;
        setIdleTimeoutMinutes(status.idle_timeout_minutes);
      }
      setTodaySeconds(status.today_seconds ?? 0);
      // The pill reads this cache key, so it refreshes for free on every ping.
      queryClient.setQueryData(queryKeys.workSessionToday, status);
      if (status.tracking_enabled === false) {
        setTrackerState('off');
      }
    },
    [queryClient, setTrackerState],
  );

  // --- activity listeners -------------------------------------------------
  useEffect(() => {
    if (!enabled) return;

    const onVisible = () => {
      // Refocusing the tab is a deliberate user action; the existing presence
      // heartbeat treats it the same way.
      if (document.visibilityState === 'visible') markActivity();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CROSS_TAB_KEY || !event.newValue) return;
      const remote = Number(event.newValue);
      if (Number.isFinite(remote) && remote > lastActivityRef.current) {
        lastActivityRef.current = remote;
      }
    };

    // `capture` so activity inside a scroll container still registers; `passive`
    // so we never delay scrolling.
    const options: AddEventListenerOptions = { passive: true, capture: true };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActivity, options));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('storage', onStorage);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActivity, options));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, [enabled, markActivity]);

  // --- state machine ------------------------------------------------------
  useEffect(() => {
    if (!enabled) {
      setTrackerState('off');
      return;
    }

    let cancelled = false;
    const now = Date.now();
    lastActivityRef.current = now;
    lastPingRef.current = 0; // ping immediately on the first tick
    setTrackerState('active');

    const ping = async () => {
      if (cancelled || pingInFlightRef.current) return;
      // No point queuing requests while offline; the server credits retroactively so
      // the gap is recovered (up to its own cap) by the next successful ping.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

      pingInFlightRef.current = true;
      try {
        const status = await sendWorkSessionPingAPI();
        if (!cancelled) applyStatus(status);
        lastPingRef.current = Date.now();
      } catch {
        // A failed ping must never pause tracking and must never retry-storm:
        // leave lastPingRef alone and let the next tick try again.
      } finally {
        pingInFlightRef.current = false;
      }
    };

    const tick = () => {
      if (cancelled) return;
      const nowMs = Date.now();

      if (stateRef.current === 'paused') return; // only an explicit Resume restarts it

      if (nowMs - lastActivityRef.current >= idleMsRef.current) {
        setTrackerState('paused');
        return;
      }
      if (nowMs - lastPingRef.current >= pingIntervalRef.current) {
        void ping();
      }
    };

    tick();
    const timer = window.setInterval(tick, TICK_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, applyStatus, setTrackerState]);

  return { state, todaySeconds, idleTimeoutMinutes, resume };
};
