/**
 * Browser WebRTC session for WhatsApp Cloud Calling (Meta Graph signaling).
 * Media is browser WebRTC to Meta.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type WhatsAppCallRecord,
  uploadWhatsAppCallRecordingAPI,
  whatsappCallAcceptAPI,
  whatsappCallInitiateAPI,
  whatsappCallPreAcceptAPI,
  whatsappCallRejectAPI,
  whatsappCallTerminateAPI,
  getWhatsAppCallDetailAPI,
  detectMicPermissionErrorCode,
} from '../services/api';

export type CallSessionPhase =
  | 'idle'
  | 'connecting'
  | 'ringing'
  | 'active'
  | 'ending'
  | 'error';

const TERMINAL_CALL_STATUSES = new Set([
  'ended',
  'missed',
  'rejected',
  'no_answer',
  'failed',
]);

const ACTIVE_STATUS_POLL_MS = 2_000;
const ICE_DISCONNECT_GRACE_MS = 2_500;

function preferOpus(sdp: string): string {
  // Keep Meta-friendly OPUS when possible; leave SDP mostly intact.
  return sdp;
}

async function mixStreamsForRecording(
  local: MediaStream,
  remote: MediaStream
): Promise<{ stream: MediaStream; ctx: AudioContext }> {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  const add = (stream: MediaStream) => {
    stream.getAudioTracks().forEach((track) => {
      const src = ctx.createMediaStreamSource(new MediaStream([track]));
      src.connect(dest);
    });
  };
  add(local);
  add(remote);
  return { stream: dest.stream, ctx };
}

export function useWhatsAppCallSession() {
  const [phase, setPhase] = useState<CallSessionPhase>('idle');
  const [activeCall, setActiveCall] = useState<WhatsAppCallRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [notes, setNotes] = useState('');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const pollAnswerRef = useRef<number | null>(null);
  const iceDisconnectTimerRef = useRef<number | null>(null);
  const finalizingRef = useRef(false);
  /** True only after the peer actually answered (inbound agent accept / outbound answer SDP). */
  const callAnsweredRef = useRef(false);
  const recordingStartedRef = useRef(false);
  const activeCallRef = useRef<WhatsAppCallRecord | null>(null);
  const phaseRef = useRef<CallSessionPhase>(phase);
  const notesRef = useRef(notes);
  activeCallRef.current = activeCall;
  phaseRef.current = phase;
  notesRef.current = notes;

  const cleanupMedia = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollAnswerRef.current) {
      window.clearInterval(pollAnswerRef.current);
      pollAnswerRef.current = null;
    }
    if (iceDisconnectTimerRef.current) {
      window.clearTimeout(iceDisconnectTimerRef.current);
      iceDisconnectTimerRef.current = null;
    }
    try {
      recorderRef.current?.stop();
    } catch {
      /* */
    }
    recorderRef.current = null;
    chunksRef.current = [];
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    try {
      void audioCtxRef.current?.close();
    } catch {
      /* */
    }
    audioCtxRef.current = null;
  }, []);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  const ensureAudioEl = () => {
    if (!remoteAudioRef.current) {
      const el = document.createElement('audio');
      el.autoplay = true;
      el.setAttribute('playsinline', 'true');
      remoteAudioRef.current = el;
    }
    return remoteAudioRef.current;
  };

  const startTimer = () => {
    setElapsedSec(0);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
  };

  const startRecording = async (local: MediaStream, remote: MediaStream) => {
    if (recordingStartedRef.current || recorderRef.current) return;
    if (!callAnsweredRef.current) return;
    try {
      const { stream, ctx } = await mixStreamsForRecording(local, remote);
      audioCtxRef.current = ctx;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.start(1000);
      recorderRef.current = rec;
      recordingStartedRef.current = true;
    } catch (e) {
      console.warn('WhatsApp call recording start failed', e);
    }
  };

  const flushRecording = async (callId: number, callNotes: string) => {
    // Never upload audio for unanswered attempts — CRM keeps the call row only.
    if (!callAnsweredRef.current || !recordingStartedRef.current) {
      try {
        recorderRef.current?.stop();
      } catch {
        /* */
      }
      recorderRef.current = null;
      chunksRef.current = [];
      return;
    }
    const rec = recorderRef.current;
    if (!rec) return;
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      try {
        if (rec.state !== 'inactive') rec.stop();
      } catch {
        resolve();
      }
    });
    const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
    chunksRef.current = [];
    recorderRef.current = null;
    recordingStartedRef.current = false;
    if (blob.size < 64) return;
    try {
      await uploadWhatsAppCallRecordingAPI(callId, blob, callNotes || undefined);
    } catch (e) {
      console.warn('WhatsApp call recording upload failed', e);
    }
  };

  /** Local teardown when the remote party (or Meta) already ended the call. */
  const finalizeAfterRemoteHangup = useCallback(
    async (callId: number) => {
      if (finalizingRef.current) return;
      const phaseNow = phaseRef.current;
      if (phaseNow === 'idle' || phaseNow === 'ending' || phaseNow === 'error') return;
      const current = activeCallRef.current;
      if (current && current.id !== callId) return;

      finalizingRef.current = true;
      setPhase('ending');
      const callNotes = notesRef.current;
      try {
        await flushRecording(callId, callNotes);
      } catch {
        /* */
      }
      cleanupMedia();
      setActiveCall(null);
      setPhase('idle');
      setMuted(false);
      setNotes('');
      callAnsweredRef.current = false;
      recordingStartedRef.current = false;
      finalizingRef.current = false;
    },
    [cleanupMedia]
  );

  const attachRemoteEndWatchers = useCallback(
    (pc: RTCPeerConnection, callId: number) => {
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'failed' || state === 'closed') {
          void finalizeAfterRemoteHangup(callId);
          return;
        }
        if (state === 'disconnected') {
          if (iceDisconnectTimerRef.current) {
            window.clearTimeout(iceDisconnectTimerRef.current);
          }
          iceDisconnectTimerRef.current = window.setTimeout(() => {
            iceDisconnectTimerRef.current = null;
            const still =
              pc.connectionState === 'disconnected' ||
              pc.connectionState === 'failed' ||
              pc.connectionState === 'closed';
            if (still) void finalizeAfterRemoteHangup(callId);
          }, ICE_DISCONNECT_GRACE_MS);
          return;
        }
        if (
          iceDisconnectTimerRef.current &&
          (state === 'connected' || state === 'connecting')
        ) {
          window.clearTimeout(iceDisconnectTimerRef.current);
          iceDisconnectTimerRef.current = null;
        }
      };
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'failed' || state === 'closed') {
          void finalizeAfterRemoteHangup(callId);
        }
      };
    },
    [finalizeAfterRemoteHangup]
  );

  // Poll CRM call status while in-session so Meta terminate webhooks end the agent UI.
  useEffect(() => {
    if (phase !== 'active' && phase !== 'ringing' && phase !== 'connecting') return;
    const callId = activeCall?.id;
    if (!callId) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled || finalizingRef.current) return;
      try {
        const detail = await getWhatsAppCallDetailAPI(callId);
        if (cancelled) return;
        setActiveCall(detail);
        if (TERMINAL_CALL_STATUSES.has(String(detail.status || '').toLowerCase())) {
          await finalizeAfterRemoteHangup(callId);
        }
      } catch {
        /* ignore poll errors */
      }
    };

    void tick();
    const id = window.setInterval(tick, ACTIVE_STATUS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [phase, activeCall?.id, finalizeAfterRemoteHangup]);

  const createPeer = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    let local: MediaStream;
    try {
      local = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (mediaErr: any) {
      const err: Error & { code?: string; name?: string } = new Error(
        mediaErr?.message || 'whatsapp_mic_permission_denied'
      );
      err.name = mediaErr?.name || 'NotAllowedError';
      err.code = 'whatsapp_mic_permission_denied';
      throw err;
    }
    localStreamRef.current = local;
    local.getTracks().forEach((track) => pc.addTrack(track, local));

    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    pc.ontrack = (ev) => {
      ev.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
      const audio = ensureAudioEl();
      audio.srcObject = remote;
      void audio.play().catch(() => undefined);
    };
    pcRef.current = pc;
    return { pc, local, remote };
  };

  const acceptInbound = useCallback(
    async (call: WhatsAppCallRecord) => {
      setError(null);
      setPhase('connecting');
      setActiveCall(call);
      setNotes('');
      finalizingRef.current = false;
      callAnsweredRef.current = false;
      recordingStartedRef.current = false;
      try {
        if (!call.offer_sdp) {
          const err: Error & { code?: string } = new Error('whatsappCallMissingOffer');
          err.code = 'whatsappCallMissingOffer';
          throw err;
        }
        const { pc, local, remote } = await createPeer();
        attachRemoteEndWatchers(pc, call.id);
        await pc.setRemoteDescription({ type: 'offer', sdp: call.offer_sdp });
        const answer = await pc.createAnswer();
        const sdp = preferOpus(answer.sdp || '');
        await pc.setLocalDescription({ type: 'answer', sdp });

        // Wait briefly for ICE gather (non-trickle for Meta)
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
            return;
          }
          const t = window.setTimeout(resolve, 2500);
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
              window.clearTimeout(t);
              resolve();
            }
          };
        });
        const finalSdp = preferOpus(pc.localDescription?.sdp || sdp);

        try {
          await whatsappCallPreAcceptAPI(call.id, finalSdp);
        } catch {
          /* pre_accept optional */
        }
        const updated = await whatsappCallAcceptAPI(call.id, finalSdp);
        setActiveCall(updated);
        // Inbound: agent accept connects an already-ringing customer — treat as answered.
        callAnsweredRef.current = true;
        setPhase('active');
        startTimer();
        await startRecording(local, remote);
      } catch (e: any) {
        const code = e?.code || detectMicPermissionErrorCode(e) || e?.message || 'whatsappCallAcceptFailed';
        setError(code);
        setPhase('error');
        cleanupMedia();
        throw e;
      }
    },
    [attachRemoteEndWatchers, cleanupMedia]
  );

  const rejectInbound = useCallback(
    async (call: WhatsAppCallRecord) => {
      try {
        await whatsappCallRejectAPI(call.id);
      } catch {
        /* */
      }
      // Only tear down WebRTC when rejecting the call that owns this session.
      // A waiting second inbound must not kill an active call.
      const current = activeCallRef.current;
      if (!current || current.id === call.id) {
        setActiveCall(null);
        setPhase('idle');
        callAnsweredRef.current = false;
        recordingStartedRef.current = false;
        cleanupMedia();
      }
    },
    [cleanupMedia]
  );

  const startOutbound = useCallback(
    async (opts: { to: string; clientId?: number; skipPermissionCheck?: boolean }) => {
      setError(null);
      setPhase('connecting');
      setNotes('');
      finalizingRef.current = false;
      callAnsweredRef.current = false;
      recordingStartedRef.current = false;
      try {
        const { pc, local, remote } = await createPeer();
        const offer = await pc.createOffer();
        const sdp = preferOpus(offer.sdp || '');
        await pc.setLocalDescription({ type: 'offer', sdp });
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
            return;
          }
          const t = window.setTimeout(resolve, 2500);
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
              window.clearTimeout(t);
              resolve();
            }
          };
        });
        const finalSdp = preferOpus(pc.localDescription?.sdp || sdp);
        const created = await whatsappCallInitiateAPI({
          to: opts.to,
          sdp: finalSdp,
          client_id: opts.clientId,
          skip_permission_check: opts.skipPermissionCheck,
        });
        setActiveCall(created);
        attachRemoteEndWatchers(pc, created.id);
        setPhase('ringing');

        // Poll until the customer answers (answer SDP + answered status).
        pollAnswerRef.current = window.setInterval(async () => {
          try {
            const detail = await getWhatsAppCallDetailAPI(created.id);
            setActiveCall(detail);
            const status = String(detail.status || '').toLowerCase();
            const customerAnswered =
              Boolean(detail.answer_sdp) &&
              (status === 'answered' || Boolean(detail.answered_at));
            if (customerAnswered && pc.signalingState !== 'closed') {
              if (!pc.currentRemoteDescription) {
                await pc.setRemoteDescription({
                  type: 'answer',
                  sdp: detail.answer_sdp!,
                });
              }
              if (!callAnsweredRef.current) {
                callAnsweredRef.current = true;
                setPhase('active');
                startTimer();
                await startRecording(local, remote);
              }
              if (pollAnswerRef.current) {
                window.clearInterval(pollAnswerRef.current);
                pollAnswerRef.current = null;
              }
            }
            if (TERMINAL_CALL_STATUSES.has(status)) {
              if (pollAnswerRef.current) {
                window.clearInterval(pollAnswerRef.current);
                pollAnswerRef.current = null;
              }
              await finalizeAfterRemoteHangup(created.id);
            }
          } catch {
            /* */
          }
        }, 1000);
      } catch (e: any) {
        const code = e?.code || detectMicPermissionErrorCode(e) || e?.message || 'whatsappCallStartFailed';
        setError(code);
        setPhase('error');
        cleanupMedia();
        throw e;
      }
    },
    [attachRemoteEndWatchers, cleanupMedia, finalizeAfterRemoteHangup]
  );

  const endCall = useCallback(async () => {
    const call = activeCall;
    if (!call) {
      cleanupMedia();
      setPhase('idle');
      return;
    }
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setPhase('ending');
    const callNotes = notes;
    try {
      await whatsappCallTerminateAPI(call.id, callNotes || undefined);
    } catch {
      /* */
    }
    try {
      await flushRecording(call.id, callNotes);
    } catch {
      /* */
    }
    cleanupMedia();
    setActiveCall(null);
    setPhase('idle');
    setMuted(false);
    setNotes('');
    callAnsweredRef.current = false;
    recordingStartedRef.current = false;
    finalizingRef.current = false;
  }, [activeCall, notes, cleanupMedia]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
  }, [muted]);

  const dismissError = useCallback(() => {
    setError(null);
    setPhase('idle');
    setActiveCall(null);
    callAnsweredRef.current = false;
    recordingStartedRef.current = false;
    cleanupMedia();
  }, [cleanupMedia]);

  return {
    phase,
    activeCall,
    error,
    muted,
    elapsedSec,
    notes,
    setNotes,
    acceptInbound,
    rejectInbound,
    startOutbound,
    endCall,
    toggleMute,
    dismissError,
  };
}
