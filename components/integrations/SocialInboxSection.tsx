import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { SectionLoadingState } from '../SectionLoadingState';
import { InstagramIcon, MessengerIcon } from '../index';
import { useAppContext } from '../../context/AppContext';
import { normalizeRole } from '../../utils/roles';
import {
  checkSocialConnectionAPI,
  connectSocialPageAPI,
  disconnectSocialPageAPI,
  getSocialConnectionsAPI,
  resolveLocalizedApiError,
  type MetaInboxConnectionPayload,
} from '../../services/api';
import { useOAuthConnect } from '../../hooks/integrations/useOAuthConnect';
import { useConfirmDisconnect } from '../../hooks/integrations/useConfirmDisconnect';
import {
  ConnectionCard,
  ConnectionSubItem,
  EmptyConnectionState,
  StatusBadge,
  normalizeConnectionStatus,
} from './kit';

/**
 * Instagram & Messenger setup. Conversations live on the Inbox page.
 * Owner-only: the backend answers 403 meta_inbox_admin_only otherwise.
 */
export const SocialInboxSection: React.FC<{
  integrationDisabled?: boolean;
  integrationDisabledMessage?: string;
}> = ({ integrationDisabled = false, integrationDisabledMessage }) => {
  const { t, showToast, goToPage, setConfirmDeleteConfig, setIsConfirmDeleteModalOpen, currentUser, setEditingAccount, setIsManageIntegrationAccountModalOpen } = useAppContext();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const oauth = useOAuthConnect();
  const confirmDisconnect = useConfirmDisconnect(() => {
    queryClient.invalidateQueries({ queryKey: ['socialInboxConnections'] });
  });

  const isOwner = normalizeRole(currentUser?.role) === 'Owner';
  const { data, isLoading, isError } = useQuery({
    queryKey: ['socialInboxConnections'],
    queryFn: getSocialConnectionsAPI,
    retry: false,
    enabled: isOwner,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['socialInboxConnections'] });
  const fail = (err: unknown, fallback: string) => {
    const message = resolveLocalizedApiError(err as { message?: string }, t, fallback);
    setError(message);
    showToast(message, { variant: 'error' });
  };

  const connectPage = useMutation({
    mutationFn: connectSocialPageAPI,
    onSuccess: () => {
      setError(null);
      showToast(t('messagingEnabled'), { variant: 'success' });
      invalidate();
    },
    onError: (err: unknown) => fail(err, t('errorConnectingAccount')),
    onSettled: () => setBusyKey(null),
  });
  const disconnectPage = useMutation({
    mutationFn: disconnectSocialPageAPI,
    onSuccess: () => {
      setError(null);
      showToast(t('pageRemoved'), { variant: 'success' });
      invalidate();
    },
    onError: (err: unknown) => fail(err, t('errorDeletingAccount')),
    onSettled: () => setBusyKey(null),
  });
  const checkHealth = useMutation({
    mutationFn: checkSocialConnectionAPI,
    onSuccess: (result) => {
      setError(null);
      invalidate();
      if (result?.health?.ok) {
        showToast(t('socialInboxHealthOk'), { variant: 'success' });
        return;
      }
      const key = result?.health?.error_key;
      const message = (key ? t(key as 'connected') : '') || t('socialInboxHealthFailed');
      setError(message === key ? t('socialInboxHealthFailed') : message);
      if (!result?.health?.ok) showToast(message || t('socialInboxHealthFailed'), { variant: 'error' });
    },
    onError: (err: unknown) => fail(err, t('socialInboxHealthFailed')),
    onSettled: () => setBusyKey(null),
  });

  if (isLoading) return <SectionLoadingState className="py-16" label={t('loadingIntegrations')} />;
  if (isError || !data) {
    return <Alert variant="error">{integrationDisabledMessage || t('socialInboxLoadFailed')}</Alert>;
  }

  const account = data.account;
  const connections = data.connections ?? [];
  const availablePages = data.available_pages ?? [];
  const status = normalizeConnectionStatus(account?.status);
  const receivingCount = connections.filter((c) => c.messenger_subscribed).length;
  const busy = busyKey != null || oauth.connectingId != null || oauth.isStarting;

  const startConnect = () => {
    if (integrationDisabled) return;
    void oauth.ensureAccountAndConnect('meta_inbox', t('connectInstagramMessenger'), account?.id ?? null);
  };

  const requestRemovePage = (connection: MetaInboxConnectionPayload) => {
    setConfirmDeleteConfig({
      title: t('removePage'),
      message: t('confirmRemovePage'),
      itemName: connection.page_name || connection.page_id,
      confirmButtonText: t('removePage'),
      showWarning: false,
      showSuccessMessage: false,
      onConfirm: async () => {
        setBusyKey(`remove:${connection.id}`);
        await disconnectPage.mutateAsync(connection.id);
      },
    });
    setIsConfirmDeleteModalOpen(true);
  };

  return (
    <>
      <Alert variant="info" className="mb-4">{t('socialInboxSetupHint')}</Alert>
      {error ? (
        <Alert variant="error" className="mb-4" onDismiss={() => setError(null)}>{error}</Alert>
      ) : null}
      {!account ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <EmptyConnectionState
            platform="meta_inbox"
            title={t('noAccountsConnected')}
            prompt={t('connectInstagramMessengerPrompt')}
            actionLabel={t('connect')}
            onAction={startConnect}
            actionLoading={oauth.isStarting}
            actionDisabled={integrationDisabled}
          />
        </div>
      ) : (
        <ConnectionCard
          platform="meta_inbox"
          name={account.name || t('connectInstagramMessenger')}
          status={status}
          primary={
            status === 'connected'
              ? undefined
              : {
                  label: status === 'expired' ? t('reconnect') : t('connect'),
                  onClick: startConnect,
                  loading: oauth.isStarting || oauth.connectingId === account.id,
                  disabled: integrationDisabled || busy,
                }
          }
          menu={[
            {
              key: 'edit',
              label: t('edit'),
              onClick: () => {
                setEditingAccount({ id: account.id, name: account.name, status: account.status });
                setIsManageIntegrationAccountModalOpen(true);
              },
            },
            ...(status === 'connected'
              ? [{
                  key: 'disconnect',
                  label: t('disconnect'),
                  danger: true,
                  onClick: () => confirmDisconnect({ id: account.id, name: account.name || t('connectInstagramMessenger') }),
                }]
              : []),
          ]}
          footer={status !== 'connected' ? <p className="text-sm text-gray-500 dark:text-gray-400">{t('socialInboxReconnectHint')}</p> : undefined}
        >
          {status === 'connected' ? (
            <ul className="-mx-5 sm:-mx-6 border-t border-gray-200/80 dark:border-gray-700/80">
              <li className="px-5 sm:px-6 py-3 bg-gray-50/80 dark:bg-gray-900/30 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('socialInboxPagesHeading')}
                </p>
                {receivingCount > 0 ? (
                  <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => goToPage('Inbox')}>
                    {t('socialInboxOpenInbox')}
                  </Button>
                ) : null}
              </li>
              {connections.length === 0 && availablePages.length === 0 ? (
                <li className="px-5 sm:px-6 py-6 text-sm text-gray-500">{t('socialNoPagesGranted')}</li>
              ) : null}
              {connections.length === 0 && availablePages.length > 0 ? (
                <li className="px-5 sm:px-6 py-4 text-sm text-gray-500">{t('socialInboxNoPagesYet')}</li>
              ) : null}
              {connections.map((connection) => {
                const subscribed = connection.messenger_subscribed;
                const unhealthy = connection.status === 'error' || !subscribed;
                return (
                  <ConnectionSubItem
                    key={connection.id}
                    platform="meta"
                    title={connection.page_name || connection.page_id}
                    meta={
                      <>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${subscribed ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'}`}>
                          <MessengerIcon className="h-3 w-3" />
                          {subscribed ? t('messengerReceiving') : t('messengerNotReceiving')}
                        </span>
                        {connection.ig_user_id ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700 dark:bg-green-500/20 dark:text-green-300">
                            <InstagramIcon className="h-3 w-3" />
                            {t('instagramReceiving').replace('{username}', connection.ig_username || connection.ig_user_id)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 dark:bg-gray-700/80 dark:text-gray-300" title={t('instagramNotLinkedHint')}>
                            <InstagramIcon className="h-3 w-3" />
                            {t('instagramNotLinked')}
                          </span>
                        )}
                      </>
                    }
                    primary={unhealthy ? {
                      label: t('enableMessaging'),
                      loading: connectPage.isPending && busyKey === `enable:${connection.page_id}`,
                      disabled: busy,
                      onClick: () => {
                        setError(null);
                        setBusyKey(`enable:${connection.page_id}`);
                        connectPage.mutate(connection.page_id);
                      },
                    } : undefined}
                    secondary={!unhealthy ? {
                      label: t('checkConnectionHealth'),
                      loading: checkHealth.isPending && busyKey === `check:${connection.id}`,
                      disabled: busy,
                      onClick: () => {
                        setError(null);
                        setBusyKey(`check:${connection.id}`);
                        checkHealth.mutate(connection.id);
                      },
                    } : undefined}
                    danger={{
                      label: t('removePage'),
                      loading: disconnectPage.isPending && busyKey === `remove:${connection.id}`,
                      disabled: busy,
                      onClick: () => requestRemovePage(connection),
                    }}
                    note={unhealthy && connection.error_message ? connection.error_message : undefined}
                  />
                );
              })}
              {availablePages.map((page) => (
                <ConnectionSubItem
                  key={page.id}
                  platform="meta"
                  muted
                  title={page.name || page.id}
                  meta={<StatusBadge status="disconnected" label={t('selectPagesToConnect')} />}
                  primary={{
                    label: t('enableMessaging'),
                    loading: connectPage.isPending && busyKey === `enable:${page.id}`,
                    disabled: busy,
                    onClick: () => {
                      setError(null);
                      setBusyKey(`enable:${page.id}`);
                      connectPage.mutate(page.id);
                    },
                  }}
                />
              ))}
            </ul>
          ) : null}
        </ConnectionCard>
      )}
    </>
  );
};

export default SocialInboxSection;
