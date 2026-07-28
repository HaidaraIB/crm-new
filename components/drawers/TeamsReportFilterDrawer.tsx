import React, { useCallback, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useUsers } from '../../hooks/useQueries';
import { User, type TeamsReportFilters } from '../../types';
import { usersForOperationalEmployeeLists } from '../../utils/roles';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

const getUserDisplayName = (user: User): string => {
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  return user.name || user.username || user.email || `User ${user.id}`;
};

export const DEFAULT_TEAMS_REPORT_FILTERS: TeamsReportFilters = {
  selectedTeam: 'all',
  leadType: 'all',
  startDate: '',
  endDate: '',
};

export const TeamsReportFilterDrawer = () => {
  const {
    isTeamsReportFilterDrawerOpen,
    setIsTeamsReportFilterDrawerOpen,
    t,
    teamsReportFilters,
    setTeamsReportFilters,
    currentUser,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(teamsReportFilters);

  const { data: usersData, isLoading: usersLoading, error: usersError } = useUsers();
  const usersRaw = Array.isArray(usersData) ? usersData : usersData?.results || [];
  const users = React.useMemo(
    () => usersForOperationalEmployeeLists(usersRaw as User[], currentUser ?? null),
    [usersRaw, currentUser],
  );

  const syncDraft = useCallback(() => {
    setLocalFilters(teamsReportFilters);
  }, [teamsReportFilters]);

  const handleClose = () => {
    setLocalFilters(teamsReportFilters);
    setIsTeamsReportFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof TeamsReportFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_TEAMS_REPORT_FILTERS);
    setTeamsReportFilters(DEFAULT_TEAMS_REPORT_FILTERS);
  };

  const handleApply = () => {
    setTeamsReportFilters(localFilters);
    setIsTeamsReportFilterDrawerOpen(false);
  };

  return (
    <FilterDrawerShell
      isOpen={isTeamsReportFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterTeamsReport')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('reportInfo')}>
        <div className="space-y-3">
          <div>
            <FilterLabel htmlFor="teams-report-filter-team">{t('team')}</FilterLabel>
            <FilterSelect
              id="teams-report-filter-team"
              value={localFilters.selectedTeam}
              onChange={(e) => handleFilterChange('selectedTeam', e.target.value)}
            >
              <option value="all">{t('allTeams')}</option>
              {usersLoading ? (
                <option disabled>{t('loading')}</option>
              ) : usersError ? (
                <option disabled>{t('errorLoadingEmployees')}</option>
              ) : (
                (users || []).map((user) => (
                  <option key={user.id} value={user.id.toString()}>
                    {getUserDisplayName(user)}
                  </option>
                ))
              )}
            </FilterSelect>
          </div>
          <div>
            <FilterLabel htmlFor="teams-report-filter-lead-type">{t('leadType')}</FilterLabel>
            <FilterSelect
              id="teams-report-filter-lead-type"
              value={localFilters.leadType}
              onChange={(e) => handleFilterChange('leadType', e.target.value)}
            >
              <option value="all">{t('allLeadsType')}</option>
              <option value="fresh">{t('freshLeads')}</option>
              <option value="cold">{t('coldLeads')}</option>
            </FilterSelect>
          </div>
          <div>
            <FilterLabel htmlFor="teams-report-filter-start-date">{t('startDate')}</FilterLabel>
            <FilterInput
              id="teams-report-filter-start-date"
              type="date"
              value={localFilters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="teams-report-filter-end-date">{t('endDate')}</FilterLabel>
            <FilterInput
              id="teams-report-filter-end-date"
              type="date"
              value={localFilters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
