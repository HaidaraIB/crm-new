/**
 * Turn any audio file the browser can decode (MP3, M4A, WAV, OGG…) into what the
 * phone system stores for a greeting: a WAV of 16-bit PCM, mono, 8 kHz. The
 * conversion happens here, in the browser, so the CRM server never transcodes
 * (telephony/services/sounds.py accepts exactly this format).
 */

export const PHONE_SAMPLE_RATE = 8000;
export const MAX_GREETING_SECONDS = 60;
export const MIN_GREETING_SECONDS = 0.5;

export class PhoneAudioError extends Error {
  constructor(public code: 'decode_failed' | 'too_long' | 'too_short') {
    super(code);
  }
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Decode, mix down to mono and resample to 8 kHz; rejects audio outside 0.5–60 s. */
export async function toPhoneWav(file: Blob): Promise<{ wav: Blob; seconds: number }> {
  const AudioCtx: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new PhoneAudioError('decode_failed');
  } finally {
    void ctx.close();
  }
  if (decoded.duration > MAX_GREETING_SECONDS) throw new PhoneAudioError('too_long');
  if (decoded.duration < MIN_GREETING_SECONDS) throw new PhoneAudioError('too_short');
  // A one-channel offline context mixes every input channel down and resamples.
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * PHONE_SAMPLE_RATE), PHONE_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return { wav: encodeWav(rendered.getChannelData(0), PHONE_SAMPLE_RATE), seconds: rendered.duration };
}
