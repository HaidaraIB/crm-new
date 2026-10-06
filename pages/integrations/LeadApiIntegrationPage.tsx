import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '../../components/index';
import { LeadApiDocumentation } from '../../components/integrations/LeadApiDocumentation';
import { ApiKeysManager, CopyField, IntegrationPageLayout, SetupSteps, normalizeConnectionStatus } from '../../components/integrations/kit';
import { leadApiDocT } from '../../constants/leadApiDocumentation';
import { useAppContext } from '../../context/AppContext';
import { useTabParam } from '../../hooks/integrations/useTabParam';
import { useIntegrationPolicy } from '../../hooks/integrations/useIntegrationPolicy';
import { getLeadApiConfigAPI } from '../../services/api';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';
import { normalizeRole } from '../../utils/roles';
import { integrationByPage } from './registry';

const TABS = ['setup', 'docs'] as const;

export const LeadApiIntegrationPage = () => {
  const entry = integrationByPage('Lead API')!;
  const { t, language, currentUser } = useAppContext();
  const docLanguage = language === 'ar' ? 'ar' : 'en';
  const [tab, setTab] = useTabParam(TABS, 'setup', 'leadApiIntegration');
  const policy = useIntegrationPolicy('api');
  const { data, isLoading, refetch } = useQuery({ queryKey: ['leadApiConfig'], queryFn: getLeadApiConfigAPI });
  const connected = (data?.keys?.length ?? 0) > 0 || data?.integration_status === 'connected';
  const status = policy.disabled ? 'disabled' : connected ? 'connected' : normalizeConnectionStatus(data?.integration_status || 'pending');
  const last = data?.last_received_at
    ? new Date(data.last_received_at).toLocaleString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' }))
    : null;
  return (
    <IntegrationPageLayout
      title={t('leadApiTitle')}
      subtitle={t('leadApiDescription')}
      platform="lead_api"
      helpVideoPageKey={entry.helpVideoPageKey}
      status={status}
      statusLabel={status === 'connected' ? t('leadApiStatusConnected') : status === 'disabled' ? undefined : t('leadApiStatusPending')}
      policy={policy.disabled ? { message: policy.entry?.message, scope: policy.entry?.scope } : null}
      policyDisabled={policy.disabled}
      tabs={[
        { id: 'setup', label: leadApiDocT(docLanguage, 'leadApiDocTabSetup') },
        { id: 'docs', label: leadApiDocT(docLanguage, 'leadApiDocTabDocs') },
      ]}
      activeTab={tab}
      onTabChange={(id) => setTab(id as typeof tab)}
      loading={tab === 'setup' && isLoading}
    >
      {tab === 'docs' ? (
        <Card>
          <LeadApiDocumentation endpointUrl={data?.endpoint_url || ''} onBack={() => setTab('setup')} />
        </Card>
      ) : (
        <Card>
          <div className="max-w-2xl space-y-6">
            {last ? <p className="text-xs text-gray-500">{t('leadApiLastReceived')} {last}</p> : null}
            <CopyField label={t('leadApiEndpoint')} hint={t('leadApiEndpointHint')} value={data?.endpoint_url || ''} />
            <SetupSteps
              title={t('tiktokSetupSteps')}
              steps={[t('leadApiSetupStep1'), t('leadApiSetupStep2'), t('leadApiSetupStep3')]}
              action={
                <Button variant="secondary" className="text-xs" onClick={() => setTab('docs')}>
                  {leadApiDocT(docLanguage, 'leadApiDocViewDocumentation')}
                </Button>
              }
            />
            <ApiKeysManager
              keys={data?.keys || []}
              canManage={normalizeRole(currentUser?.role) === 'Owner'}
              disabled={policy.disabled}
              onChanged={() => { void refetch(); }}
            />
          </div>
        </Card>
      )}
    </IntegrationPageLayout>
  );
};
