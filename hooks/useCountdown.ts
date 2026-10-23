import { useEffect, useRef, useState } from 'react';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  totalMs: number;
}

function partsFor(msLeft: number): CountdownParts {
  const totalMs = Math.max(0, msLeft);
  const s = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    expired: totalMs <= 0,
    totalMs,
  };
}

/**
 * Ticks once a second toward `endsAt`. `serverOffsetMs` (server clock − device clock)
 * corrects for a skewed device clock. Pauses while the tab is hidden and calls
 * `onExpire` once when it reaches zero. Returns null when there is no end.
 */
export function useCountdown(
  endsAt: string | null | undefined,
  { serverOffsetMs = 0, onExpire }: { serverOffsetMs?: number; onExpire?: () => void } = {},
): CountdownParts | null {
  const endMs = endsAt ? new Date(endsAt).getTime() : NaN;
  const compute = () => partsFor(endMs - (Date.now() + serverOffsetMs));
  const [parts, setParts] = useState<CountdownParts | null>(() => (Number.isFinite(endMs) ? compute() : null));
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (!Number.isFinite(endMs)) {
      setParts(null);
      return;
    }
    let fired = false;
    let timer: number | undefined;
    const tick = () => {
      const next = compute();
      setParts(next);
      if (next.expired) {
        if (!fired) {
          fired = true;
          expireRef.current?.();
        }
        return false;
      }
      return true;
    };
    const start = () => {
      if (timer !== undefined || !tick()) return;
      timer = window.setInterval(() => {
        if (!tick() && timer !== undefined) {
          window.clearInterval(timer);
          timer = undefined;
        }
      }, 1000);
    };
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endMs, serverOffsetMs]);

  return parts;
}
