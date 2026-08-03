const WHATSAPP_INCOMING_CALL_SRC = '/sounds/whatsapp_incoming_call.wav';

let pooled: HTMLAudioElement | null = null;

/** Warm decode + HTTP cache for the inbound WhatsApp call ringtone. */
export function preloadWhatsAppIncomingCallRingtone(): void {
  if (typeof window === 'undefined') return;
  if (pooled) return;
  try {
    pooled = new Audio(WHATSAPP_INCOMING_CALL_SRC);
    pooled.preload = 'auto';
    pooled.loop = true;
    void pooled.load();
  } catch {
    pooled = null;
  }
}

/** Loop `public/sounds/whatsapp_incoming_call.wav` while an inbound call is ringing. */
export function startWhatsAppIncomingCallRingtone(): void {
  if (typeof window === 'undefined') return;
  preloadWhatsAppIncomingCallRingtone();
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

/** Stop the inbound WhatsApp call ringtone. */
export function stopWhatsAppIncomingCallRingtone(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!pooled) return;
    pooled.pause();
    pooled.currentTime = 0;
  } catch {
    /* ignore */
  }
}
