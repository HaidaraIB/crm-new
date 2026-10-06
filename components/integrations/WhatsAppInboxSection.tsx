import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../Card';
import { SectionLoadingState } from '../SectionLoadingState';
import { PhoneText } from '../PhoneText';
import { useAppContext } from '../../context/AppContext';
import {
  deleteWhatsappInboxNumberAPI,
  getWhatsappInboxNumbersAPI,
  resolveLocalizedApiError,
} from '../../services/api';
import { useOAuthConnect } from '../../hooks/integrations/useOAuthConnect';
import { useConfirmDisconnect } from '../../hooks/integrations/useConfirmDisconnect';
import { ConnectionCard, ConnectionSubItem, EmptyConnectionState, normalizeConnectionStatus } from './kit';

export const WhatsAppInboxSection: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const { t, showToast, setConfirmDeleteConfig, setIsConfirmDeleteModalOpen, setEditingAccount, setIsManageIntegrationAccountModalOpen } = useAppContext();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const oauth = useOAuthConnect();
  const confirmDisconnect = useConfirmDisconnect();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['whatsappInboxNumbers'],
    queryFn: getWhatsappInboxNumbersAPI,
    retry: false,
  });

  if (isLoading) return <SectionLoadingState className="py-16" label={t('loadingIntegrations')} />;
  if (isError) {
    return <Card className="p-6 text-sm text-gray-600 dark:text-gray-400">{t('errorLoadingData')}</Card>;
  }

  const account = data?.account ?? null;
  const numbers = data?.numbers ?? [];

  const startConnect = () => {
    if (disabled) return;
    void oauth.ensureAccountAndConnect('whatsapp_inbox', t('whatsappInboxTab'), account?.id ?? null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">{t('whatsappInboxIntegrationHint')}</p>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {!account ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <EmptyConnectionState
            platform="whatsapp"
            title={t('noAccountsConnected')}
            prompt={t('whatsappInboxConnectPrompt')}
            actionLabel={t('connect')}
            onAction={startConnect}
            actionLoading={oauth.isStarting}
            actionDisabled={disabled}
          />
        </div>
      ) : (
        <ConnectionCard
          platform="whatsapp"
          name={account.name}
          status={normalizeConnectionStatus(account.status)}
          primary={
            account.status === 'connected'
              ? undefined
              : {
                  label: t('connect'),
                  onClick: startConnect,
                  loading: oauth.isStarting || oauth.connectingId === account.id,
                  disabled: disabled || oauth.connectingId != null,
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
            {
              key: 'disconnect',
              label: t('disconnect'),
              danger: true,
              onClick: () => confirmDisconnect(account),
            },
          ]}
        >
          {numbers.length > 0 ? (
            <ul className="-mx-5 sm:-mx-6 border-t border-gray-200/80 dark:border-gray-700/80">
              {numbers.map((number) => (
                <ConnectionSubItem
                  key={number.id}
                  title={
                    <PhoneText className="font-medium text-gray-900 dark:text-white">
                      {number.display_phone_number || number.phone_number_id}
                    </PhoneText>
                  }
                  meta={<span className="text-gray-500">{t('inboxPhoneNumber')}</span>}
                  danger={
                    number.status === 'connected'
                      ? {
                          label: t('disconnect'),
                          loading: busyId === number.id,
                          onClick: () => {
                            setConfirmDeleteConfig({
                              title: t('disconnect'),
                              message: t('whatsappInboxDisconnectNumberConfirm'),
                              onConfirm: async () => {
                                setBusyId(number.id);
                                try {
                                  await deleteWhatsappInboxNumberAPI(number.id);
                                  queryClient.invalidateQueries({ queryKey: ['whatsappInboxNumbers'] });
                                  queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
                                  showToast(t('disconnected'), { variant: 'success' });
                                } catch (err: unknown) {
                                  const message = resolveLocalizedApiError(err as { message?: string }, t, t('errorSavingAccount'));
                                  setError(message);
                                  showToast(message, { variant: 'error' });
                                } finally {
                                  setBusyId(null);
                                }
                              },
                            });
                            setIsConfirmDeleteModalOpen(true);
                          },
                        }
                      : undefined
                  }
                />
              ))}
            </ul>
          ) : null}
        </ConnectionCard>
      )}
    </div>
  );
};

export default WhatsAppInboxSection;
