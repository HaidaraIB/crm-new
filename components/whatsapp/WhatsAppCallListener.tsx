import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { useWhatsAppCallSession } from '../../hooks/useWhatsAppCallSession';
import { queryKeys, useWhatsAppLiveCalls } from '../../hooks/useQueries';
import {
  getWhatsAppCallPermissionsAPI,
  resolveLocalizedApiError,
  sendWhatsAppCallPermissionRequestAPI,
  type WhatsAppCallRecord,
} from '../../services/api';
import {
  dismissLiveCallToast,
  isLiveCallToastDismissed,
  pruneLiveCallToastDismissed,
} from '../../utils/whatsappLiveCallToastDismiss';
import { Loader } from '../Loader';
import { WhatsAppCallWaitingBanner } from './WhatsAppCallWaitingBanner';
import { WhatsAppActiveCallPanel } from './WhatsAppActiveCallPanel';
import { WhatsAppLiveCallToast } from './WhatsAppLiveCallToast';
import {
  preloadWhatsAppIncomingCallRingtone,
  startWhatsAppIncomingCallRingtone,
  stopWhatsAppIncomingCallRingtone,
} from '../../utils/whatsappIncomingCallRingtone';

/** Auto-reject unanswered inbound rings (matches typical phone ring window). */
const INCOMING_CALL_TIMEOUT_MS = 30_000;

type StartOutboundArgs = {
  to: string;
  clientId?: number;
  templateId?: number;
  templateName?: string;
};

type WhatsAppCallingContextValue = {
  startOutboundCall: (args: StartOutboundArgs) => Promise<void>;
  acceptIncoming: (call: WhatsAppCallRecord) => Promise<void>;
  rejectIncoming: (call: WhatsAppCallRecord) => Promise<void>;
  phase: string;
  activeCall: WhatsAppCallRecord | null;
  elapsedSec: number;
  isStartingOutbound: boolean;
  answeringBusy: boolean;
};

const WhatsAppCallingContext = createContext<WhatsAppCallingContextValue | null>(null);

export function useWhatsAppCalling(): WhatsAppCallingContextValue {
  const ctx = useContext(WhatsAppCallingContext);
  if (!ctx) {
    throw new Error('useWhatsAppCalling must be used within WhatsAppCallListener');
  }
  return ctx;
}

export function useWhatsAppCallingOptional(): WhatsAppCallingContextValue | null {
  return useContext(WhatsAppCallingContext);
}

function isBusyPhase(phase: string): boolean {
  return (
    phase === 'active' ||
    phase === 'connecting' ||
    phase === 'ringing' ||
    phase === 'ending'
  );
}

