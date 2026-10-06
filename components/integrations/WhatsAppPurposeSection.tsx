import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isPhoneLike } from '../PhoneText';
import { SectionLoadingState } from '../SectionLoadingState';
import { useAppContext } from '../../context/AppContext';
import { useIntegrationAccounts } from '../../hooks/integrations/useIntegrationAccounts';
import { useOAuthConnect } from '../../hooks/integrations/useOAuthConnect';
import { useConfirmDisconnect } from '../../hooks/integrations/useConfirmDisconnect';
import { syncWhatsAppPhoneNumbersAPI } from '../../services/api';
import { WhatsAppConnectionPanel } from './WhatsAppConnectionPanel';

export type WhatsAppPurpose = 'crm' | 'inbox';

/** One UI for CRM and Inbox WhatsApp — only copy + OAuth platform differ. */
export const WhatsAppPurposeSection: React.FC<{
  purpose: WhatsAppPurpose;
  disabled?: boolean;
}> = ({ purpose, disabled }) => {
  const { t, showToast, setEditingAccount, setIsManageIntegrationAccountModalOpen } = useAppContext();
  const queryClient = useQueryClient();
  const platform = purpose === 'crm' ? 'whatsapp' : 'whatsapp_inbox';
  const { accounts, isLoading } = useIntegrationAccounts(platform);
  const account = accounts[0] ?? null;
  const oauth = useOAuthConnect();
  const confirmDisconnect = useConfirmDisconnect(() => {
    queryClient.invalidateQueries({ queryKey: ['whatsappInboxNumbers'] });
  });
  const [syncing, setSyncing] = useState(false);

  const copy =
    purpose === 'crm'
      ? {
          hint: t('whatsappCrmIntegrationHint'),
          empty: t('connectAccountPrompt'),
          numberLabel: t('crmWhatsAppNumber'),
          defaultName: 'WhatsApp',
        }
      : {
          hint: t('whatsappInboxIntegrationHint'),
          empty: t('whatsappInboxConnectPrompt'),
          numberLabel: t('inboxPhoneNumber'),
          defaultName: t('whatsappInboxTab'),
        };

  if (isLoading) return <SectionLoadingState className="py-16" label={t('loadingIntegrations')} />;

  const coexistence = account?.metadata?.coexistence === true || account?.metadata?.is_on_biz_app === true;
  const phone =
    account?.displayPhoneNumber ||
    (account?.metadata?.display_phone_number ? String(account.metadata.display_phone_number) : '') ||
    (account && isPhoneLike(account.name) ? account.name.trim() : '');

  const syncNumbers = async () => {
    if (!account) return;
    setSyncing(true);
    try {
      const res = await syncWhatsAppPhoneNumbersAPI(account.id);
      queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['whatsappInboxNumbers'] });
      const display = res.display_phone_number || res.phone_number_id || '';
      showToast(display ? `${t('whatsappPhoneNumbersSynced')} ${display}` : t('whatsappPhoneNumbersSynced'), {
        variant: 'success',
      });
    } catch (error: unknown) {
      const err = error as { error_key?: string; code?: string; message?: string };
      const key = err.error_key || err.code;
      showToast((key && t(key as 'connected')) || err.message || t('whatsapp_phone_numbers_not_synced'), {
        variant: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <WhatsAppConnectionPanel
      disabled={disabled}
      hint={copy.hint}
      emptyPrompt={copy.empty}
      account={account}
      coexistence={coexistence}
      conflictMessage={
        account && account.status !== 'connected' && account.metadata?.number_conflict_key
          ? t(String(account.metadata.number_conflict_key) as 'connected')
          : null
      }
      numbers={phone ? [{ id: `${purpose}-phone`, phone, label: copy.numberLabel }] : []}
      onConnect={() =>
        void (account
          ? oauth.connect(account.id)
          : oauth.ensureAccountAndConnect(platform, copy.defaultName, null))
      }
      connectLoading={oauth.isStarting || (account != null && oauth.connectingId === account.id)}
      onEdit={() => {
        if (!account) return;
        setEditingAccount(account);
        setIsManageIntegrationAccountModalOpen(true);
      }}
      onDisconnect={account?.status === 'connected' ? () => confirmDisconnect(account) : undefined}
      onSync={account?.status === 'connected' ? () => void syncNumbers() : undefined}
      syncLoading={syncing}
    />
  );
};
