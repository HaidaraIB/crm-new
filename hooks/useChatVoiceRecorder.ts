import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_VOICE_MS = 4 * 60 * 1000;

export type UseChatVoiceRecorderOptions = {
  /** When false, start is a no-op. */
  enabled?: boolean;
  /** Extra busy gate (e.g. send in flight). */
  busy?: boolean;
  onRecordingComplete: (file: File) => void;
  onError?: (messageKey: string) => void;
  /** i18n key when mic permission denied. Default: teamChatMicDenied */
  micDeniedKey?: string;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Prefer OGG/Opus for WhatsApp, then WebM, then Safari-friendly MP4/AAC. */
const VOICE_MIME_CANDIDATES = [
  'audio/ogg;codecs=opus',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
] as const;

function pickVoiceRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  for (const candidate of VOICE_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return '';
}

/** Map MediaRecorder MIME to a real file extension (never invent .webm for MP4). */
function extensionForAudioMime(mime: string): string {
  const base = (mime || '').split(';')[0].trim().toLowerCase();
  if (base.includes('ogg') || base.includes('opus')) return 'ogg';
  if (base.includes('webm')) return 'webm';
  if (base === 'audio/aac') return 'aac';
  if (base.includes('mp4') || base.includes('m4a') || base.includes('aac')) return 'm4a';
  if (base.includes('mpeg') || base.includes('mp3')) return 'mp3';
  return 'webm';
}

/**
 * Shared MediaRecorder hook for Team Chat and WhatsApp composers.
 * Prefers ogg/opus when available, else webm, else mp4/aac (Safari), else browser default.
 * Supports pause/resume and an elapsed timer (paused time is excluded).
 */
export function useChatVoiceRecorder({
  enabled = true,
  busy = false,
  onRecordingComplete,
  onError,
  micDeniedKey = 'teamChatMicDenied',
}: UseChatVoiceRecorderOptions) {
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);
  const segmentStartedAtRef = useRef<number | null>(null);
  const discardOnStopRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const readElapsedMs = useCallback(() => {
    let total = accumulatedMsRef.current;
    if (segmentStartedAtRef.current != null) {
      total += Date.now() - segmentStartedAtRef.current;
    }
    return total;
  }, []);

  const startTicker = useCallback(() => {
    if (tickRef.current != null) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setElapsedMs(readElapsedMs());
    }, 200);
  }, [readElapsedMs]);

  const resetTiming = useCallback(() => {
    accumulatedMsRef.current = 0;
    segmentStartedAtRef.current = null;
    setElapsedMs(0);
    setVoicePaused(false);
  }, []);

  const cleanupStream = useCallback(() => {
    recordStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    recordStreamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  const stopVoiceRecording = useCallback(() => {
    clearTimers();
    const mr = mediaRecorderRef.current;
    if (!mr) {
      setVoiceRecording(false);
      resetTiming();
      return;
    }
    try {
      if (mr.state === 'paused') mr.resume();
    } catch {
      //
    }
    if (mr.state === 'recording' || mr.state === 'paused') {
      try {
        mr.stop();
      } catch {
        cleanupStream();
        setVoiceRecording(false);
        resetTiming();
      }
    } else {
      cleanupStream();
      setVoiceRecording(false);
      resetTiming();
    }
  }, [clearTimers, cleanupStream, resetTiming]);

  const cancelVoiceRecording = useCallback(() => {
    discardOnStopRef.current = true;
    stopVoiceRecording();
  }, [stopVoiceRecording]);

  const pauseVoiceRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== 'recording') return;
    try {
      mr.pause();
    } catch {
      return;
    }
    if (segmentStartedAtRef.current != null) {
      accumulatedMsRef.current += Date.now() - segmentStartedAtRef.current;
      segmentStartedAtRef.current = null;
    }
    setElapsedMs(accumulatedMsRef.current);
    setVoicePaused(true);
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const resumeVoiceRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== 'paused') return;
    try {
      mr.resume();
    } catch {
      return;
    }
    segmentStartedAtRef.current = Date.now();
    setVoicePaused(false);
    startTicker();
  }, [startTicker]);

  const startVoiceRecording = useCallback(async () => {
    if (!enabled || voiceRecording || busy) return;
    discardOnStopRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      mediaChunksRef.current = [];
      resetTiming();
      const mime = pickVoiceRecorderMime();
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 })
        : new MediaRecorder(stream, { audioBitsPerSecond: 64000 });
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) mediaChunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const discard = discardOnStopRef.current;
        discardOnStopRef.current = false;
        clearTimers();
        stream.getTracks().forEach((tr) => tr.stop());
        recordStreamRef.current = null;
        mediaRecorderRef.current = null;
        setVoiceRecording(false);
        resetTiming();
        const chunks = mediaChunksRef.current.slice();
        mediaChunksRef.current = [];
        if (discard) return;
        const type = mr.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunks, { type });
        if (blob.size > 0) {
          const ext = extensionForAudioMime(type);
          onRecordingComplete(new File([blob], `voice-${Date.now()}.${ext}`, { type }));
        }
      };
      mediaRecorderRef.current = mr;
      mr.start(400);
      segmentStartedAtRef.current = Date.now();
      setVoiceRecording(true);
      startTicker();
      stopTimerRef.current = window.setTimeout(() => {
        stopVoiceRecording();
      }, MAX_VOICE_MS);
    } catch {
      onError?.(micDeniedKey);
      clearTimers();
      cleanupStream();
      setVoiceRecording(false);
      resetTiming();
    }
  }, [
    busy,
    cleanupStream,
    clearTimers,
    enabled,
    micDeniedKey,
    onError,
    onRecordingComplete,
    resetTiming,
    startTicker,
    stopVoiceRecording,
    voiceRecording,
  ]);

  useEffect(() => {
    return () => {
      clearTimers();
      cleanupStream();
    };
  }, [clearTimers, cleanupStream]);

  return {
    voiceRecording,
    voicePaused,
    elapsedMs,
    elapsedLabel: formatElapsed(elapsedMs),
    startVoiceRecording,
    stopVoiceRecording,
    pauseVoiceRecording,
    resumeVoiceRecording,
    cancelVoiceRecording,
  };
}
