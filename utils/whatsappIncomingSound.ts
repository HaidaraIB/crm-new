const WHATSAPP_NOTIFICATION_SRC = '/sounds/notification_whatsapp.wav';

let pooled: HTMLAudioElement | null = null;

/** Warm decode + HTTP cache; call once when WhatsApp notifications are enabled (or on app load). */
export function preloadIncomingWhatsAppSound(): void {
  if (typeof window === 'undefined') return;
  if (pooled) return;
  try {
    pooled = new Audio(WHATSAPP_NOTIFICATION_SRC);
    pooled.preload = 'auto';
    void pooled.load();
  } catch {
    pooled = null;
  }
}

/**
 * Plays `public/sounds/notification_whatsapp.wav` using a preloaded element (lower latency than `new Audio()` each time).
 * Browsers may still block the first `play()` until a user gesture (autoplay policy).
 */
export function playIncomingWhatsAppSound(): void {
  if (typeof window === 'undefined') return;
  preloadIncomingWhatsAppSound();
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
