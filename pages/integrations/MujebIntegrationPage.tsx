import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/Card';
import { ApiKeysManager, CopyField, IntegrationPageLayout, SetupSteps, normalizeConnectionStatus } from '../../components/integrations/kit';
import { useAppContext } from '../../context/AppContext';
import { useIntegrationPolicy } from '../../hooks/integrations/useIntegrationPolicy';
import { getMujebConfigAPI } from '../../services/api';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';
import { normalizeRole } from '../../utils/roles';
import { integrationByPage } from './registry';

export const MujebIntegrationPage = () => {
  const entry = integrationByPage('Mujeb')!;
  const { t, language, currentUser } = useAppContext();
  const policy = useIntegrationPolicy('mujeb');
  const { data, isLoading, refetch } = useQuery({ queryKey: ['mujebConfig'], queryFn: getMujebConfigAPI });
  const connected = (data?.keys?.length ?? 0) > 0 || data?.integration_status === 'connected';
  const status = policy.disabled ? 'disabled' : connected ? 'connected' : normalizeConnectionStatus(data?.integration_status || 'pending');
  const last = data?.last_received_at
    ? new Date(data.last_received_at).toLocaleString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' }))
    : null;
  return (
    <IntegrationPageLayout
      title={t('mujebTitle')}
      subtitle={t('mujebDescription')}
      helpVideoPageKey={entry.helpVideoPageKey}
      status={status}
      statusLabel={status === 'connected' ? t('mujebStatusConnected') : status === 'disabled' ? undefined : t('mujebStatusPending')}
      policy={policy.disabled ? { message: policy.entry?.message, scope: policy.entry?.scope } : null}
      policyDisabled={policy.disabled}
      loading={isLoading}
    >
      <Card>
        <div className="max-w-2xl space-y-6">
          {last && !policy.disabled ? <p className="text-xs text-gray-500">{t('mujebLastReceived')} {last}</p> : null}
          <CopyField label={t('mujebCheckEndpoint')} hint={t('mujebCheckEndpointHint')} value={data?.check_endpoint_url || ''} disabled={policy.disabled} />
          <CopyField label={t('mujebEndpoint')} hint={t('mujebEndpointHint')} value={data?.endpoint_url || ''} disabled={policy.disabled} />
          <SetupSteps title={t('tiktokSetupSteps')} steps={[t('mujebStep1'), t('mujebStep2'), t('mujebStep3'), t('mujebStep4')]} />
          <ApiKeysManager
            keys={data?.keys || []}
            canManage={normalizeRole(currentUser?.role) === 'Owner'}
            disabled={policy.disabled}
            onChanged={() => { void refetch(); }}
          />
        </div>
      </Card>
    </IntegrationPageLayout>
  );
};
