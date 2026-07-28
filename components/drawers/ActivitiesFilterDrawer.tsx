import React, { useCallback, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { TaskStage } from '../../types';
import type { ActivityFilters } from '../../types';
import { getStageDisplayLabel } from '../../utils/taskStageMapper';
import { useUsers, useStages } from '../../hooks/useQueries';
import { getUserDisplayName } from '../../types';
import { usersForOperationalEmployeeLists } from '../../utils/roles';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = {
  user: 'All',
  stage: 'All',
  leadType: 'All',
  timePeriod: 'All',
  dateFrom: '',
  dateTo: '',
  search: '',
};

export const ActivitiesFilterDrawer = () => {
  const {
    isActivitiesFilterDrawerOpen,
    setIsActivitiesFilterDrawerOpen,
    t,
    activityFilters,
    setActivityFilters,
    currentUser,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(activityFilters);

  const { data: usersData } = useUsers();
  const usersArray = Array.isArray(usersData) ? usersData : usersData?.results || [];

  const users = React.useMemo(
    () => usersForOperationalEmployeeLists(usersArray, currentUser ?? null),
    [usersArray, currentUser],
  );

  const { data: stagesData } = useStages();
  const stagesArray = Array.isArray(stagesData) ? stagesData : stagesData?.results || [];

  const syncDraft = useCallback(() => {
    setLocalFilters(activityFilters);
  }, [activityFilters]);

  const handleClose = () => {
    setLocalFilters(activityFilters);
    setIsActivitiesFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof ActivityFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_ACTIVITY_FILTERS);
    setActivityFilters(DEFAULT_ACTIVITY_FILTERS);
  };

  const handleApply = () => {
    setActivityFilters(localFilters);
    setIsActivitiesFilterDrawerOpen(false);
  };

  const stages: Array<TaskStage | 'All'> =
    stagesArray.length > 0
      ? (['All', ...stagesArray.map((s: any) => s.name || s.stage_name).filter(Boolean)] as Array<
          TaskStage | 'All'
        >)
      : [
          'All',
          'following',
          'meeting',
          'done_meeting',
          'whatsapp_pending',
          'no_answer',
          'out_of_service',
          'cancellation',
          'not_interested',
          'hold',
        ];
  const leadTypes: Array<'All' | 'Fresh' | 'Cold'> = ['All', 'Fresh', 'Cold'];
  const timePeriods: Array<'All' | 'today' | 'yesterday' | 'last7' | 'thisMonth'> = [
    'All',
    'today',
    'yesterday',
    'last7',
    'thisMonth',
  ];

  return (
    <FilterDrawerShell
      isOpen={isActivitiesFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterActivities')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('activityInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="activities-filter-user">{t('user')}</FilterLabel>
            <FilterSelect
              id="activities-filter-user"
              value={localFilters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
            >
              <option value="All">{t('allUsers')}</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id.toString()}>
                  {getUserDisplayName(user)}
                </option>
              )) || []}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="activities-filter-stage">{t('stage')}</FilterLabel>
            <FilterSelect
              id="activities-filter-stage"
              value={localFilters.stage}
              onChange={(e) => handleFilterChange('stage', e.target.value)}
            >
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage === 'All' ? t('all') : getStageDisplayLabel(stage as TaskStage)}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="activities-filter-lead-type">{t('leadType')}</FilterLabel>
            <FilterSelect
              id="activities-filter-lead-type"
              value={localFilters.leadType}
              onChange={(e) => handleFilterChange('leadType', e.target.value)}
            >
              {leadTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'All' ? t('all') : t((type.toLowerCase() + 'Lead') as any)}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="activities-filter-time-period">{t('timePeriod')}</FilterLabel>
            <FilterSelect
              id="activities-filter-time-period"
              value={localFilters.timePeriod}
              onChange={(e) => handleFilterChange('timePeriod', e.target.value)}
            >
              {timePeriods.map((period) => (
                <option key={period} value={period}>
                  {period === 'All' ? t('all') + ' ' + t('time') : t(period as any)}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>
      </FilterSection>

      <FilterSection title={t('dates')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="activities-filter-date-from">
              {t('activityDateFrom')} ({t('from')})
            </FilterLabel>
            <FilterInput
              id="activities-filter-date-from"
              type="date"
              value={localFilters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="activities-filter-date-to">
              {t('activityDateTo')} ({t('to')})
            </FilterLabel>
            <FilterInput
              id="activities-filter-date-to"
              type="date"
              value={localFilters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
