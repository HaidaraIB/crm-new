import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input } from '../../components/index';
import { SelectLeadFormModal } from '../../components/modals/SelectLeadFormModal';
import { SocialInboxSection } from '../../components/integrations/SocialInboxSection';
import {
  ConnectionCard,
  EmptyConnectionState,
  IntegrationPageLayout,
} from '../../components/integrations/kit';
import { useAppContext } from '../../context/AppContext';
import { useTabParam } from '../../hooks/integrations/useTabParam';
import { useIntegrationPolicy } from '../../hooks/integrations/useIntegrationPolicy';
import { useIntegrationAccounts, IntegrationAccount } from '../../hooks/integrations/useIntegrationAccounts';
import { useOAuthConnect } from '../../hooks/integrations/useOAuthConnect';
import { useConfirmDisconnect } from '../../hooks/integrations/useConfirmDisconnect';
import { useTestConnection } from '../../hooks/useQueries';
import {
  getConnectedAccountAPI,
  getConnectedAccountsAPI,
  resolveLocalizedApiError,
  syncMetaPagesAPI,
  updateConnectedAccountAPI,
} from '../../services/api';
import { localizeMetaTokenError } from '../../utils/metaTokenErrorDisplay';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';
import { normalizeRole } from '../../utils/roles';
import { integrationByPage } from './registry';
import { MetaHealthModal } from './MetaHealthModal';

const META_TABS = ['leadAds', 'inbox'] as const;

function leadFormConfig(account: { metadata?: Record<string, unknown> }, accountId: number) {
  const raw = (account.metadata?.pages as Array<{ id?: string; name?: string }>) || [];
  const pages = raw.map((p) => ({ id: String(p.id), name: String(p.name || p.id) }));
  if (!pages.length) return null;
  const linkedPid = account.metadata?.selected_page_id != null ? String(account.metadata.selected_page_id) : '';
  const defaultPage = pages.find((p) => p.id === linkedPid) || pages[0];
  const isLinked = Boolean(linkedPid && defaultPage.id === linkedPid);
  const formId = isLinked ? String(account.metadata?.selected_form_id || '') : '';
  const mapping = (account.metadata?.form_campaign_mapping as Record<string, unknown>) || {};
  const campaignId = formId && mapping[formId] != null ? String(mapping[formId]) : '';
  return {
    accountId,
    pages,
    linkedPageId: linkedPid || undefined,
    linkedFormId: formId || undefined,
    linkedCampaignId: campaignId || undefined,
  };
}

