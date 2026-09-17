import { Alert } from '../Alert';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../Card';
import { Button } from '../Button';
import { IntegrationPlatformIcon } from './IntegrationPlatformIcon';
import { InstagramIcon, MessengerIcon, SettingsIcon, TrashIcon } from '../index';
import { SectionLoadingState } from '../SectionLoadingState';
import { useAppContext } from '../../context/AppContext';
import {
  checkSocialConnectionAPI,
  connectSocialPageAPI,
  disconnectSocialPageAPI,
  getSocialConnectionsAPI,
  resolveLocalizedApiError,
  type MetaInboxConnectionPayload,
} from '../../services/api';

/**
 * Instagram & Messenger account configuration.
 *
 * Connect / disconnect only — conversations live on the Inbox page, following the
 * same split as WhatsApp (Integrations configures the account, Chats does the
 * messaging). Owner-only: the backend answers 403 meta_inbox_admin_only otherwise.
 *
 * The account row reuses Lead Ads furniture (icon + status pill + Connect/Edit).
 * Pages are a nested list under that row so they are not mistaken for a second
 * account. Check/Remove must report a result: a silent 200 looks like a dead button.
 */
interface SocialInboxSectionProps {
  /** Creates the `meta_inbox` account if needed, then opens the OAuth popup. */
  onConnect: () => void;
  onEdit: (account: { id: number; name: string; status: string; platform: string }) => void;
  onDisconnect: (accountId: number) => void;
  /** Page-level connect lock, so both tabs disable together during a popup. */
  connectingAccountId: number | null;
  isStartingConnect: boolean;
  integrationDisabled?: boolean;
  integrationDisabledMessage?: string;
}

