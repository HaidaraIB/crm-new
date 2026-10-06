import React, { useEffect } from 'react';
import { WhatsAppPurposeSection } from '../../components/integrations/WhatsAppPurposeSection';
import { IntegrationPageLayout } from '../../components/integrations/kit';
import { useAppContext } from '../../context/AppContext';
import { useTabParam } from '../../hooks/integrations/useTabParam';
import { useIntegrationPolicy } from '../../hooks/integrations/useIntegrationPolicy';
import { useIntegrationAccounts } from '../../hooks/integrations/useIntegrationAccounts';
import { blockedPolicyForPage } from '../../utils/integrationPolicyGate';
import { resolveIntegrationPolicyMessage } from '../../utils/integrationPolicyMessage';
import { navigateToCompanyRoute } from '../../utils/routing';
import { normalizeRole } from '../../utils/roles';
import { integrationByPage } from './registry';

const TABS = ['crm', 'inbox'] as const;

export const WhatsAppIntegrationPage = () => {
  const entry = integrationByPage('WhatsApp')!;
  const { t, currentUser, setCurrentPage, showToast } = useAppContext();
  const role = normalizeRole(currentUser?.role);
  const isEmployee = role === 'Employee' || role === 'Doctor';
  const [tab, setTab] = useTabParam(TABS, 'crm', 'whatsappIntegration');
  const policyKey = tab === 'inbox' ? 'whatsapp_inbox' : 'whatsapp';
  const policy = useIntegrationPolicy(isEmployee ? 'whatsapp' : policyKey);
  const { accounts } = useIntegrationAccounts(tab === 'inbox' ? 'whatsapp_inbox' : 'whatsapp', !isEmployee);
  const account = accounts[0];

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

  if (isEmployee) {
    return (
      <IntegrationPageLayout title={t('whatsApp')} platform="whatsapp" helpVideoPageKey="whatsapp" loading>
        {null}
      </IntegrationPageLayout>
    );
  }

  const tabs = entry.tabs!.map((item) => ({ id: item.id, label: t(item.labelKey as 'whatsApp') }));

  return (
    <IntegrationPageLayout
      title={t('whatsApp')}
      subtitle={t('whatsAppIntegrationDesc')}
      platform="whatsapp"
      helpVideoPageKey="whatsapp"
      status={account?.status}
      policy={policy.disabled ? { message: policy.entry?.message, scope: policy.entry?.scope, title: tab === 'inbox' ? t('integrationStatusDisabledWhatsappInbox') : undefined } : null}
      policyDisabled={policy.disabled}
      tabs={tabs}
      activeTab={tab}
      onTabChange={(id) => setTab(id as typeof tab)}
    >
      <WhatsAppPurposeSection purpose={tab} disabled={policy.disabled} />
    </IntegrationPageLayout>
  );
};
