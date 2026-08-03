import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { useWhatsAppCallSession } from '../../hooks/useWhatsAppCallSession';
import {
  getWhatsAppCallsPendingAPI,
  getWhatsAppCallPermissionsAPI,
  resolveLocalizedApiError,
  sendWhatsAppCallPermissionRequestAPI,
  type WhatsAppCallRecord,
} from '../../services/api';
import { Loader } from '../Loader';
import { WhatsAppIncomingCallModal } from './WhatsAppIncomingCallModal';
import { WhatsAppActiveCallPanel } from './WhatsAppActiveCallPanel';
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
  phase: string;
  activeCall: WhatsAppCallRecord | null;
  isStartingOutbound: boolean;
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

export const WhatsAppCallListener: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { t, currentUser, currentPage, showAlert } = useAppContext();
  const queryClient = useQueryClient();
  const session = useWhatsAppCallSession();
  const [incoming, setIncoming] = useState<WhatsAppCallRecord | null>(null);
  const [isStartingOutbound, setIsStartingOutbound] = useState(false);
  const seenRef = useRef<Set<number>>(new Set());
  const acceptingRef = useRef(false);

  const invalidateLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['whatsappCalls'] });
    void queryClient.invalidateQueries({ queryKey: ['clientCalls'] });
  }, [queryClient]);

  useEffect(() => {
    if (!currentUser) return;
    preloadWhatsAppIncomingCallRingtone();
  }, [currentUser]);

  const showIncomingModal =
    Boolean(incoming) && session.phase === 'idle' && !isStartingOutbound;

  useEffect(() => {
    if (showIncomingModal) {
      startWhatsAppIncomingCallRingtone();
      return () => stopWhatsAppIncomingCallRingtone();
    }
    stopWhatsAppIncomingCallRingtone();
  }, [showIncomingModal]);

  const rejectIncomingCall = useCallback(
    async (call: WhatsAppCallRecord) => {
      if (acceptingRef.current) return;
      acceptingRef.current = true;
      stopWhatsAppIncomingCallRingtone();
      setIncoming(null);
      try {
        await session.rejectInbound(call);
      } catch (e: any) {
        showAlert(resolveLocalizedApiError(e, t, t('whatsappCallFailed')), 'error');
      }
      acceptingRef.current = false;
      invalidateLists();
    },
    [invalidateLists, session, showAlert, t]
  );
  const rejectIncomingCallRef = useRef(rejectIncomingCall);
  rejectIncomingCallRef.current = rejectIncomingCall;

  useEffect(() => {
    if (!showIncomingModal || !incoming) return;
    const call = incoming;
    const id = window.setTimeout(() => {
      void rejectIncomingCallRef.current(call);
    }, INCOMING_CALL_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [showIncomingModal, incoming?.id]);

  // Only poll for inbound rings on call-related surfaces, and only while the tab is visible.
  const shouldPollPending =
    Boolean(currentUser) &&
    (currentPage === 'Calls' || currentPage === 'Chats') &&
    (session.phase === 'idle' || session.phase === 'error');

  useEffect(() => {
    if (!shouldPollPending) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      try {
        const res = await getWhatsAppCallsPendingAPI();
        if (cancelled) return;
        const inbound = (res.results || []).filter(
          (c) => c.direction === 'inbound' && c.status === 'ringing'
        );
        for (const call of inbound) {
          if (seenRef.current.has(call.id)) continue;
          seenRef.current.add(call.id);
          setIncoming(call);
          break;
        }
      } catch {
        /* ignore poll errors */
      }
    };

    void tick();
    const id = window.setInterval(tick, 8000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [shouldPollPending]);

  const startOutboundCall = useCallback(
    async (args: StartOutboundArgs) => {
      const to = args.to.replace(/\s+/g, '');
      if (!to) {
        showAlert(t('sms_error_invalid_to_number'), 'warning');
        return;
      }
      if (isStartingOutbound || session.phase === 'connecting' || session.phase === 'ringing' || session.phase === 'active') {
        return;
      }

      setIsStartingOutbound(true);
      try {
        const perms = await getWhatsAppCallPermissionsAPI(to);
        if (!perms.can_start_call) {
          if (args.templateId || args.templateName) {
            await sendWhatsAppCallPermissionRequestAPI({
              to,
              template_id: args.templateId,
              template_name: args.templateName,
            });
            showAlert(t('whatsappCallPermissionSent'), 'info');
            return;
          }
          showAlert(t('whatsappCallPermissionRequired'), 'warning');
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
          if (args.templateId || args.templateName) {
            try {
              await sendWhatsAppCallPermissionRequestAPI({
                to,
                template_id: args.templateId,
                template_name: args.templateName,
              });
              showAlert(t('whatsappCallPermissionSent'), 'info');
            } catch (sendErr: any) {
              showAlert(
                resolveLocalizedApiError(sendErr, t, t('whatsappCallFailed')),
                'error'
              );
            }
            return;
          }
          showAlert(t('whatsappCallPermissionRequired'), 'warning');
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

  const value = useMemo(
    () => ({
      startOutboundCall,
      phase: session.phase,
      activeCall: session.activeCall,
      isStartingOutbound,
    }),
    [startOutboundCall, session.phase, session.activeCall, isStartingOutbound]
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
      {showIncomingModal && incoming ? (
        <WhatsAppIncomingCallModal
          call={incoming}
          busy={acceptingRef.current}
          t={t}
          onReject={() => {
            void rejectIncomingCall(incoming);
          }}
          onAccept={async () => {
            if (acceptingRef.current) return;
            acceptingRef.current = true;
            stopWhatsAppIncomingCallRingtone();
            const call = incoming;
            setIncoming(null);
            try {
              await session.acceptInbound(call);
            } catch (e: any) {
              showAlert(
                resolveLocalizedApiError(e, t, t('whatsappCallAcceptFailed')),
                'error'
              );
            }
            acceptingRef.current = false;
            invalidateLists();
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