const StatusPill: React.FC<{ tone: 'connected' | 'error' | 'idle'; children: React.ReactNode }> = ({
  tone,
  children,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
      tone === 'connected'
        ? 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-500/20'
        : tone === 'error'
          ? 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-500/20'
          : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/80'
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
        tone === 'connected' ? 'bg-green-500' : tone === 'error' ? 'bg-amber-500' : 'bg-gray-400'
      }`}
    />
    {children}
  </span>
);

export const SocialInboxSection: React.FC<SocialInboxSectionProps> = ({
  onConnect,
  onEdit,
  onDisconnect,
  connectingAccountId,
  isStartingConnect,
  integrationDisabled = false,
  integrationDisabledMessage,
}) => {
  const {
    t,
    showToast,
    goToPage,
    setConfirmDeleteConfig,
    setIsConfirmDeleteModalOpen,
  } = useAppContext();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['socialInboxConnections'],
    queryFn: getSocialConnectionsAPI,
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['socialInboxConnections'] });

  const fail = (err: any, fallback: string) => {
    const message = resolveLocalizedApiError(err, t, fallback);
    setError(message);
    showToast(message, { variant: 'error' });
  };

  const connect = useMutation({
    mutationFn: connectSocialPageAPI,
    onSuccess: () => {
      setError(null);
      showToast(t('messagingEnabled'), { variant: 'success' });
      invalidate();
    },
    onError: (err: any) => fail(err, t('errorConnectingAccount')),
    onSettled: () => setBusyKey(null),
  });
  const disconnect = useMutation({
    mutationFn: disconnectSocialPageAPI,
    onSuccess: () => {
      setError(null);
      showToast(t('pageRemoved'), { variant: 'success' });
      invalidate();
    },
    onError: (err: any) => fail(err, t('errorDeletingAccount')),
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
      const message =
        (key ? t(key as any) : '') || t('socialInboxHealthFailed');
      setError(message);
      showToast(message, { variant: 'error' });
    },
    onError: (err: any) => fail(err, t('socialInboxHealthFailed')),
    onSettled: () => setBusyKey(null),
  });

  if (isLoading) {
    return <SectionLoadingState className="py-16" label={t('loadingIntegrations')} />;
  }

  if (isError || !data) {
    const loadError = integrationDisabledMessage || t('socialInboxLoadFailed');
    return (
      <Alert variant="error">{loadError}</Alert>
    );
  }

  const account = data.account;
  const connections = data.connections ?? [];
  const availablePages = data.available_pages ?? [];
  const accountConnected = account?.status === 'connected';
  const accountExpired = account?.status === 'expired';
  const receivingCount = connections.filter((c) => c.messenger_subscribed).length;
  const busy = busyKey != null || connectingAccountId != null || isStartingConnect;

  const connectButton = (
    <Button
      variant="primary"
      onClick={() => {
        setError(null);
        onConnect();
      }}
      loading={isStartingConnect || (account != null && connectingAccountId === account.id)}
      disabled={integrationDisabled || connectingAccountId != null || isStartingConnect}
      className="rounded-lg shadow-sm"
    >
      {accountExpired ? t('reconnect') : t('connect')}
    </Button>
  );

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
        await disconnect.mutateAsync(connection.id);
      },
    });
    setIsConfirmDeleteModalOpen(true);
  };

  return (
    <>
      <Alert variant="info" className="mb-4">
        {t('socialInboxSetupHint')}
      </Alert>

      {error && (
        <Alert variant="error" className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="overflow-hidden p-0">
        {!account ? (
          <div className="text-center py-16 px-6">
            <IntegrationPlatformIcon
              platform="meta_inbox"
              size="xl"
              variant="muted"
              className="mx-auto mb-5"
            />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('noAccountsConnected')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
              {t('connectInstagramMessengerPrompt')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200/80 dark:divide-gray-700/80">
            <li className="p-5 sm:p-6 flex flex-col gap-4 bg-white dark:bg-gray-800/50 first:rounded-t-lg last:rounded-b-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-4 min-w-0">
                  <IntegrationPlatformIcon platform="meta_inbox" size="md" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {account.name || t('connectInstagramMessenger')}
                    </p>
                    <StatusPill
                      tone={accountConnected ? 'connected' : accountExpired ? 'error' : 'idle'}
                    >
                      {accountConnected
                        ? t('connected')
                        : accountExpired
                          ? t('statusExpired')
                          : t('disconnected')}
                    </StatusPill>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!accountConnected && connectButton}
                  <Button
                    variant="ghost"
                    onClick={() =>
                      onEdit({
                        id: account.id,
                        name: account.name,
                        status: account.status,
                        platform: 'meta_inbox',
                      })
                    }
                    className="rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <SettingsIcon className="w-4 h-4" />{' '}
                    <span className="sm:inline">{t('edit')}</span>
                  </Button>
                  {accountConnected && (
                    <Button
                      variant="danger"
                      onClick={() => onDisconnect(account.id)}
                      className="rounded-lg ml-auto sm:ml-0 border border-transparent hover:border-red-500/30"
                    >
                      <TrashIcon className="w-4 h-4" />{' '}
                      <span className="sm:inline">{t('disconnect')}</span>
                    </Button>
                  )}
                </div>
              </div>

              {!accountConnected && (
                <p className="text-sm text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200/80 dark:border-gray-700/80">
                  {t('socialInboxReconnectHint')}
                </p>
              )}
            </li>

            {accountConnected && (
              <>
                <li className="px-5 sm:px-6 pt-4 pb-2 bg-gray-50/80 dark:bg-gray-900/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('socialInboxPagesHeading')}
                    </p>
                    {receivingCount > 0 && (
                      <Button
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => goToPage('Inbox')}
                      >
                        {t('socialInboxOpenInbox')}
                      </Button>
                    )}
                  </div>
                </li>

                {connections.length === 0 && availablePages.length === 0 && (
                  <li className="px-5 sm:px-6 py-6 bg-white dark:bg-gray-800/50">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('socialNoPagesGranted')}
                    </p>
                  </li>
                )}

                {connections.length === 0 && availablePages.length > 0 && (
                  <li className="px-5 sm:px-6 py-4 bg-white dark:bg-gray-800/50">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('socialInboxNoPagesYet')}
                    </p>
                  </li>
                )}

                {connections.map((connection) => {
                  const subscribed = connection.messenger_subscribed;
                  const unhealthy = connection.status === 'error' || !subscribed;
                  return (
                    <li
                      key={connection.id}
                      className="p-5 sm:p-6 flex flex-col gap-4 bg-white dark:bg-gray-800/50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-4 min-w-0">
                          <IntegrationPlatformIcon platform="meta" size="md" />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {connection.page_name || connection.page_id}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                                  subscribed
                                    ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                                }`}
                              >
                                <MessengerIcon className="h-3 w-3" />
                                {subscribed ? t('messengerReceiving') : t('messengerNotReceiving')}
                              </span>
                              {connection.ig_user_id ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700 dark:bg-green-500/20 dark:text-green-300">
                                  <InstagramIcon className="h-3 w-3" />
                                  {t('instagramReceiving').replace(
                                    '{username}',
                                    connection.ig_username || connection.ig_user_id
                                  )}
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 dark:bg-gray-700/80 dark:text-gray-300"
                                  title={t('instagramNotLinkedHint')}
                                >
                                  <InstagramIcon className="h-3 w-3" />
                                  {t('instagramNotLinked')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {unhealthy ? (
                            <Button
                              variant="primary"
                              className="rounded-lg text-sm"
                              loading={connect.isPending && busyKey === `enable:${connection.page_id}`}
                              disabled={busy}
                              onClick={() => {
                                setError(null);
                                setBusyKey(`enable:${connection.page_id}`);
                                connect.mutate(connection.page_id);
                              }}
                            >
                              {t('enableMessaging')}
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              className="rounded-lg text-sm"
                              loading={checkHealth.isPending && busyKey === `check:${connection.id}`}
                              disabled={busy}
                              onClick={() => {
                                setError(null);
                                setBusyKey(`check:${connection.id}`);
                                checkHealth.mutate(connection.id);
                              }}
                            >
                              {t('checkConnectionHealth')}
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            className="rounded-lg ml-auto sm:ml-0 border border-transparent hover:border-red-500/30"
                            loading={disconnect.isPending && busyKey === `remove:${connection.id}`}
                            disabled={busy}
                            onClick={() => requestRemovePage(connection)}
                          >
                            <TrashIcon className="w-4 h-4" />{' '}
                            <span className="sm:inline">{t('removePage')}</span>
                          </Button>
                        </div>
                      </div>

                      {unhealthy && connection.error_message && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 pt-3 border-t border-gray-200/80 dark:border-gray-700/80">
                          {connection.error_message}
                        </p>
                      )}
                    </li>
                  );
                })}

                {availablePages.map((page) => (
                  <li
                    key={page.id}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <IntegrationPlatformIcon platform="meta" size="md" variant="muted" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {page.name || page.id}
                        </p>
                        <StatusPill tone="idle">{t('selectPagesToConnect')}</StatusPill>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      className="rounded-lg shadow-sm"
                      loading={connect.isPending && busyKey === `enable:${page.id}`}
                      disabled={busy}
                      onClick={() => {
                        setError(null);
                        setBusyKey(`enable:${page.id}`);
                        connect.mutate(page.id);
                      }}
                    >
                      {t('enableMessaging')}
                    </Button>
                  </li>
                ))}
              </>
            )}
          </ul>
        )}
      </Card>
    </>
  );
};

export default SocialInboxSection;
