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
} from '../services/api';

export type CallSessionPhase =
  | 'idle'
  | 'connecting'
  | 'ringing'
  | 'active'
  | 'ending'
  | 'error';

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

  const cleanupMedia = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollAnswerRef.current) {
      window.clearInterval(pollAnswerRef.current);
      pollAnswerRef.current = null;
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
    } catch (e) {
      console.warn('WhatsApp call recording start failed', e);
    }
  };

  const flushRecording = async (callId: number, callNotes: string) => {
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
    if (blob.size < 64) return;
    try {
      await uploadWhatsAppCallRecordingAPI(callId, blob, callNotes || undefined);
    } catch (e) {
      console.warn('WhatsApp call recording upload failed', e);
    }
  };

  const createPeer = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    const local = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
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

  const acceptInbound = useCallback(async (call: WhatsAppCallRecord) => {
    setError(null);
    setPhase('connecting');
    setActiveCall(call);
    setNotes('');
    try {
      if (!call.offer_sdp) {
        const err: Error & { code?: string } = new Error('whatsappCallMissingOffer');
        err.code = 'whatsappCallMissingOffer';
        throw err;
      }
      const { pc, local, remote } = await createPeer();
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
      setPhase('active');
      startTimer();
      await startRecording(local, remote);
    } catch (e: any) {
      setError(e?.code || e?.message || 'whatsappCallAcceptFailed');
      setPhase('error');
      cleanupMedia();
      throw e;
    }
  }, [cleanupMedia]);

  const rejectInbound = useCallback(async (call: WhatsAppCallRecord) => {
    try {
      await whatsappCallRejectAPI(call.id);
    } catch {
      /* */
    }
    setActiveCall(null);
    setPhase('idle');
    cleanupMedia();
  }, [cleanupMedia]);

  const startOutbound = useCallback(
    async (opts: { to: string; clientId?: number; skipPermissionCheck?: boolean }) => {
      setError(null);
      setPhase('connecting');
      setNotes('');
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
        setPhase('ringing');

        // Poll for answer SDP from Meta connect webhook
        pollAnswerRef.current = window.setInterval(async () => {
          try {
            const detail = await getWhatsAppCallDetailAPI(created.id);
            setActiveCall(detail);
            if (detail.answer_sdp && pc.signalingState !== 'closed') {
              if (!pc.currentRemoteDescription) {
                await pc.setRemoteDescription({
                  type: 'answer',
                  sdp: detail.answer_sdp,
                });
                setPhase('active');
                startTimer();
                await startRecording(local, remote);
                if (pollAnswerRef.current) {
                  window.clearInterval(pollAnswerRef.current);
                  pollAnswerRef.current = null;
                }
              }
            }
            if (
              ['ended', 'missed', 'rejected', 'no_answer', 'failed'].includes(
                detail.status
              )
            ) {
              if (pollAnswerRef.current) {
                window.clearInterval(pollAnswerRef.current);
                pollAnswerRef.current = null;
              }
              setPhase('idle');
              cleanupMedia();
            }
          } catch {
            /* */
          }
        }, 1000);
      } catch (e: any) {
        setError(e?.code || e?.message || 'whatsappCallStartFailed');
        setPhase('error');
        cleanupMedia();
        throw e;
      }
    },
    [cleanupMedia]
  );

  const endCall = useCallback(async () => {
    const call = activeCall;
    if (!call) {
      cleanupMedia();
      setPhase('idle');
      return;
    }
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
