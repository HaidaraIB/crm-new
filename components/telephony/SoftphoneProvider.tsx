/**
 * Loop Cloud PBX softphone (browser, JsSIP) and click-to-call.
 *
 * Mounted once next to the WhatsApp call listener. It:
 *  - first checks the shared integration policy, then asks GET /telephony/me/
 *    what an eligible user can do (everything stays inert for companies whose
 *    plan or pilot policy explicitly denies telephony, and LeadContactPhone
 *    keeps its tel: link);
 *  - for a WebRTC extension, registers with the short-lived credentials from
 *    GET /telephony/me/webrtc-credentials/ and re-registers before they expire;
 *  - places click-to-call through POST /telephony/calls/. The PBX rings the
 *    agent first: a browser agent's INVITE carries X-Loop-Call-Id equal to the
 *    call we asked for and is answered automatically; a desk-phone agent is told
 *    to pick up;
 *  - shows inbound calls; the caller's lead is looked up through the
 *    authenticated REST API with X-Loop-Call-Id (the header is only ever used to
 *    look something up, never to authorize).
 *
 * One call at a time across PBX and WhatsApp. While a browser PBX call is already
 * up, one more inbound invite is offered (answer holds the current call; reject
 * sends 486 on that invite only). Any further invite, and any invite while
 * WhatsApp is the busy line, still gets 486. Click-to-call is refused while busy.
 * The provider registers its busy state (and how to end the call) with the
 * WhatsApp listener, which then refuses to start a WhatsApp call.
 *
 * Agent status (spec section 6): Available / Paused, set from the header. The CRM
 * pushes it to the PBX before saving, and a paused agent's extension answers busy.
 *
 * The realtime socket carries no call data (ADR 0003), so while a call is live
 * its row is re-read over REST every few seconds; nothing polls when idle.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// JsSIP is loaded on demand: only users with a browser extension ever need it.
type JsSIPModule = typeof import('jssip');
import type { RTCSession } from 'jssip/lib/RTCSession';
import type { IncomingRTCSessionEvent, UA } from 'jssip/lib/UA';

import { useAppContext } from '../../context/AppContext';
import {
  getPbxCallAPI,
  getIntegrationPolicyAPI,
  getTelephonyMeAPI,
  getWebRtcCredentialsAPI,
  hangupPbxCallAPI,
  PBX_LIVE_STATUSES,
  placePbxCallAPI,
  setMyAgentStatusAPI,
  type AgentStatus,
  type PbxCallRecord,
  type TelephonyMe,
  type WebRtcCredentials,
} from '../../services/api';
import { shouldQueryTelephonyMe } from '../../utils/telephonyEligibility';
import {
  preloadWhatsAppIncomingCallRingtone,
  startWhatsAppIncomingCallRingtone,
  stopWhatsAppIncomingCallRingtone,
} from '../../utils/whatsappIncomingCallRingtone';
import { useWhatsAppCallingOptional } from '../whatsapp/WhatsAppCallListener';
import { SoftphoneDock } from './SoftphoneDock';

export type Registration = 'off' | 'connecting' | 'registered' | 'failed';

export type SoftphoneCall = {
  /** Our PbxCall id, once known (click-to-call: immediately; inbound: from X-Loop-Call-Id). */
  callId: string | null;
  direction: 'inbound' | 'outbound';
  /** ringing-in: inbound waiting for the agent; dialing: click-to-call before the lead answers. */
  phase: 'ringing-in' | 'dialing' | 'active' | 'ended';
  remoteNumber: string;
  contactId: number | null;
  contactName: string | null;
  /** Browser leg (WebRTC) vs. desk phone (controls are limited to hang up). */
  viaBrowser: boolean;
  muted: boolean;
  held: boolean;
  startedAt: number | null;
  endStatus: string | null;
};

export type WaitingCall = {
  callId: string | null;
  remoteNumber: string;
  contactName: string | null;
};

