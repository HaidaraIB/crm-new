import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/Card';
import { CopyField, IntegrationPageLayout, SetupSteps, StatusBadge, normalizeConnectionStatus } from '../../components/integrations/kit';
import { useAppContext } from '../../context/AppContext';
import { useIntegrationPolicy } from '../../hooks/integrations/useIntegrationPolicy';
import { getTikTokLeadgenConfigAPI } from '../../services/api';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';
import { integrationByPage } from './registry';

export const TikTokIntegrationPage = () => {
  const entry = integrationByPage('TikTok')!;
  const { t, language } = useAppContext();
  const policy = useIntegrationPolicy('tiktok');
  const { data, isLoading } = useQuery({ queryKey: ['tiktokLeadgenConfig'], queryFn: getTikTokLeadgenConfigAPI });
  const status = policy.disabled ? 'disabled' : normalizeConnectionStatus(data?.integration_status);
  const last = data?.last_received_at
    ? new Date(data.last_received_at).toLocaleString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' }))
    : null;
  return (
    <IntegrationPageLayout
      title={`${t('tikTok')} ${t('integration')}`}
      subtitle={t('integrationHubTiktokDesc')}
      platform="tiktok"
      helpVideoPageKey={entry.helpVideoPageKey}
      status={status}
      statusLabel={status === 'connected' ? t('tiktokStatusConnected') : status === 'disabled' ? undefined : t('tiktokStatusPending')}
      policy={policy.disabled ? { message: policy.entry?.message, scope: policy.entry?.scope } : null}
      policyDisabled={policy.disabled}
      loading={isLoading}
    >
      <Card>
        <div className="max-w-2xl space-y-6">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} label={status === 'connected' ? t('tiktokStatusConnected') : undefined} />
            {last ? <span className="text-xs text-gray-500">{t('tiktokLastLeadReceivedAt')} {last}</span> : null}
          </div>
          <CopyField label={t('webhookUrl')} hint={t('tiktokWebhookUrlHint')} value={data?.webhook_url || ''} />
          <SetupSteps
            title={t('tiktokSetupSteps')}
            steps={[t('tiktokStep1'), t('tiktokStep2'), t('tiktokStep3'), t('tiktokStep4')]}
          />
        </div>
      </Card>
    </IntegrationPageLayout>
  );
};
