import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../Card';
import { Button } from '../Button';
import { PhoneText } from '../PhoneText';
import { IntegrationPlatformIcon } from './IntegrationPlatformIcon';
import { SettingsIcon, TrashIcon } from '../index';
import { SectionLoadingState } from '../SectionLoadingState';
import { useAppContext } from '../../context/AppContext';
import {
  deleteWhatsappInboxNumberAPI,
  getWhatsappInboxNumbersAPI,
  resolveLocalizedApiError,
} from '../../services/api';

interface Props {
  onConnect: () => void;
  onEdit: (account: { id: number; name: string; status: string; platform: string }) => void;
  onDisconnect: (accountId: number) => void;
  connectingAccountId: number | null;
  isStartingConnect: boolean;
}

export const WhatsAppInboxSection: React.FC<Props> = ({
  onConnect,
  onEdit,
  onDisconnect,
  connectingAccountId,
  isStartingConnect,
}) => {
  const { t, showToast, setConfirmDeleteConfig, setIsConfirmDeleteModalOpen } = useAppContext();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['whatsappInboxNumbers'],
    queryFn: getWhatsappInboxNumbersAPI,
    retry: false,
  });

  const account = data?.account ?? null;
  const numbers = data?.numbers ?? [];
  const connectedNumber = numbers.find((n) => n.status === 'connected') ?? numbers[0];

  const statusLabel = (status: string) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'connected') return t('connected');
    if (normalized === 'error') return t('error');
    return t('disconnected');
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['whatsappInboxNumbers'] });
    queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
  };

  const handleDisconnectNumber = async (id: number) => {
    setBusyId(id);
    try {
      await deleteWhatsappInboxNumberAPI(id);
      invalidate();
      showToast(t('disconnected'), { variant: 'success' });
    } catch (err: any) {
      const message = resolveLocalizedApiError(err, t, t('errorSavingAccount'));
      setError(message);
      showToast(message, { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return <SectionLoadingState label={t('loadingIntegrations')} />;
  }

  if (isError) {
    return (
      <Card className="p-6 text-sm text-gray-600 dark:text-gray-400">{t('errorLoadingData')}</Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">{t('whatsappInboxIntegrationHint')}</p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Card className="overflow-hidden p-0">
        {account ? (
          <ul className="divide-y divide-gray-200/80 dark:divide-gray-700/80">
            <li className="p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <IntegrationPlatformIcon platform="whatsapp" size="md" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {statusLabel(account.status)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {account.status !== 'connected' && (
                    <Button
                      onClick={onConnect}
                      loading={isStartingConnect || connectingAccountId === account.id}
                      disabled={connectingAccountId != null}
                    >
                      {t('connect')}
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => onEdit({ ...account, platform: 'whatsapp_inbox' })}>
                    <SettingsIcon className="w-4 h-4" /> {t('edit')}
                  </Button>
                  <Button variant="danger" onClick={() => onDisconnect(account.id)}>
                    <TrashIcon className="w-4 h-4" /> {t('disconnect')}
                  </Button>
                </div>
              </div>
              {connectedNumber && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('inboxPhoneNumber')}</p>
                    <PhoneText className="font-medium text-gray-900 dark:text-white">
                      {connectedNumber.display_phone_number || connectedNumber.phone_number_id}
                    </PhoneText>
                  </div>
                  {connectedNumber.status === 'connected' && (
                    <Button
                      variant="ghost"
                      disabled={busyId === connectedNumber.id}
                      onClick={() => {
                        setConfirmDeleteConfig({
                          title: t('disconnect'),
                          message: t('whatsappInboxDisconnectNumberConfirm'),
                          onConfirm: () => handleDisconnectNumber(connectedNumber.id),
                        });
                        setIsConfirmDeleteModalOpen(true);
                      }}
                    >
                      {t('removePage')}
                    </Button>
                  )}
                </div>
              )}
            </li>
          </ul>
        ) : (
          <div className="text-center py-16 px-4">
            <IntegrationPlatformIcon platform="whatsapp" size="xl" variant="muted" className="mx-auto mb-4" />
            <h3 className="text-lg font-semibold">{t('noAccountsConnected')}</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('whatsappInboxConnectPrompt')}</p>
            <Button className="mt-4" onClick={onConnect} loading={isStartingConnect}>
              {t('connect')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WhatsAppInboxSection;
