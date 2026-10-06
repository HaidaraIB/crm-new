import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, PageWrapper } from '../../components/index';
import { IntegrationPlatformIcon } from '../../components/integrations/IntegrationPlatformIcon';
import { StatusBadge, normalizeConnectionStatus } from '../../components/integrations/kit';
import { useAppContext } from '../../context/AppContext';
import { getIntegrationsOverviewAPI, IntegrationOverviewRow } from '../../services/api';
import { CATEGORY_LABEL_KEY, INTEGRATION_CATEGORIES, INTEGRATIONS } from './registry';

export const IntegrationsHubPage = () => {
  const { t, goToPage } = useAppContext();
  const { data, isLoading } = useQuery({
    queryKey: ['integrationsOverview'],
    queryFn: getIntegrationsOverviewAPI,
  });
  const byKey = new Map<string, IntegrationOverviewRow>((data || []).map((row) => [row.key, row]));

  return (
    <PageWrapper title={t('integrations')} subtitle={t('integrationsHubSubtitle')}>
      {isLoading ? <p className="text-sm text-gray-500">{t('loadingIntegrations')}</p> : null}
      <div className="space-y-8">
        {INTEGRATION_CATEGORIES.map((category) => {
          const items = INTEGRATIONS.filter((item) => item.category === category);
          if (!items.length) return null;
          return (
            <section key={category}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                {t(CATEGORY_LABEL_KEY[category] as 'integrations')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const row = byKey.get(item.overviewKey);
                  const status = row?.policy_enabled === false
                    ? 'disabled'
                    : normalizeConnectionStatus(row?.status);
                  const open = () => goToPage(item.page);
                  return (
                    <Card key={item.page} className="p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        {item.platform ? (
                          <IntegrationPlatformIcon platform={item.platform} size="md" />
                        ) : null}
                        <StatusBadge status={status} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{t(item.titleKey as 'integrations')}</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t(item.descriptionKey as 'integrations')}</p>
                        {row?.account_name ? (
                          <p className="mt-2 text-xs text-gray-500 truncate">{row.account_name}</p>
                        ) : null}
                      </div>
                      <Button className="mt-auto w-full sm:w-auto" variant={status === 'connected' ? 'secondary' : 'primary'} onClick={open}>
                        {status === 'connected' || status === 'disabled' ? t('integrationManage') : t('connect')}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </PageWrapper>
  );
};
