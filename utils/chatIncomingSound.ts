const CHAT_NOTIFICATION_SRC = '/sounds/notification_chat.wav';

let pooled: HTMLAudioElement | null = null;
let unlockBound = false;

function bindUnlockOnce(): void {
  if (typeof window === 'undefined' || unlockBound) return;
  unlockBound = true;
  const unlock = () => {
    preloadIncomingChatSound();
    if (!pooled) return;
    const a = pooled;
    const prevMuted = a.muted;
    a.muted = true;
    void a
      .play()
      .then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = prevMuted;
      })
      .catch(() => {
        a.muted = prevMuted;
      });
  };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
}

/** Warm decode + HTTP cache; call once when opening team chat (or on app load). */
export function preloadIncomingChatSound(): void {
  if (typeof window === 'undefined') return;
  bindUnlockOnce();
  if (pooled) return;
  try {
    pooled = new Audio(CHAT_NOTIFICATION_SRC);
    pooled.preload = 'auto';
    void pooled.load();
  } catch {
    pooled = null;
  }
}

/**
 * Plays `public/sounds/notification_chat.wav` using a preloaded element (lower latency than `new Audio()` each time).
 * Browsers may still block the first `play()` until a user gesture (autoplay policy).
 */
export function playIncomingChatSound(): void {
  if (typeof window === 'undefined') return;
  preloadIncomingChatSound();
  try {
    if (!pooled) return;
    const node = pooled.cloneNode(true) as HTMLAudioElement;
    node.currentTime = 0;
    void node.play().catch(() => {
      try {
        pooled!.pause();
        pooled!.currentTime = 0;
        void pooled!.play().catch(() => {
          /* autoplay blocked or decode error */
        });
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
}