export const WhatsAppCallListener: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { t, currentUser, showAlert, currentPage, goToPage } = useAppContext();
  const queryClient = useQueryClient();
  const session = useWhatsAppCallSession();
  const [toastCall, setToastCall] = useState<WhatsAppCallRecord | null>(null);
  /** When busy on another call, the next inbound waiting for End & answer. */
  const [waitingCall, setWaitingCall] = useState<WhatsAppCallRecord | null>(null);
  const [isStartingOutbound, setIsStartingOutbound] = useState(false);
  const [waitingActionBusy, setWaitingActionBusy] = useState(false);
  const [answeringBusy, setAnsweringBusy] = useState(false);
  const [dismissTick, setDismissTick] = useState(0);
  const acceptingRef = useRef(false);
  const activeCallIdRef = useRef<number | null>(null);
  activeCallIdRef.current = session.activeCall?.id ?? null;

  const onCallsPage = currentPage === 'Calls';
  const sessionBusy = isBusyPhase(session.phase);

  const invalidateLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['whatsappCalls'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.whatsappCallsLive });
    void queryClient.invalidateQueries({ queryKey: ['clientCalls'] });
  }, [queryClient]);

  const { data: liveInbound = [] } = useWhatsAppLiveCalls({
    enabled: Boolean(currentUser),
    refetchInterval: 2_000,
  });

  useEffect(() => {
    if (!currentUser) return;
    preloadWhatsAppIncomingCallRingtone();
  }, [currentUser]);

  // Keep toast dismiss storage pruned to currently ringing ids.
  useEffect(() => {
    pruneLiveCallToastDismissed(liveInbound.map((c) => c.id));
  }, [liveInbound]);

  // Pick toast / waiting surfaces from live list (no fullscreen modal stacking).
  useEffect(() => {
    const activeId = activeCallIdRef.current;
    const candidates = liveInbound.filter((c) => activeId == null || c.id !== activeId);

    setWaitingCall((prev) => {
      if (!sessionBusy) return null;
      if (prev && candidates.some((c) => c.id === prev.id)) {
        return candidates.find((c) => c.id === prev.id) ?? null;
      }
      return candidates[0] ?? null;
    });

    if (onCallsPage || sessionBusy || isStartingOutbound) {
      setToastCall(null);
      return;
    }

    const undismissed = candidates.filter((c) => !isLiveCallToastDismissed(c.id));
    setToastCall((prev) => {
      if (prev && undismissed.some((c) => c.id === prev.id)) {
        return undismissed.find((c) => c.id === prev.id) ?? undismissed[0] ?? null;
      }
      return undismissed[0] ?? null;
    });
  }, [liveInbound, onCallsPage, sessionBusy, isStartingOutbound, dismissTick]);

  const showToast = Boolean(toastCall) && !onCallsPage && !sessionBusy && !isStartingOutbound;
  const showCallWaiting = Boolean(waitingCall) && sessionBusy && !isStartingOutbound;
  const hasAnswerableRing =
    liveInbound.some((c) => activeCallIdRef.current == null || c.id !== activeCallIdRef.current) &&
    !sessionBusy &&
    !isStartingOutbound;

  useEffect(() => {
    if (showToast || showCallWaiting || (hasAnswerableRing && onCallsPage)) {
      startWhatsAppIncomingCallRingtone();
      return () => stopWhatsAppIncomingCallRingtone();
    }
    stopWhatsAppIncomingCallRingtone();
  }, [showToast, showCallWaiting, hasAnswerableRing, onCallsPage]);

  const rejectIncoming = useCallback(
    async (call: WhatsAppCallRecord) => {
      if (acceptingRef.current) return;
      acceptingRef.current = true;
      setAnsweringBusy(true);
      stopWhatsAppIncomingCallRingtone();
      setToastCall((prev) => (prev?.id === call.id ? null : prev));
      setWaitingCall((prev) => (prev?.id === call.id ? null : prev));
      try {
        await session.rejectInbound(call);
      } catch (e: any) {
        showAlert(resolveLocalizedApiError(e, t, t('whatsappCallFailed')), 'error');
      }
      acceptingRef.current = false;
      setAnsweringBusy(false);
      invalidateLists();
    },
    [invalidateLists, session, showAlert, t]
  );
  const rejectIncomingRef = useRef(rejectIncoming);
  rejectIncomingRef.current = rejectIncoming;

  const acceptIncoming = useCallback(
    async (call: WhatsAppCallRecord) => {
      if (acceptingRef.current) return;
      if (sessionBusy && session.activeCall && session.activeCall.id !== call.id) {
        acceptingRef.current = true;
        setWaitingActionBusy(true);
        setAnsweringBusy(true);
        stopWhatsAppIncomingCallRingtone();
        setToastCall(null);
        setWaitingCall(null);
        try {
          await session.endCall();
          await session.acceptInbound(call);
        } catch (e: any) {
          showAlert(
            resolveLocalizedApiError(e, t, t('whatsappCallAcceptFailed')),
            'error'
          );
        }
        acceptingRef.current = false;
        setWaitingActionBusy(false);
        setAnsweringBusy(false);
        invalidateLists();
        return;
      }
      if (acceptingRef.current) return;
      acceptingRef.current = true;
      setAnsweringBusy(true);
      stopWhatsAppIncomingCallRingtone();
      setToastCall((prev) => (prev?.id === call.id ? null : prev));
      setWaitingCall((prev) => (prev?.id === call.id ? null : prev));
      try {
        await session.acceptInbound(call);
      } catch (e: any) {
        showAlert(
          resolveLocalizedApiError(e, t, t('whatsappCallAcceptFailed')),
          'error'
        );
      }
      acceptingRef.current = false;
      setAnsweringBusy(false);
      invalidateLists();
    },
    [invalidateLists, session, sessionBusy, showAlert, t]
  );

  // Auto-reject toast / waiting rings after timeout (same window as before).
  useEffect(() => {
    const call = showToast ? toastCall : showCallWaiting ? waitingCall : null;
    if (!call) return;
    const id = window.setTimeout(() => {
      void rejectIncomingRef.current(call);
    }, INCOMING_CALL_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [showToast, showCallWaiting, toastCall?.id, waitingCall?.id]);

  const prevPhaseRef = useRef(session.phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = session.phase;
    if (isBusyPhase(prev) && session.phase === 'idle') {
      invalidateLists();
    }
  }, [session.phase, invalidateLists]);

  const endAndAnswerWaiting = useCallback(
    async (waiting: WhatsAppCallRecord) => {
      if (acceptingRef.current || waitingActionBusy) return;
      await acceptIncoming(waiting);
    },
    [acceptIncoming, waitingActionBusy]
  );

  const startOutboundCall = useCallback(
    async (args: StartOutboundArgs) => {
      const to = args.to.replace(/\s+/g, '');
      if (!to) {
        showAlert(t('sms_error_invalid_to_number'), 'warning');
        return;
      }
      if (
        isStartingOutbound ||
        session.phase === 'connecting' ||
        session.phase === 'ringing' ||
        session.phase === 'active'
      ) {
        return;
      }

      setIsStartingOutbound(true);
      try {
        const perms = await getWhatsAppCallPermissionsAPI(to);
        if (!perms.can_start_call) {
          try {
            await sendWhatsAppCallPermissionRequestAPI({
              to,
              template_id: args.templateId,
              template_name: args.templateName,
            });
            showAlert(t('whatsappCallPermissionSent'), 'info');
          } catch (sendErr: any) {
            const sendCode = sendErr?.code || sendErr?.data?.error?.code;
            if (sendCode === 'whatsapp_call_permission_template_missing') {
              showAlert(t('whatsappCallPermissionTemplateMissing'), 'warning');
            } else {
              showAlert(
                resolveLocalizedApiError(
                  sendErr,
                  t,
                  t('whatsappCallPermissionRequired')
                ),
                'warning'
              );
            }
          }
          return;
        }
        await session.startOutbound({
          to,
          clientId: args.clientId,
        });
        invalidateLists();
      } catch (e: any) {
        const code = e?.code || e?.data?.error?.code;
        if (code === 'whatsapp_call_permission_required') {
          try {
            await sendWhatsAppCallPermissionRequestAPI({
              to,
              template_id: args.templateId,
              template_name: args.templateName,
            });
            showAlert(t('whatsappCallPermissionSent'), 'info');
          } catch (sendErr: any) {
            const sendCode = sendErr?.code || sendErr?.data?.error?.code;
            if (sendCode === 'whatsapp_call_permission_template_missing') {
              showAlert(t('whatsappCallPermissionTemplateMissing'), 'warning');
            } else {
              showAlert(
                resolveLocalizedApiError(
                  sendErr,
                  t,
                  t('whatsappCallPermissionRequired')
                ),
                'warning'
              );
            }
          }
          return;
        }
        session.dismissError();
        showAlert(resolveLocalizedApiError(e, t, t('whatsappCallStartFailed')), 'error');
      } finally {
        setIsStartingOutbound(false);
      }
    },
    [invalidateLists, isStartingOutbound, session, showAlert, t]
  );

  const handleDismissToast = useCallback(() => {
    if (!toastCall) return;
    dismissLiveCallToast(toastCall.id);
    setToastCall(null);
    setDismissTick((n) => n + 1);
    stopWhatsAppIncomingCallRingtone();
  }, [toastCall]);

  const value = useMemo(
    () => ({
      startOutboundCall,
      acceptIncoming,
      rejectIncoming,
      phase: session.phase,
      activeCall: session.activeCall,
      elapsedSec: session.elapsedSec,
      isStartingOutbound,
      answeringBusy: answeringBusy || waitingActionBusy || acceptingRef.current,
    }),
    [
      startOutboundCall,
      acceptIncoming,
      rejectIncoming,
      session.phase,
      session.activeCall,
      session.elapsedSec,
      isStartingOutbound,
      answeringBusy,
      waitingActionBusy,
    ]
  );

  const showStartingOverlay =
    isStartingOutbound || session.phase === 'connecting';

  return (
    <WhatsAppCallingContext.Provider value={value}>
      {children}
      {showStartingOverlay && !session.activeCall ? (
        <div
          className="fixed inset-0 z-[68] flex items-end justify-center bg-black/25 p-4 sm:items-center dark:bg-black/40"
          role="status"
          aria-live="polite"
        >
          <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <Loader size="sm" variant="primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                {t('whatsappCallStarting')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('whatsappCallConnecting')}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {showToast && toastCall ? (
        <WhatsAppLiveCallToast
          call={toastCall}
          busy={answeringBusy || acceptingRef.current}
          t={t}
          onDismiss={handleDismissToast}
          onOpenCalls={() => {
            dismissLiveCallToast(toastCall.id);
            setToastCall(null);
            setDismissTick((n) => n + 1);
            stopWhatsAppIncomingCallRingtone();
            goToPage('Calls');
          }}
          onAnswer={() => {
            void acceptIncoming(toastCall);
          }}
        />
      ) : null}
      {showCallWaiting && waitingCall ? (
        <WhatsAppCallWaitingBanner
          call={waitingCall}
          busy={waitingActionBusy || acceptingRef.current}
          t={t}
          onReject={() => {
            void rejectIncoming(waitingCall);
          }}
          onEndAndAnswer={() => {
            void endAndAnswerWaiting(waitingCall);
          }}
        />
      ) : null}
      {session.activeCall &&
      (session.phase === 'active' ||
        session.phase === 'ringing' ||
        session.phase === 'connecting' ||
        session.phase === 'ending') ? (
        <WhatsAppActiveCallPanel
          call={session.activeCall}
          phase={session.phase}
          elapsedSec={session.elapsedSec}
          muted={session.muted}
          notes={session.notes}
          t={t}
          onNotesChange={session.setNotes}
          onToggleMute={session.toggleMute}
          onEnd={async () => {
            await session.endCall();
            invalidateLists();
          }}
        />
      ) : null}
    </WhatsAppCallingContext.Provider>
  );
};