type SoftphoneContextValue = {
  me: TelephonyMe | null;
  canClickToCall: boolean;
  registration: Registration;
  call: SoftphoneCall | null;
  /** A second inbound invite while `call` is already up. */
  waiting: WaitingCall | null;
  /** The previous browser call is parked because the waiting one was answered. */
  otherOnHold: boolean;
  busy: boolean;
  placeCall: (destination: string, contactId?: number | null) => Promise<void>;
  answer: () => void;
  decline: () => void;
  answerWaiting: () => void;
  declineWaiting: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  sendDtmf: (tone: string) => void;
  transfer: (extension: string) => void;
  dismissEnded: () => void;
  agentStatus: AgentStatus | null;
  agentStatusSaving: boolean;
  setAgentStatus: (status: AgentStatus) => Promise<void>;
};

const SoftphoneContext = createContext<SoftphoneContextValue | null>(null);

export function useSoftphoneOptional(): SoftphoneContextValue | null {
  return useContext(SoftphoneContext);
}

const POLL_MS = 2500;
const ENDED_LINGER_MS = 4000;
const EXT_RE = /^[1-9][0-9]{1,5}$/;

function isWhatsAppBusy(phase: string | undefined, active: unknown): boolean {
  return Boolean(active) || ['active', 'connecting', 'ringing', 'ending'].includes(phase || '');
}

