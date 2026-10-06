import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WhatsAppInboxSection } from '../../components/integrations/WhatsAppInboxSection';
import { ConnectionCard, EmptyConnectionState, IntegrationPageLayout, StatusBadge } from '../../components/integrations/kit';
import { PhoneText, isPhoneLike } from '../../components/PhoneText';
import { useAppContext } from '../../context/AppContext';
import { useTabParam } from '../../hooks/integrations/useTabParam';
import { useIntegrationPolicy } from '../../hooks/integrations/useIntegrationPolicy';
import { useIntegrationAccounts } from '../../hooks/integrations/useIntegrationAccounts';
import { useOAuthConnect } from '../../hooks/integrations/useOAuthConnect';
import { useConfirmDisconnect } from '../../hooks/integrations/useConfirmDisconnect';
import { resolveLocalizedApiError, syncWhatsAppPhoneNumbersAPI } from '../../services/api';
import { blockedPolicyForPage } from '../../utils/integrationPolicyGate';
import { resolveIntegrationPolicyMessage } from '../../utils/integrationPolicyMessage';
import { navigateToCompanyRoute } from '../../utils/routing';
import { normalizeRole } from '../../utils/roles';
import { integrationByPage } from './registry';

const TABS = ['crm', 'inbox'] as const;

export const WhatsAppIntegrationPage = () => {
  const entry = integrationByPage('WhatsApp')!;
  const { t, currentUser, setCurrentPage, showToast, setEditingAccount, setIsManageIntegrationAccountModalOpen } = useAppContext();
  const queryClient = useQueryClient();
  const role = normalizeRole(currentUser?.role);
  const isEmployee = role === 'Employee' || role === 'Doctor';
  const [tab, setTab] = useTabParam(TABS, 'crm', 'whatsappIntegration');
  const policyKey = tab === 'inbox' ? 'whatsapp_inbox' : 'whatsapp';
  const policy = useIntegrationPolicy(isEmployee ? 'whatsapp' : policyKey);
  const { accounts, isLoading } = useIntegrationAccounts('whatsapp', !isEmployee);
  const crm = accounts.filter((a) => a.platform !== 'whatsapp_inbox');
  const account = crm[0];
  const oauth = useOAuthConnect();
  const confirmDisconnect = useConfirmDisconnect();
  const [syncing, setSyncing] = React.useState(false);

  useEffect(() => {
    if (!isEmployee) return;
    let cancelled = false;
    void (async () => {
      const blocked = await blockedPolicyForPage('Chats', currentUser?.company?.id);
      if (cancelled) return;
      if (blocked) {
        showToast(resolveIntegrationPolicyMessage(blocked.message, blocked.scope, t), { variant: 'warning' });
        setCurrentPage('Dashboard');
        navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Dashboard');
        return;
      }
      setCurrentPage('Chats');
      navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Chats');
    })();
    return () => {
      cancelled = true;
    };
  }, [isEmployee, currentUser?.company?.id, currentUser?.company?.name, currentUser?.company?.domain, setCurrentPage, showToast, t]);

  const syncNumbers = async (accountId: number) => {
    setSyncing(true);
    try {
      const res = await syncWhatsAppPhoneNumbersAPI(accountId);
      queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
      const display = res.display_phone_number || res.phone_number_id || '';
      showToast(display ? `${t('whatsappPhoneNumbersSynced')} ${display}` : t('whatsappPhoneNumbersSynced'), { variant: 'success' });
    } catch (error: unknown) {
      const err = error as { error_key?: string; code?: string; message?: string };
      const key = err.error_key || err.code;
      showToast((key && t(key as 'connected')) || err.message || t('whatsapp_phone_numbers_not_synced'), { variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  if (isEmployee) {
    return (
      <IntegrationPageLayout title={t('whatsApp')} platform="whatsapp" helpVideoPageKey="whatsapp" loading>
        {null}
      </IntegrationPageLayout>
    );
  }

  const tabs = entry.tabs!.map((item) => ({ id: item.id, label: t(item.labelKey as 'whatsApp') }));
  const coexistence = account?.metadata?.coexistence === true || account?.metadata?.is_on_biz_app === true;
  const crmPhone = account?.displayPhoneNumber || String(account?.metadata?.display_phone_number || '');
  const showCrmPhone = Boolean(crmPhone) && !isPhoneLike(account?.name);

  return (
    <IntegrationPageLayout
      title={t('whatsApp')}
      subtitle={t('whatsAppIntegrationDesc')}
      platform="whatsapp"
      helpVideoPageKey="whatsapp"
      status={tab === 'crm' ? account?.status : undefined}
      policy={policy.disabled ? { message: policy.entry?.message, scope: policy.entry?.scope, title: tab === 'inbox' ? t('integrationStatusDisabledWhatsappInbox') : undefined } : null}
      policyDisabled={policy.disabled}
      tabs={tabs}
      activeTab={tab}
      onTabChange={(id) => setTab(id as typeof tab)}
      loading={tab === 'crm' && isLoading}
    >
      {tab === 'inbox' ? (
        <WhatsAppInboxSection disabled={policy.disabled} />
      ) : !account ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <EmptyConnectionState
            platform="whatsapp"
            title={t('noAccountsConnected')}
            prompt={t('connectAccountPrompt')}
            actionLabel={t('connect')}
            onAction={() => void oauth.ensureAccountAndConnect('whatsapp', 'WhatsApp', null)}
            actionLoading={oauth.isStarting}
            actionDisabled={policy.disabled}
          />
        </div>
      ) : (
        <ConnectionCard
          platform="whatsapp"
          name={account.name}
          status={account.status}
          extra={
            coexistence && account.status === 'connected' ? (
              <StatusBadge status="pending" label={t('whatsappCoexistenceBadge')} />
            ) : null
          }
          primary={
            account.status === 'connected'
              ? undefined
              : {
                  label: t('connect'),
                  onClick: () => void oauth.connect(account.id),
                  loading: oauth.connectingId === account.id,
                  disabled: policy.disabled || oauth.connectingId != null,
                }
          }
          menu={[
            ...(account.status === 'connected'
              ? [{ key: 'sync', label: syncing ? t('syncing') : t('refreshWhatsAppPhoneNumbers'), onClick: () => void syncNumbers(account.id), loading: syncing }]
              : []),
            {
              key: 'edit',
              label: t('edit'),
              onClick: () => {
                setEditingAccount(account);
                setIsManageIntegrationAccountModalOpen(true);
              },
            },
            ...(account.status === 'connected'
              ? [{ key: 'disconnect', label: t('disconnect'), danger: true, onClick: () => confirmDisconnect(account) }]
              : []),
          ]}
          footer={
            <>
              {showCrmPhone ? (
                <PhoneText className="font-medium text-gray-900 dark:text-white">{crmPhone}</PhoneText>
              ) : null}
              {account.status !== 'connected' && account.metadata?.number_conflict_key ? (
                <p className="text-xs text-red-600 dark:text-red-400">{t(String(account.metadata.number_conflict_key) as 'connected')}</p>
              ) : null}
            </>
          }
        />
      )}
    </IntegrationPageLayout>
  );
};
