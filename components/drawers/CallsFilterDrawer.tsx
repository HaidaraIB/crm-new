import React, { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useLeads, useUsers } from '../../hooks/useQueries';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';
import { DEFAULT_CALL_FILTERS } from '../../utils/callFilters';
import type { CallFilters } from '../../types';
import { getUserDisplayName } from '../../types';
import { normalizeRole, usersForOperationalEmployeeLists } from '../../utils/roles';

export { DEFAULT_CALL_FILTERS };

export const CallsFilterDrawer: React.FC = () => {
  const {
    isCallFilterDrawerOpen,
    setIsCallFilterDrawerOpen,
    callFilters,
    setCallFilters,
    t,
    currentUser,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState<CallFilters>(callFilters);
  const [leadQuery, setLeadQuery] = useState('');

  const role = normalizeRole(currentUser?.role);
  const canFilterByAgent = role === 'Owner' || role === 'Supervisor';

  const { data: usersResponse } = useUsers(undefined, {
    enabled: canFilterByAgent && isCallFilterDrawerOpen,
  });
  const users = useMemo(() => {
    const base = Array.isArray(usersResponse)
      ? usersResponse
      : usersResponse?.results || [];
    return usersForOperationalEmployeeLists(base as any[], currentUser ?? null);
  }, [usersResponse, currentUser]);

  const leadSearch = leadQuery.trim();
  const { data: leadsResponse, isFetching: leadsFetching } = useLeads(
    leadSearch ? { search: leadSearch } : undefined,
    1,
    { enabled: isCallFilterDrawerOpen && leadSearch.length >= 2 },
    25
  );
  const leadOptions = leadsResponse?.results || [];

  const syncDraft = useCallback(() => {
    setLocalFilters({ ...DEFAULT_CALL_FILTERS, ...callFilters });
    setLeadQuery('');
  }, [callFilters]);

  const handleReset = () => {
    setLocalFilters(DEFAULT_CALL_FILTERS);
    setCallFilters(DEFAULT_CALL_FILTERS);
    setLeadQuery('');
  };

  const handleApply = () => {
    setCallFilters({ ...localFilters });
    setIsCallFilterDrawerOpen(false);
  };

  const selectedLeadLabel = (() => {
    if (!localFilters.clientId) return null;
    const fromOptions = leadOptions.find(
      (l: any) => String(l.id) === String(localFilters.clientId)
    );
    if (fromOptions) {
      return fromOptions.name || fromOptions.phone || `#${localFilters.clientId}`;
    }
    return `#${localFilters.clientId}`;
  })();

  return (
    <FilterDrawerShell
      isOpen={isCallFilterDrawerOpen}
      onClose={() => setIsCallFilterDrawerOpen(false)}
      title={t('filterCalls')}
      onReset={handleReset}
      onApply={handleApply}
      onOpen={syncDraft}
    >
      <FilterSection title={t('direction')}>
        <FilterLabel htmlFor="calls-filter-direction">{t('direction')}</FilterLabel>
        <FilterSelect
          id="calls-filter-direction"
          value={localFilters.direction}
          onChange={(e) =>
            setLocalFilters((prev) => ({ ...prev, direction: e.target.value }))
          }
        >
          <option value="All">{t('all')}</option>
          <option value="inbound">{t('incoming')}</option>
          <option value="outbound">{t('outgoing')}</option>
        </FilterSelect>
      </FilterSection>

      {canFilterByAgent ? (
        <FilterSection title={t('agent')}>
          <FilterLabel htmlFor="calls-filter-agent">{t('agent')}</FilterLabel>
          <FilterSelect
            id="calls-filter-agent"
            value={localFilters.agent}
            onChange={(e) =>
              setLocalFilters((prev) => ({ ...prev, agent: e.target.value }))
            }
          >
            <option value="All">{t('allEmployees')}</option>
            <option value="me">{t('whatsappMyCalls')}</option>
            {users.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {getUserDisplayName(u)}
              </option>
            ))}
          </FilterSelect>
        </FilterSection>
      ) : (
        <FilterSection title={t('agent')}>
          <FilterLabel htmlFor="calls-filter-agent-me">{t('agent')}</FilterLabel>
          <FilterSelect
            id="calls-filter-agent-me"
            value={localFilters.agent === 'me' ? 'me' : 'All'}
            onChange={(e) =>
              setLocalFilters((prev) => ({
                ...prev,
                agent: e.target.value === 'me' ? 'me' : 'All',
              }))
            }
          >
            <option value="All">{t('all')}</option>
            <option value="me">{t('whatsappMyCalls')}</option>
          </FilterSelect>
        </FilterSection>
      )}

      <FilterSection title={t('lead')}>
        <FilterLabel htmlFor="calls-filter-lead-search">{t('searchLeadsByNameOrPhone')}</FilterLabel>
        <FilterInput
          id="calls-filter-lead-search"
          value={leadQuery}
          onChange={(e) => setLeadQuery(e.target.value)}
          placeholder={t('searchLeadsByNameOrPhone')}
        />
        {localFilters.clientId ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-primary/25 bg-primary/5 px-2.5 py-1.5 text-xs text-primary-800 dark:bg-primary/15 dark:text-primary-100">
            <span className="truncate">
              {t('lead')}: {selectedLeadLabel}
            </span>
            <button
              type="button"
              className="shrink-0 font-semibold underline"
              onClick={() => setLocalFilters((prev) => ({ ...prev, clientId: '' }))}
            >
              {t('callsClearRefine')}
            </button>
          </div>
        ) : null}
        {leadSearch.length >= 2 ? (
          <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
            {leadsFetching ? (
              <p className="px-2 py-2 text-xs text-gray-500">{t('loading')}…</p>
            ) : leadOptions.length === 0 ? (
              <p className="px-2 py-2 text-xs text-gray-500">{t('noResultsFound')}</p>
            ) : (
              leadOptions.map((lead: any) => (
                <button
                  key={lead.id}
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 border-b border-gray-100 px-2.5 py-2 text-start text-sm last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/80"
                  onClick={() => {
                    setLocalFilters((prev) => ({
                      ...prev,
                      clientId: String(lead.id),
                    }));
                    setLeadQuery('');
                  }}
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {lead.name || t('unknown')}
                  </span>
                  {lead.phone ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                      {lead.phone}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            {t('callsLeadFilterHint')}
          </p>
        )}
      </FilterSection>

      <FilterSection title={t('recording')}>
        <FilterLabel htmlFor="calls-filter-recording">{t('recording')}</FilterLabel>
        <FilterSelect
          id="calls-filter-recording"
          value={localFilters.hasRecording ? 'yes' : 'All'}
          onChange={(e) =>
            setLocalFilters((prev) => ({
              ...prev,
              hasRecording: e.target.value === 'yes',
            }))
          }
        >
          <option value="All">{t('all')}</option>
          <option value="yes">{t('callsHasRecordingFilter')}</option>
        </FilterSelect>
      </FilterSection>
    </FilterDrawerShell>
  );
};
