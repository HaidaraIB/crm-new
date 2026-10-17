import React, { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useCampaigns, useChannels, useStatuses, useUsers } from '../../hooks/useQueries';
import { usersForOperationalEmployeeLists } from '../../utils/roles';
import { seedLabel } from '../../utils/seedLabels';
import { DEFAULT_REPORT_FILTERS } from '../../utils/reportFilters';
import { LEAD_TYPES, REPORT_SOURCES, leadTypeLabel, sourceLabel } from '../../utils/reportLabels';
import type { ReportFilters } from '../../types';
import { FilterDrawerShell, FilterSection } from '../filters';

type Option<V> = { value: V; label: string };

function toggle<V>(list: V[], value: V): V[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const CheckList = <V extends string | number>({
  options,
  selected,
  onChange,
  emptyLabel,
}: {
  options: Option<V>[];
  selected: V[];
  onChange: (next: V[]) => void;
  emptyLabel: string;
}) => {
  if (!options.length) return <p className="text-xs text-gray-400">{emptyLabel}</p>;
  return (
    <ul className="space-y-0.5">
      {options.map((o) => (
        <li key={String(o.value)}>
          <label className="flex min-h-[2rem] cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/60">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              checked={selected.includes(o.value)}
              onChange={() => onChange(toggle(selected, o.value))}
            />
            <span className="truncate">{o.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
};

const asList = (data: any): any[] => (Array.isArray(data) ? data : data?.results || []);

export const ReportFiltersDrawer = () => {
  const { isReportFilterDrawerOpen, setIsReportFilterDrawerOpen, reportFilters, setReportFilters, t, language, currentUser } =
    useAppContext();
  const [draft, setDraft] = useState<ReportFilters>(reportFilters);

  const syncDraft = useCallback(() => setDraft(reportFilters), [reportFilters]);
  const close = () => {
    setDraft(reportFilters);
    setIsReportFilterDrawerOpen(false);
  };

  // Only fetch option lists once the drawer has been opened.
  const enabled = isReportFilterDrawerOpen;
  const { data: usersData } = useUsers(undefined, { enabled });
  const { data: statusesData } = useStatuses({ enabled });
  const { data: campaignsData } = useCampaigns({ enabled });
  const { data: channelsData } = useChannels({ enabled });

  const userOptions = useMemo<Option<number>[]>(
    () =>
      usersForOperationalEmployeeLists(asList(usersData), currentUser as any).map((u: any) => ({
        value: u.id,
        label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.name || u.username || `#${u.id}`,
      })),
    [usersData, currentUser],
  );
  const statusOptions = useMemo<Option<number>[]>(
    () => asList(statusesData).map((s: any) => ({ value: s.id, label: seedLabel(s.name, language) })),
    [statusesData, language],
  );
  const campaignOptions = useMemo<Option<number>[]>(
    () => asList(campaignsData).map((c: any) => ({ value: c.id, label: c.name })),
    [campaignsData],
  );
  const channelOptions = useMemo<Option<number>[]>(
    () => asList(channelsData).map((c: any) => ({ value: c.id, label: seedLabel(c.name, language) })),
    [channelsData, language],
  );
  const sourceOptions: Option<string>[] = REPORT_SOURCES.map((s) => ({ value: s, label: sourceLabel(s, t) }));
  const typeOptions: Option<string>[] = LEAD_TYPES.map((s) => ({ value: s, label: leadTypeLabel(s, t) }));

  const set = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const none = t('reportNoOptions');

  return (
    <FilterDrawerShell
      isOpen={isReportFilterDrawerOpen}
      onClose={close}
      onOpen={syncDraft}
      title={t('reportFilters')}
      onReset={() => {
        setDraft(DEFAULT_REPORT_FILTERS);
        setReportFilters(DEFAULT_REPORT_FILTERS);
      }}
      onApply={() => {
        setReportFilters(draft);
        setIsReportFilterDrawerOpen(false);
      }}
    >
      <FilterSection title={t('reportFilterEmployees')}>
        <CheckList options={userOptions} selected={draft.userIds} onChange={(v) => set('userIds', v)} emptyLabel={none} />
      </FilterSection>
      <FilterSection title={t('reportFilterStatuses')}>
        <CheckList options={statusOptions} selected={draft.statusIds} onChange={(v) => set('statusIds', v)} emptyLabel={none} />
      </FilterSection>
      <FilterSection title={t('reportFilterSources')}>
        <CheckList options={sourceOptions} selected={draft.sources} onChange={(v) => set('sources', v)} emptyLabel={none} />
      </FilterSection>
      <FilterSection title={t('reportFilterCampaigns')} defaultOpen={false}>
        <CheckList options={campaignOptions} selected={draft.campaignIds} onChange={(v) => set('campaignIds', v)} emptyLabel={none} />
      </FilterSection>
      <FilterSection title={t('reportFilterChannels')} defaultOpen={false}>
        <CheckList options={channelOptions} selected={draft.channelIds} onChange={(v) => set('channelIds', v)} emptyLabel={none} />
      </FilterSection>
      <FilterSection title={t('leadType')} defaultOpen={false}>
        <CheckList options={typeOptions} selected={draft.leadTypes} onChange={(v) => set('leadTypes', v)} emptyLabel={none} />
      </FilterSection>
    </FilterDrawerShell>
  );
};
