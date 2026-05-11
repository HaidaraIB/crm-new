const CHAT_NOTIFICATION_SRC = '/sounds/notification_chat.wav';

let pooled: HTMLAudioElement | null = null;

/** Warm decode + HTTP cache; call once when opening team chat (or on app load). */
export function preloadIncomingChatSound(): void {
  if (typeof window === 'undefined') return;
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
    pooled.pause();
    pooled.currentTime = 0;
    void pooled.play().catch(() => {
      /* autoplay blocked or decode error */
    });
  } catch {
    /* ignore */
  }
}
