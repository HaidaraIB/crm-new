const CUSTOMER_ARRIVAL_SRC = '/sounds/customer_arrival.wav';

let pooled: HTMLAudioElement | null = null;

/** Warm decode + HTTP cache for the walk-in arrival ringtone. */
export function preloadArrivalRingtone(): void {
  if (typeof window === 'undefined') return;
  if (pooled) return;
  try {
    pooled = new Audio(CUSTOMER_ARRIVAL_SRC);
    pooled.preload = 'auto';
    pooled.loop = true;
    void pooled.load();
  } catch {
    pooled = null;
  }
}

/** Loop `public/sounds/customer_arrival.wav` while an arrival alert is on screen. */
export function startArrivalRingtone(): void {
  if (typeof window === 'undefined') return;
  preloadArrivalRingtone();
  try {
    if (!pooled) return;
    pooled.loop = true;
    if (!pooled.paused) return;
    pooled.currentTime = 0;
    void pooled.play().catch(() => {
      /* autoplay blocked or decode error */
    });
  } catch {
    /* ignore */
  }
}

/** Stop the walk-in arrival ringtone. */
export function stopArrivalRingtone(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!pooled) return;
    pooled.pause();
    pooled.currentTime = 0;
  } catch {
    /* ignore */
  }
}
