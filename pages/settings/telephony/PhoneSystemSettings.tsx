/**
 * Settings > Phone System (Loop Cloud PBX, plan Phase 4). Tenant admins manage
 * extensions, numbers, trunks, routes, business hours, IVR menus, queues and call
 * recording. Every change recompiles the tenant's PBX config; the banner shows
 * while the node has not applied the latest version yet.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card } from '../../../components/Card';
import { usePersistedTab } from '../../../hooks/usePersistedTab';
import { getTelephonyStatusAPI } from '../../../services/api';
import { BusinessHoursSection } from './BusinessHoursSection';
import { ExtensionsSection } from './ExtensionsSection';
import { GreetingsSection } from './GreetingsSection';
import { IvrMenusSection, QueuesSection } from './IvrQueuesSection';
import { NumbersSection } from './NumbersSection';
import { RecordingSection } from './RecordingSection';
import { InboundRoutesSection, OutboundRoutesSection } from './RoutesSection';
import { TrunksSection } from './TrunksSection';
import { UsageSection } from './UsageSection';
import { useTr } from './shared';

const SECTIONS = [
  'extensions', 'numbers', 'trunks', 'inbound', 'outbound', 'hours', 'ivr', 'greetings', 'queues', 'recording', 'usage',
] as const;
type Section = (typeof SECTIONS)[number];

const LABELS: Record<Section, string> = {
  extensions: 'pbxExtensions',
  numbers: 'pbxNumbers',
  trunks: 'pbxTrunks',
  inbound: 'pbxInboundRoutes',
  outbound: 'pbxOutboundRoutes',
  hours: 'pbxBusinessHours',
  ivr: 'pbxIvrMenus',
  greetings: 'pbxGreetings',
  queues: 'pbxQueues',
  recording: 'pbxRecording',
  usage: 'pbxUsage',
};

export function useTelephonyStatus(enabled = true) {
  return useQuery({
    queryKey: ['telephony', 'status'],
    queryFn: getTelephonyStatusAPI,
    enabled,
    retry: false,
    // While a change is still on its way to the node, check again shortly.
    refetchInterval: (query) => {
      const tenant = query.state.data?.tenant;
      return tenant && tenant.applied_version !== tenant.config_version && tenant.status !== 'failed' ? 4000 : false;
    },
  });
}

const StatusBanner = () => {
  const tr = useTr();
  const { data } = useTelephonyStatus();
  const tenant = data?.tenant;
  if (!data) return null;
  if (!data.provisioned || !tenant) {
    return <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">{tr('pbxNotProvisioned')}</div>;
  }
  if (tenant.status === 'failed' || tenant.last_apply_error) {
    return <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">{tr('pbxApplyFailed')}</div>;
  }
  if (tenant.applied_version !== tenant.config_version) {
    return (
      <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-100">
        <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" aria-hidden />
        {tr('pbxApplying')}
      </div>
    );
  }
  if (tenant.outbound_suspended || tenant.status === 'suspended') {
    return <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">{tr('pbxErr_outbound_suspended')}</div>;
  }
  return null;
};

export const PhoneSystemSettings = () => {
  const tr = useTr();
  const [section, setSection] = usePersistedTab<Section>('phoneSystem', SECTIONS, 'extensions');

  return (
    <Card>
      <h2 className="mb-1 text-xl font-semibold">{tr('phoneSystem')}</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{tr('phoneSystemHint')}</p>
      <StatusBanner />
      <nav className="-mx-1 mb-5 flex flex-wrap gap-1" aria-label={tr('phoneSystem')}>
        {SECTIONS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            aria-current={section === id ? 'page' : undefined}
            className={`h-9 rounded-full px-3 text-sm font-medium transition-colors ${
              section === id
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {tr(LABELS[id])}
          </button>
        ))}
      </nav>
      {section === 'extensions' ? <ExtensionsSection /> : null}
      {section === 'numbers' ? <NumbersSection /> : null}
      {section === 'trunks' ? <TrunksSection /> : null}
      {section === 'inbound' ? <InboundRoutesSection /> : null}
      {section === 'outbound' ? <OutboundRoutesSection /> : null}
      {section === 'hours' ? <BusinessHoursSection /> : null}
      {section === 'ivr' ? <IvrMenusSection /> : null}
      {section === 'greetings' ? <GreetingsSection /> : null}
      {section === 'queues' ? <QueuesSection /> : null}
      {section === 'recording' ? <RecordingSection /> : null}
      {section === 'usage' ? <UsageSection /> : null}
    </Card>
  );
};
