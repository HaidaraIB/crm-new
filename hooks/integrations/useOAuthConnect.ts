import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { useCreateConnectedAccount } from '../useQueries';
import {
  completeWhatsAppEmbeddedSignupAPI,
  connectIntegrationAccountAPI,
  resolveLocalizedApiError,
} from '../../services/api';
import { obtainWhatsAppEmbeddedSignupCode } from '../../utils/whatsappEmbeddedSignup';

const POPUP_FEATURES = () => {
  const width = 600;
  const height = 700;
  const left = Math.round((window.screen.width - width) / 2);
  const top = Math.round((window.screen.height - height) / 2);
  return `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`;
};

/**
 * Shared OAuth connect: embedded signup when Meta offers it, otherwise a popup
 * that posts `oauth_connected` / `oauth_failed` back to this window.
 */
export function useOAuthConnect(onConnected?: (accountId: number) => void) {
  const { t, showToast } = useAppContext();
  const queryClient = useQueryClient();
  const createAccount = useCreateConnectedAccount();
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const lock = useRef<number | null>(null);
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
    queryClient.invalidateQueries({ queryKey: ['socialInboxConnections'] });
    queryClient.invalidateQueries({ queryKey: ['whatsappInboxNumbers'] });
  }, [queryClient]);

  const release = (accountId: number) => {
    if (lock.current !== accountId) return;
    lock.current = null;
    setConnectingId(null);
  };

  const connect = useCallback(
    async (accountId: number) => {
      if (lock.current != null) return;
      lock.current = accountId;
      setConnectingId(accountId);
      let keepLocked = false;
      try {
        const response = await connectIntegrationAccountAPI(accountId);
        const embedded = response.embedded_signup;
        if (embedded?.enabled && embedded.config_id) {
          const signup = await obtainWhatsAppEmbeddedSignupCode({
            app_id: embedded.app_id,
            config_id: embedded.config_id,
            graph_api_version: embedded.graph_api_version,
          });
          if (!signup.code) {
            showToast(t('connectionCancelled'), { variant: 'info' });
            return;
          }
          await completeWhatsAppEmbeddedSignupAPI(accountId, signup.code, {
            waba_id: signup.waba_id,
            phone_number_id: signup.phone_number_id,
            business_id: signup.business_id,
            signup_event: signup.signup_event,
          });
          if (!signup.waba_id || !signup.phone_number_id) {
            showToast(t('whatsappEmbeddedSignupMissingIds'), { variant: 'warning' });
          }
          invalidate();
          onConnectedRef.current?.(accountId);
          showToast(t('connectionSuccessful'), { variant: 'success' });
          return;
        }
        if (!response.authorization_url) return;
        const popup = window.open(response.authorization_url, 'oauth_popup', POPUP_FEATURES());
        if (!popup) {
          showToast(t('popupBlocked'), { variant: 'warning' });
          return;
        }
        keepLocked = true;
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type === 'oauth_connected' && event.data?.accountId != null) {
            window.removeEventListener('message', handleMessage);
            release(accountId);
            invalidate();
            onConnectedRef.current?.(Number(event.data.accountId));
            showToast(t('connectionSuccessful'), { variant: 'success' });
          }
          if (event.data?.type === 'oauth_failed') {
            window.removeEventListener('message', handleMessage);
            release(accountId);
            invalidate();
            let oauthError = event.data?.error;
            if (typeof oauthError === 'string') {
              try {
                oauthError = decodeURIComponent(oauthError);
              } catch {
                /* keep raw */
              }
            }
            showToast(resolveLocalizedApiError({ message: oauthError }, t, t('connectionFailed')), {
              variant: 'error',
            });
          }
        };
        window.addEventListener('message', handleMessage);
        const poll = window.setInterval(() => {
          if (popup.closed) {
            window.clearInterval(poll);
            window.removeEventListener('message', handleMessage);
            release(accountId);
            invalidate();
          }
        }, 500);
      } catch (error: unknown) {
        showToast(resolveLocalizedApiError(error as { message?: string }, t, t('errorConnectingAccount')), {
          variant: 'error',
        });
      } finally {
        if (!keepLocked) release(accountId);
      }
    },
    [invalidate, showToast, t],
  );

  const ensureAccountAndConnect = useCallback(
    async (platform: string, name: string, existingId: number | null) => {
      if (lock.current != null || isStarting) return;
      let accountId = existingId;
      if (accountId == null) {
        setIsStarting(true);
        try {
          const created = await createAccount.mutateAsync({ platform, name });
          accountId = created?.id ?? null;
        } catch (error: unknown) {
          showToast(resolveLocalizedApiError(error as { message?: string }, t, t('errorSavingAccount')), {
            variant: 'error',
          });
          return;
        } finally {
          setIsStarting(false);
        }
      }
      if (accountId != null) await connect(accountId);
    },
    [connect, createAccount, isStarting, showToast, t],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') !== 'true' || window.opener) return;
    const id = parseInt(params.get('account_id') || '', 10);
    params.delete('connected');
    params.delete('account_id');
    const qs = params.toString();
    window.history.replaceState({}, document.title, `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
    invalidate();
    if (id) onConnectedRef.current?.(id);
  }, [invalidate]);

  return { connect, ensureAccountAndConnect, connectingId, isStarting, invalidate };
}
