import React from 'react';
import { PageWrapper } from '../../PageWrapper';
import { SectionLoadingState } from '../../SectionLoadingState';
import { Tabs, TabItem } from '../../Tabs';
import { useAppContext } from '../../../context/AppContext';
import { IntegrationPlatform, IntegrationPlatformIcon } from '../IntegrationPlatformIcon';
import { PolicyBanner, PolicyNotice } from './PolicyBanner';
import { StatusBadge } from './StatusBadge';
import { ConnectionStatus } from './status';

export const IntegrationPageLayout: React.FC<{
  title: string;
  subtitle?: string;
  platform?: IntegrationPlatform;
  helpVideoPageKey?: string;
  status?: ConnectionStatus;
  statusLabel?: string;
  policy?: PolicyNotice | null;
  policyDisabled?: boolean;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  loading?: boolean;
  children: React.ReactNode;
}> = ({
  title,
  subtitle,
  platform,
  helpVideoPageKey,
  status,
  statusLabel,
  policy,
  policyDisabled,
  tabs,
  activeTab,
  onTabChange,
  loading,
  children,
}) => {
  const { t } = useAppContext();
  return (
    <PageWrapper
      title={title}
      subtitle={subtitle}
      titleIcon={platform ? <IntegrationPlatformIcon platform={platform} size="sm" /> : undefined}
      helpVideoPageKey={helpVideoPageKey}
      actions={status ? <StatusBadge status={status} label={statusLabel} /> : undefined}
    >
      {policyDisabled && policy ? <PolicyBanner policy={policy} /> : null}
      {tabs && activeTab && onTabChange ? (
        <Tabs tabs={tabs} activeId={activeTab} onChange={onTabChange} ariaLabel={title} />
      ) : null}
      {loading ? <SectionLoadingState className="py-16" label={t('loadingIntegrations')} /> : children}
    </PageWrapper>
  );
};