export const MetaIntegrationPage = () => {
  const entry = integrationByPage('Meta')!;
  const {
    t,
    language,
    showToast,
    currentUser,
    setEditingAccount,
    setIsManageIntegrationAccountModalOpen,
    isSelectLeadFormModalOpen,
    setIsSelectLeadFormModalOpen,
    selectLeadFormConfig,
    setSelectLeadFormConfig,
  } = useAppContext();
  const queryClient = useQueryClient();
  const isEmployee = normalizeRole(currentUser?.role) === 'Employee' || normalizeRole(currentUser?.role) === 'Doctor';
  const [tab, setTab] = useTabParam(META_TABS, 'leadAds', 'metaIntegration');
  const active = isEmployee ? 'leadAds' : tab;
  const policyKey = active === 'inbox' ? 'meta_inbox' : 'meta';
  const policy = useIntegrationPolicy(policyKey);
  const { accounts, isLoading } = useIntegrationAccounts('meta');
  const leadAds = accounts.filter((a) => a.platform !== 'meta_inbox');
  const account = leadAds[0];
  const confirmDisconnect = useConfirmDisconnect();
  const testConnection = useTestConnection();
  const [healthAccountId, setHealthAccountId] = useState<number | null>(null);
  const [pixelDraft, setPixelDraft] = useState('');
  const [pixelSaving, setPixelSaving] = useState(false);
  const [, setFormBusy] = useState(false);

  const openLeadForm = async (accountId: number) => {
    const list = await getConnectedAccountsAPI('meta').catch(() => null);
    const rows = Array.isArray(list) ? list : list?.results || [];
    const found = rows.find((row: { id: number }) => row.id === accountId);
    const cfg = found ? leadFormConfig(found, accountId) : null;
    if (!cfg) return;
    setSelectLeadFormConfig(cfg);
    setIsSelectLeadFormModalOpen(true);
  };

  const oauth = useOAuthConnect((accountId) => {
    void openLeadForm(accountId);
  });

  useEffect(() => {
    if (account?.metadata?.pixel_id != null) setPixelDraft(String(account.metadata.pixel_id));
  }, [account?.id, account?.metadata?.pixel_id]);

  const edit = (row: IntegrationAccount) => {
    setEditingAccount(row);
    setIsManageIntegrationAccountModalOpen(true);
  };

  const selectForm = async (row: IntegrationAccount) => {
    setFormBusy(true);
    try {
      let pages = (row.metadata?.pages as unknown[]) || [];
      let base = row;
      try {
        const full = await getConnectedAccountAPI(row.id);
        if (full) {
          base = { ...row, metadata: full.metadata };
          pages = full.metadata?.pages || pages;
        }
      } catch { /* keep list */ }
      try {
        const res = await syncMetaPagesAPI(row.id);
        if (res?.pages?.length) {
          pages = res.pages;
          queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
        }
      } catch { /* keep list */ }
      if (!pages.length) {
        showToast(t('noFacebookPagesReconnectHint'), { variant: 'warning' });
        return;
      }
      const cfg = leadFormConfig({ metadata: { ...(base.metadata || {}), pages } }, row.id);
      if (cfg) {
        setSelectLeadFormConfig(cfg);
        setIsSelectLeadFormModalOpen(true);
      }
    } finally {
      setFormBusy(false);
    }
  };

  const test = async (row: IntegrationAccount) => {
    try {
      const result = await testConnection.mutateAsync(row.id);
      if (result.valid) {
        const expires =
          result.expires_at != null && Number(result.expires_at) > 0
            ? ` ${t('metaTokenExpiresAt')}: ${new Date(Number(result.expires_at) * 1000).toLocaleString(
                language === 'ar' ? ARABIC_DATE_LOCALE : undefined,
                withLatinDigits(),
              )}`
            : '';
        showToast(`${t('connectionValid')}${expires}`, { variant: 'success' });
      } else {
        const key = result.message_key;
        const localized = (key && t(key as 'connected') !== key ? t(key as 'connected') : '') || localizeMetaTokenError(result.message, t);
        showToast(localized || t('connectionInvalid'), { variant: 'error' });
      }
    } catch (error: unknown) {
      showToast(resolveLocalizedApiError(error as { message?: string }, t, t('errorTestingConnection')), { variant: 'error' });
    }
  };

  const savePixel = async (row: IntegrationAccount) => {
    setPixelSaving(true);
    try {
      await updateConnectedAccountAPI(row.id, { pixel_id: pixelDraft.trim() });
      await queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
      showToast(t('metaPixelIdSaved'), { variant: 'success' });
    } catch (error: unknown) {
      showToast(resolveLocalizedApiError(error as { message?: string }, t, t('failedToSavePixelId')), { variant: 'error' });
    } finally {
      setPixelSaving(false);
    }
  };

  const tabs = isEmployee
    ? undefined
    : entry.tabs!.map((item) => ({ id: item.id, label: t(item.labelKey as 'meta') }));

  return (
    <IntegrationPageLayout
      title={`${t('meta')} ${t('integration')}`}
      platform="meta"
      helpVideoPageKey={entry.helpVideoPageKey}
      status={active === 'inbox' ? undefined : account?.status}
      policy={policy.disabled ? { message: policy.entry?.message, scope: policy.entry?.scope, title: active === 'inbox' ? t('integrationStatusDisabledInbox') : undefined } : null}
      policyDisabled={policy.disabled}
      tabs={tabs}
      activeTab={tabs ? active : undefined}
      onTabChange={tabs ? (id) => setTab(id as typeof active) : undefined}
      loading={active === 'leadAds' && isLoading}
    >
      {active === 'inbox' ? (
        <SocialInboxSection integrationDisabled={policy.disabled} integrationDisabledMessage={policy.message} />
      ) : !account ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <EmptyConnectionState
            platform="meta"
            title={t('noAccountsConnected')}
            prompt={t('connectAccountPrompt')}
            actionLabel={t('connect')}
            onAction={() => void oauth.ensureAccountAndConnect('meta', 'Meta', null)}
            actionLoading={oauth.isStarting}
            actionDisabled={policy.disabled}
          />
        </div>
      ) : (
        <ConnectionCard
          platform="meta"
          name={account.name}
          status={account.status}
          primary={
            account.status === 'connected'
              ? undefined
              : {
                  label: account.status === 'expired' ? t('reconnect') : t('connect'),
                  onClick: () => void oauth.connect(account.id),
                  loading: oauth.connectingId === account.id,
                  disabled: policy.disabled || oauth.connectingId != null,
                }
          }
          menu={[
            ...(account.status === 'connected'
              ? [
                  { key: 'test', label: t('testConnection'), onClick: () => void test(account) },
                  { key: 'form', label: t('selectLeadForm'), onClick: () => void selectForm(account) },
                  { key: 'health', label: t('checkMetaHealth'), onClick: () => setHealthAccountId(account.id) },
                ]
              : []),
            { key: 'edit', label: t('edit'), onClick: () => edit(account) },
            ...(account.status === 'connected'
              ? [{ key: 'disconnect', label: t('disconnect'), danger: true, onClick: () => confirmDisconnect(account) }]
              : []),
          ]}
          footer={
            account.status === 'connected' ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('metaPixelId')}</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('metaPixelIdHint')}</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <Input
                    id={`meta-pixel-${account.id}`}
                    value={pixelDraft}
                    onChange={(e) => setPixelDraft(e.target.value)}
                    placeholder={t('metaPixelIdPlaceholder')}
                    className="sm:max-w-md"
                  />
                  <Button variant="secondary" onClick={() => void savePixel(account)} loading={pixelSaving}>
                    {t('savePixelId')}
                  </Button>
                </div>
              </div>
            ) : null
          }
        />
      )}
      {selectLeadFormConfig ? (
        <SelectLeadFormModal
          isOpen={isSelectLeadFormModalOpen}
          onClose={() => {
            setIsSelectLeadFormModalOpen(false);
            setSelectLeadFormConfig(null);
          }}
          accountId={selectLeadFormConfig.accountId}
          pages={selectLeadFormConfig.pages}
          linkedPageId={selectLeadFormConfig.linkedPageId}
          linkedFormId={selectLeadFormConfig.linkedFormId}
          linkedCampaignId={selectLeadFormConfig.linkedCampaignId}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] })}
        />
      ) : null}
      {healthAccountId != null ? (
        <MetaHealthModal
          accountId={healthAccountId}
          onClose={() => setHealthAccountId(null)}
          onReconnect={(id) => void oauth.connect(id)}
          reconnecting={oauth.connectingId === healthAccountId}
        />
      ) : null}
    </IntegrationPageLayout>
  );
};
