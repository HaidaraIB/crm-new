import React from 'react';
import { PhoneText } from '../PhoneText';
import { useAppContext } from '../../context/AppContext';
import {
  ConnectionCard,
  ConnectionSubItem,
  EmptyConnectionState,
  StatusBadge,
  ConnectionStatus,
} from './kit';

/** Shared CRM / Inbox WhatsApp connection chrome. */
export const WhatsAppConnectionPanel: React.FC<{
  disabled?: boolean;
  hint: string;
  emptyPrompt: string;
  account: { id: number; name: string; status: ConnectionStatus } | null;
  coexistence?: boolean;
  conflictMessage?: string | null;
  numbers: { id: string | number; phone: string; label: string }[];
  onConnect: () => void;
  connectLoading?: boolean;
  onEdit: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
  syncLoading?: boolean;
}> = ({
  disabled,
  hint,
  emptyPrompt,
  account,
  coexistence,
  conflictMessage,
  numbers,
  onConnect,
  connectLoading,
  onEdit,
  onDisconnect,
  onSync,
  syncLoading,
}) => {
  const { t } = useAppContext();
  const connected = account?.status === 'connected';

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">{hint}</p>
      {!account ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <EmptyConnectionState
            platform="whatsapp"
            title={t('noAccountsConnected')}
            prompt={emptyPrompt}
            actionLabel={t('connect')}
            onAction={onConnect}
            actionLoading={connectLoading}
            actionDisabled={disabled}
          />
        </div>
      ) : (
        <ConnectionCard
          platform="whatsapp"
          name={account.name}
          status={account.status}
          extra={
            coexistence && connected ? (
              <StatusBadge status="pending" label={t('whatsappCoexistenceBadge')} />
            ) : null
          }
          primary={
            connected
              ? undefined
              : {
                  label: account.status === 'expired' ? t('reconnect') : t('connect'),
                  onClick: onConnect,
                  loading: connectLoading,
                  disabled: disabled || connectLoading,
                }
          }
          menu={[
            ...(connected && onSync
              ? [{ key: 'sync', label: syncLoading ? t('syncing') : t('refreshWhatsAppPhoneNumbers'), onClick: onSync, loading: syncLoading }]
              : []),
            { key: 'edit', label: t('edit'), onClick: onEdit },
            ...(connected && onDisconnect
              ? [{ key: 'disconnect', label: t('disconnect'), danger: true, onClick: onDisconnect }]
              : []),
          ]}
          footer={conflictMessage ? <p className="text-xs text-red-600 dark:text-red-400">{conflictMessage}</p> : null}
        >
          {numbers.length > 0 ? (
            <ul className="-mx-5 sm:-mx-6 border-t border-gray-200/80 dark:border-gray-700/80">
              {numbers.map((number) => (
                <ConnectionSubItem
                  key={number.id}
                  title={
                    <PhoneText className="font-medium text-gray-900 dark:text-white">{number.phone}</PhoneText>
                  }
                  meta={<span className="text-gray-500">{number.label}</span>}
                />
              ))}
            </ul>
          ) : null}
        </ConnectionCard>
      )}
    </div>
  );
};