function errorKey(err: unknown): string {
  const code = (err as { code?: string })?.code;
  return code ? `pbxErr_${code}` : 'softphoneCallFailed';
}

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const SoftphoneProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { t, currentUser, showToast } = useAppContext();
  const whatsapp = useWhatsAppCallingOptional();
  const tr = useCallback((key: string) => (t as (k: string) => string)(key), [t]);

  const queryClient = useQueryClient();
  const policyQuery = useQuery({
    queryKey: ['integrationPolicy'],
    queryFn: getIntegrationPolicyAPI,
    enabled: Boolean(currentUser?.id),
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const queryTelephonyMe = shouldQueryTelephonyMe(
    currentUser?.id,
    policyQuery.status,
    policyQuery.data?.telephony?.enabled,
  );
  const meKey = useMemo(() => ['telephony', 'me', currentUser?.id ?? null], [currentUser?.id]);
  const meQuery = useQuery({
    queryKey: meKey,
    queryFn: getTelephonyMeAPI,
    enabled: queryTelephonyMe,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const me = meQuery.isSuccess ? meQuery.data : null;

  const [registration, setRegistration] = useState<Registration>('off');
  const [call, setCall] = useState<SoftphoneCall | null>(null);
  const [waiting, setWaiting] = useState<WaitingCall | null>(null);
  const [otherOnHold, setOtherOnHold] = useState(false);
  const waitingInfoRef = useRef<WaitingCall | null>(null);
  waitingInfoRef.current = waiting;
  const uaRef = useRef<UA | null>(null);
  const jssipRef = useRef<JsSIPModule | null>(null);
  const credsRef = useRef<WebRtcCredentials | null>(null);
  const sessionRef = useRef<RTCSession | null>(null);
  const waitingSessionRef = useRef<RTCSession | null>(null);
  const heldSessionRef = useRef<RTCSession | null>(null);
  const heldCallRef = useRef<SoftphoneCall | null>(null);
  const pendingCallIdRef = useRef<string | null>(null);
  /**
   * The node originates before the CRM's 202 reaches us, so the agent-leg INVITE
   * can arrive while POST /telephony/calls/ is still in flight. Held here until
   * the response says whether it is ours.
   */
  const earlyInviteRef = useRef<{ callId: string; session: RTCSession } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callRef = useRef<SoftphoneCall | null>(null);
  callRef.current = call;

  const whatsappBusy = isWhatsAppBusy(whatsapp?.phase, whatsapp?.activeCall);
  const pbxBusy = Boolean(call && call.phase !== 'ended');
  const busy = pbxBusy || whatsappBusy;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const patchCall = useCallback((patch: Partial<SoftphoneCall>) => {
    setCall((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const finish = useCallback((endStatus: string | null) => {
    stopWhatsAppIncomingCallRingtone();
    sessionRef.current = null;
    pendingCallIdRef.current = null;
    setCall((prev) => (prev ? { ...prev, phase: 'ended', endStatus } : prev));
  }, []);

  // ---- remote audio ---------------------------------------------------------

  const attachAudio = useCallback((session: RTCSession) => {
    const pc = session.connection;
    if (!pc) return;
    const play = () => {
      const stream = new MediaStream();
      pc.getReceivers().forEach((r) => r.track && stream.addTrack(r.track));
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
        void audioRef.current.play().catch(() => undefined);
      }
    };
    pc.addEventListener('track', play);
    play();
  }, []);

  // ---- caller / call lookup --------------------------------------------------

  const lookupCall = useCallback(
    async (callId: string, attempts = 4) => {
      for (let i = 0; i < attempts; i += 1) {
        try {
          const row: PbxCallRecord = await getPbxCallAPI(callId);
          if (callRef.current?.callId !== callId) return;
          patchCall({ contactId: row.crm_contact, contactName: row.crm_contact_name });
          return;
        } catch {
          // The node reports call.created within about a second; try again shortly.
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    },
    [patchCall],
  );

  // ---- SIP session wiring ------------------------------------------------------

  const wireSession = useCallback(
    (session: RTCSession) => {
      sessionRef.current = session;
      session.on('confirmed', () => {
        stopWhatsAppIncomingCallRingtone();
        attachAudio(session);
        // Click-to-call: the agent leg is up, the lead is being dialled (phase stays "dialing"
        // until the PBX reports the lead answered, via polling below).
        setCall((prev) =>
          prev && prev.phase === 'ringing-in' ? { ...prev, phase: 'active', startedAt: Date.now() } : prev,
        );
      });
      const onGone = (endStatus: string | null) => {
        if (heldSessionRef.current === session && sessionRef.current !== session) {
          heldSessionRef.current = null;
          heldCallRef.current = null;
          setOtherOnHold(false);
          return;
        }
        if (sessionRef.current !== session) return;
        const held = heldSessionRef.current;
        const heldCall = heldCallRef.current;
        if (held && heldCall) {
          heldSessionRef.current = null;
          heldCallRef.current = null;
          sessionRef.current = held;
          setOtherOnHold(false);
          try { held.unhold(); } catch { /* the other party already left */ }
          setCall({ ...heldCall, held: false, phase: 'active' });
          attachAudio(held);
          return;
        }
        finish(endStatus);
      };
      session.on('ended', () => onGone(callRef.current?.phase === 'dialing' ? null : 'answered'));
      session.on('failed', (e) => {
        const cause = (e as { cause?: string })?.cause || '';
        const causes = jssipRef.current?.C.causes;
        const micDenied = Boolean(causes) && cause === causes?.USER_DENIED_MEDIA_ACCESS;
        onGone(causes && cause === causes.CANCELED ? 'missed' : micDenied ? 'failed' : null);
        if (micDenied) showToast(tr('softphoneMicDenied'), { variant: 'error' });
      });
      session.on('hold', () => { if (sessionRef.current === session) patchCall({ held: true }); });
      session.on('unhold', () => { if (sessionRef.current === session) patchCall({ held: false }); });
    },
    [attachAudio, finish, patchCall, showToast, tr],
  );

  const pcConfig = useCallback((): RTCConfiguration => {
    const turn = credsRef.current?.turn;
    return turn && turn.urls.length && turn.username
      ? { iceServers: [{ urls: turn.urls, username: turn.username, credential: turn.credential }] }
      : { iceServers: [] };
  }, []);

  const answerOwnLeg = useCallback(
    (session: RTCSession) => {
      wireSession(session);
      patchCall({ viaBrowser: true });
      session.answer({ mediaConstraints: { audio: true, video: false }, pcConfig: pcConfig() });
    },
    [patchCall, pcConfig, wireSession],
  );

  const onIncoming = useCallback(
    (e: IncomingRTCSessionEvent) => {
      if (e.originator !== 'remote') return;
      const session = e.session;
      const callId = e.request.getHeader('X-Loop-Call-Id') || null;

      // The leg the PBX places to us for a click-to-call we just asked for.
      if (callId && callId === pendingCallIdRef.current) {
        answerOwnLeg(session);
        return;
      }
      const current = callRef.current;
      if (callId && current?.phase === 'dialing' && current.callId === null) {
        earlyInviteRef.current = { callId, session };
        return;
      }
      const phase = callRef.current?.phase;
      const onThisCall = phase === 'active' || phase === 'dialing';
      if (onThisCall && !waitingSessionRef.current) {
        const remote = session.remote_identity?.uri?.user || session.remote_identity?.display_name || '';
        waitingSessionRef.current = session;
        setWaiting({ callId, remoteNumber: remote, contactName: null });
        startWhatsAppIncomingCallRingtone();
        const clearIfStillWaiting = () => {
          if (waitingSessionRef.current !== session) return;
          waitingSessionRef.current = null;
          setWaiting(null);
          stopWhatsAppIncomingCallRingtone();
        };
        session.on('ended', clearIfStillWaiting);
        session.on('failed', clearIfStillWaiting);
        if (callId) {
          void getPbxCallAPI(callId).then((row) => {
            setWaiting((prev) => (prev && prev.callId === callId ? { ...prev, contactName: row.crm_contact_name } : prev));
          }).catch(() => undefined);
        }
        return;
      }
      if (busyRef.current) {
        session.terminate({ status_code: 486, reason_phrase: 'Busy Here' });
        return;
      }
      const remote = session.remote_identity?.uri?.user || session.remote_identity?.display_name || '';
      wireSession(session);
      setCall({
        callId,
        direction: 'inbound',
        phase: 'ringing-in',
        remoteNumber: remote,
        contactId: null,
        contactName: null,
        viaBrowser: true,
        muted: false,
        held: false,
        startedAt: null,
        endStatus: null,
      });
      startWhatsAppIncomingCallRingtone();
      if (callId) void lookupCall(callId);
    },
    [answerOwnLeg, lookupCall, wireSession],
  );

  // ---- registration (WebRTC extensions only) --------------------------------------

  useEffect(() => {
    if (!me?.webrtc) return undefined;
    let stopped = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    preloadWhatsAppIncomingCallRingtone();

    const start = async () => {
      setRegistration('connecting');
      let creds: WebRtcCredentials;
      let JsSIP: JsSIPModule;
      try {
        [creds, JsSIP] = await Promise.all([getWebRtcCredentialsAPI(), import('jssip')]);
        jssipRef.current = JsSIP;
      } catch {
        if (!stopped) setRegistration('failed');
        return;
      }
      if (stopped) return;
      credsRef.current = creds;
      const sipUser = creds.sip.uri.replace(/^sip:/, '').split('@')[0];
      const ua = new JsSIP.UA({
        sockets: [new JsSIP.WebSocketInterface(creds.sip.ws_uri)],
        uri: creds.sip.uri,
        authorization_user: creds.sip.username || sipUser,
        password: creds.sip.password,
        realm: creds.sip.realm || undefined,
        register: true,
        session_timers: false,
        user_agent: 'Loop CRM',
      });
      ua.on('registered', () => !stopped && setRegistration('registered'));
      ua.on('unregistered', () => !stopped && setRegistration('connecting'));
      ua.on('registrationFailed', () => !stopped && setRegistration('failed'));
      ua.on('disconnected', () => !stopped && setRegistration('connecting'));
      ua.on('newRTCSession', onIncoming as never);
      uaRef.current = ua;
      ua.start();

      // New credentials before these expire; never in the middle of a call.
      const refreshIn = Math.max(60_000, new Date(creds.refresh_after).getTime() - Date.now());
      refreshTimer = setTimeout(function refresh() {
        if (stopped) return;
        if (sessionRef.current) {
          refreshTimer = setTimeout(refresh, 60_000);
          return;
        }
        ua.stop();
        uaRef.current = null;
        void start();
      }, refreshIn);
    };

    void start();
    return () => {
      stopped = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      uaRef.current?.stop();
      uaRef.current = null;
      setRegistration('off');
    };
  }, [me?.webrtc, onIncoming]);

  // ---- live call polling (REST; the socket carries no call data) ---------------------

  const polledCallId = call && call.phase !== 'ended' ? call.callId : null;
  useEffect(() => {
    if (!polledCallId) return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const row = await getPbxCallAPI(polledCallId);
        if (cancelled || callRef.current?.callId !== polledCallId) return;
        if (!PBX_LIVE_STATUSES.includes(row.status)) {
          sessionRef.current?.terminate();
          finish(row.status);
          return;
        }
        setCall((prev) => {
          if (!prev) return prev;
          const next = { ...prev, contactId: prev.contactId ?? row.crm_contact, contactName: prev.contactName ?? row.crm_contact_name };
          if (row.status === 'in_progress' && prev.phase === 'dialing') {
            return { ...next, phase: 'active', startedAt: row.answered_at ? new Date(row.answered_at).getTime() : Date.now() };
          }
          return next;
        });
      } catch {
        /* keep the last known state; the next tick retries */
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [finish, polledCallId]);

  // Clear the "call ended" card after a moment.
  useEffect(() => {
    if (call?.phase !== 'ended') return undefined;
    const id = setTimeout(() => setCall((prev) => (prev?.phase === 'ended' ? null : prev)), ENDED_LINGER_MS);
    return () => clearTimeout(id);
  }, [call?.phase]);

  // ---- actions -------------------------------------------------------------------

  const placeCall = useCallback(
    async (destination: string, contactId?: number | null) => {
      if (busyRef.current) {
        showToast(tr('softphoneBusyOtherCall'), { variant: 'warning' });
        return;
      }
      const viaBrowser = Boolean(me?.webrtc);
      if (viaBrowser && registration !== 'registered') {
        showToast(tr('pbxErr_phone_not_registered'), { variant: 'error' });
        return;
      }
      setCall({
        callId: null,
        direction: 'outbound',
        phase: 'dialing',
        remoteNumber: destination,
        contactId: contactId ?? null,
        contactName: null,
        viaBrowser,
        muted: false,
        held: false,
        startedAt: null,
        endStatus: null,
      });
      try {
        const row = await placePbxCallAPI(destination, contactId ?? null, newIdempotencyKey());
        pendingCallIdRef.current = row.id;
        patchCall({ callId: row.id, remoteNumber: row.to_party || destination, contactName: row.crm_contact_name });
        const early = earlyInviteRef.current;
        earlyInviteRef.current = null;
        if (early && early.callId === row.id) answerOwnLeg(early.session);
        else early?.session.terminate({ status_code: 486, reason_phrase: 'Busy Here' });
      } catch (err) {
        earlyInviteRef.current?.session.terminate({ status_code: 486, reason_phrase: 'Busy Here' });
        earlyInviteRef.current = null;
        setCall(null);
        showToast(tr(errorKey(err)) || tr('softphoneCallFailed'), { variant: 'error' });
      }
    },
    [answerOwnLeg, me?.webrtc, patchCall, registration, showToast, tr],
  );

  const answer = useCallback(() => {
    const session = sessionRef.current;
    if (!session || callRef.current?.phase !== 'ringing-in') return;
    stopWhatsAppIncomingCallRingtone();
    session.answer({ mediaConstraints: { audio: true, video: false }, pcConfig: pcConfig() });
  }, [pcConfig]);

  const decline = useCallback(() => {
    stopWhatsAppIncomingCallRingtone();
    sessionRef.current?.terminate({ status_code: 486, reason_phrase: 'Busy Here' });
    finish('missed');
  }, [finish]);

  const declineWaiting = useCallback(() => {
    const session = waitingSessionRef.current;
    waitingSessionRef.current = null;
    setWaiting(null);
    stopWhatsAppIncomingCallRingtone();
    session?.terminate({ status_code: 486, reason_phrase: 'Busy Here' });
  }, []);

  const answerWaiting = useCallback(() => {
    const next = waitingSessionRef.current;
    const current = sessionRef.current;
    const currentCall = callRef.current;
    if (!next) return;
    waitingSessionRef.current = null;
    setWaiting(null);
    stopWhatsAppIncomingCallRingtone();
    if (current && currentCall && currentCall.phase !== 'ended') {
      try { current.hold(); } catch { /* already held */ }
      heldSessionRef.current = current;
      heldCallRef.current = { ...currentCall, held: true };
      setOtherOnHold(true);
    }
    const waitingCall = waitingInfoRef.current;
    setCall({
      callId: waitingCall?.callId ?? null,
      direction: 'inbound',
      phase: 'ringing-in',
      remoteNumber: waitingCall?.remoteNumber || '',
      contactId: null,
      contactName: waitingCall?.contactName ?? null,
      viaBrowser: true,
      muted: false,
      held: false,
      startedAt: null,
      endStatus: null,
    });
    wireSession(next);
    next.answer({ mediaConstraints: { audio: true, video: false }, pcConfig: pcConfig() });
  }, [pcConfig, wireSession]);

  const hangUp = useCallback(() => {
    const current = callRef.current;
    if (sessionRef.current) {
      sessionRef.current.terminate();
      return;
    }
    if (current?.callId) {
      void hangupPbxCallAPI(current.callId).catch(() => undefined);
    }
    finish(null);
  }, [finish]);

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.isMuted().audio) session.unmute({ audio: true });
    else session.mute({ audio: true });
    patchCall({ muted: Boolean(session.isMuted().audio) });
  }, [patchCall]);

  const toggleHold = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.isOnHold().local) session.unhold();
    else session.hold();
  }, []);

  const sendDtmf = useCallback((tone: string) => {
    if (/^[0-9*#]$/.test(tone)) sessionRef.current?.sendDTMF(tone);
  }, []);

  const transfer = useCallback((extension: string) => {
    const session = sessionRef.current;
    const domain = credsRef.current?.sip.uri.split('@')[1];
    if (!session || !domain || !EXT_RE.test(extension)) return;
    // Blind transfer with SIP REFER; Asterisk routes it through this tenant's
    // own dialplan (contract section 6), so only this tenant's extensions resolve.
    session.refer(`sip:${extension}@${domain}`);
  }, []);

  const dismissEnded = useCallback(() => setCall((prev) => (prev?.phase === 'ended' ? null : prev)), []);

  // ---- one line across PBX and WhatsApp ------------------------------------------------

  const hangUpRef = useRef(hangUp);
  hangUpRef.current = hangUp;
  const registerOtherLine = whatsapp?.registerOtherLine;
  useEffect(() => {
    if (!registerOtherLine) return undefined;
    registerOtherLine({ busy: pbxBusy, end: () => hangUpRef.current() });
    return () => registerOtherLine(null);
  }, [pbxBusy, registerOtherLine]);

  // ---- agent status ------------------------------------------------------------------

  const [agentStatusSaving, setAgentStatusSaving] = useState(false);
  const agentStatus = me?.extension?.agent_status ?? null;
  const setAgentStatus = useCallback(
    async (status: AgentStatus) => {
      setAgentStatusSaving(true);
      try {
        const saved = await setMyAgentStatusAPI(status);
        queryClient.setQueryData<TelephonyMe>(meKey, (prev) =>
          prev?.extension ? { ...prev, extension: { ...prev.extension, agent_status: saved.status } } : prev,
        );
        showToast(tr('agentStatusChanged'), { variant: 'success' });
      } catch (err) {
        showToast(tr(errorKey(err)) || tr('pbxErr_pbx_unavailable'), { variant: 'error' });
      } finally {
        setAgentStatusSaving(false);
      }
    },
    [meKey, queryClient, showToast, tr],
  );

  const value = useMemo<SoftphoneContextValue>(
    () => ({
      me,
      canClickToCall: Boolean(me?.can_click_to_call),
      registration,
      call,
      waiting,
      otherOnHold,
      busy,
      placeCall,
      answer,
      decline,
      answerWaiting,
      declineWaiting,
      hangUp,
      toggleMute,
      toggleHold,
      sendDtmf,
      transfer,
      dismissEnded,
      agentStatus,
      agentStatusSaving,
      setAgentStatus,
    }),
    [
      agentStatus, agentStatusSaving, answer, answerWaiting, busy, call, decline, declineWaiting, dismissEnded,
      hangUp, me, otherOnHold, placeCall, registration, sendDtmf, setAgentStatus, toggleHold, toggleMute, transfer,
      waiting,
    ],
  );

  return (
    <SoftphoneContext.Provider value={value}>
      {children}
      {/* Remote party's audio. Hidden; autoplay starts after the user's click on Answer / Call. */}
      <audio ref={audioRef} autoPlay hidden />
      {me ? <SoftphoneDock /> : null}
    </SoftphoneContext.Provider>
  );
};
