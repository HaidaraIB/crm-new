const WHATSAPP_NOTIFICATION_SOURCES = [
  '/sounds/notification_whatsapp.mp3',
  '/sounds/notification_whatsapp.wav',
] as const;

let pooled: HTMLAudioElement | null = null;
let unlockBound = false;
let preferredSrc: string = WHATSAPP_NOTIFICATION_SOURCES[0];

function bindUnlockOnce(): void {
  if (typeof window === 'undefined' || unlockBound) return;
  unlockBound = true;
  const unlock = () => {
    preloadIncomingWhatsAppSound();
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
  // Browsers block Audio.play() until a user gesture; unlock on first interaction.
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
}

function createPooledAudio(src: string): HTMLAudioElement {
  const a = new Audio(src);
  a.preload = 'auto';
  a.addEventListener(
    'error',
    () => {
      const idx = WHATSAPP_NOTIFICATION_SOURCES.indexOf(src as (typeof WHATSAPP_NOTIFICATION_SOURCES)[number]);
      const next = idx >= 0 ? WHATSAPP_NOTIFICATION_SOURCES[idx + 1] : undefined;
      if (!next || pooled !== a) return;
      preferredSrc = next;
      pooled = createPooledAudio(next);
      void pooled.load();
    },
    { once: true },
  );
  return a;
}

/** Warm decode + HTTP cache; call once when WhatsApp notifications are enabled (or on app load). */
export function preloadIncomingWhatsAppSound(): void {
  if (typeof window === 'undefined') return;
  bindUnlockOnce();
  if (pooled) return;
  try {
    pooled = createPooledAudio(preferredSrc);
    void pooled.load();
  } catch {
    pooled = null;
  }
}

/**
 * Plays WhatsApp inbound notification sound (mp3, falls back to wav).
 * Uses a preloaded element; clones for overlapping plays.
 * Browsers may still block until a user gesture — unlock is bound on first pointer/key.
 */
export function playIncomingWhatsAppSound(): void {
  if (typeof window === 'undefined') return;
  preloadIncomingWhatsAppSound();
  try {
    if (!pooled) return;
    const node = pooled.cloneNode(true) as HTMLAudioElement;
    node.currentTime = 0;
    void node.play().catch(() => {
      // Fallback: retry on the pooled element (helps after unlock).
      try {
        pooled!.pause();
        pooled!.currentTime = 0;
        void pooled!.play().catch(() => {
          /* autoplay still blocked or decode error */
        });
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
}
