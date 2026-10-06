import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PbxSettingsForm } from '../../components/integrations/PbxSettingsForm';
import { IntegrationPageLayout } from '../../components/integrations/kit';
import { useAppContext } from '../../context/AppContext';
import { useIntegrationPolicy } from '../../hooks/integrations/useIntegrationPolicy';
import { getIntegrationPolicyAPI } from '../../services/api';
import { integrationByPage } from './registry';

export const PbxIntegrationPage = () => {
  const entry = integrationByPage('PBX')!;
  const { t } = useAppContext();
  const policy = useIntegrationPolicy('pbx');
  const { data } = useQuery({ queryKey: ['integrationPolicy'], queryFn: getIntegrationPolicyAPI });
  return (
    <IntegrationPageLayout
      title={t('pbxIntegrationTitle')}
      subtitle={t('integrationHubPbxDesc')}
      platform="pbx"
      helpVideoPageKey={entry.helpVideoPageKey}
      policy={policy.disabled ? { message: policy.entry?.message, scope: policy.entry?.scope } : null}
      policyDisabled={policy.disabled}
    >
      <PbxSettingsForm t={t} integrationPolicyMap={data} />
    </IntegrationPageLayout>
  );
};
