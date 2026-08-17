import React, { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { NumberInput } from '../NumberInput';
import {
  useChannels,
  useStatuses,
  useTags,
  useCampaigns,
  useUsers,
  useDevelopers,
  useProjects,
} from '../../hooks/useQueries';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';
import { TagMultiSelect } from '../leads/TagMultiSelect';
import type { LeadFilters, Tag } from '../../types';
import { getUserDisplayName } from '../../types';
import { usersForOperationalEmployeeLists } from '../../utils/roles';

export const DEFAULT_LEAD_FILTERS: LeadFilters = {
  status: 'All',
  type: 'All',
  priority: 'All',
  assignedTo: 'All',
  communicationWay: 'All',
  tags: [],
  budgetMin: '',
  budgetMax: '',
  createdAtFrom: '',
  createdAtTo: '',
  search: '',
  source: 'All',
  campaign: 'All',
  createdBy: 'All',
  interestedDeveloper: 'All',
  interestedProject: 'All',
  lastContactedFrom: '',
  lastContactedTo: '',
};

const LEAD_SOURCES = [
  'manual',
  'meta_lead_form',
  'whatsapp',
  'tiktok',
  'api',
  'mujeb',
  'other',
] as const;

const sourceLabelKey = (source: string): string => {
  switch (source) {
    case 'meta_lead_form':
      return 'metaLeadForm';
    case 'whatsapp':
      return 'whatsappSource';
    case 'tiktok':
      return 'tiktokSource';
    case 'api':
      return 'leadApiSource';
    case 'mujeb':
      return 'mujebSource';
    case 'manual':
      return 'manualSource';
    case 'other':
      return 'otherSource';
    default:
      return source;
  }
};

export const FilterDrawer = () => {
  const {
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
    t,
    leadFilters,
    setLeadFilters,
    currentUser,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(leadFilters);
  const isRealEstate = currentUser?.company?.specialization === 'real_estate';

  const { data: channelsResponse } = useChannels();
  const channels = Array.isArray(channelsResponse)
    ? channelsResponse
    : channelsResponse?.results || [];

  const { data: statusesResponse } = useStatuses();
  const statuses = Array.isArray(statusesResponse)
    ? statusesResponse
    : statusesResponse?.results || [];

  const { data: tagsResponse } = useTags();
  const tags: Tag[] = Array.isArray(tagsResponse)
    ? tagsResponse
    : tagsResponse?.results || [];

  const { data: campaignsResponse } = useCampaigns();
  const campaigns = Array.isArray(campaignsResponse)
    ? campaignsResponse
    : campaignsResponse?.results || [];

  const { data: usersResponse } = useUsers();
  const usersArray = Array.isArray(usersResponse)
    ? usersResponse
    : usersResponse?.results || [];
  const userOptions = useMemo(
    () => usersForOperationalEmployeeLists(usersArray, currentUser ?? null),
    [usersArray, currentUser],
  );

  const { data: developersResponse } = useDevelopers();
  const developers = Array.isArray(developersResponse)
    ? developersResponse
    : developersResponse?.results || [];

  const { data: projectsResponse } = useProjects();
  const projects = Array.isArray(projectsResponse)
    ? projectsResponse
    : projectsResponse?.results || [];

  const syncDraft = useCallback(() => {
    setLocalFilters({ ...DEFAULT_LEAD_FILTERS, ...leadFilters });
  }, [leadFilters]);

  const handleClose = () => {
    setLocalFilters({ ...DEFAULT_LEAD_FILTERS, ...leadFilters });
    setIsFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof LeadFilters, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'interestedDeveloper'
        ? { interestedProject: 'All' }
        : {}),
    }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_LEAD_FILTERS);
    setLeadFilters(DEFAULT_LEAD_FILTERS);
  };

  const handleApply = () => {
    // Assignee is owned by the toolbar AssigneeFilter — keep committed assignee
    setLeadFilters({ ...localFilters, assignedTo: leadFilters.assignedTo });
    setIsFilterDrawerOpen(false);
  };

  const leadStatuses = useMemo(() => {
    if (statuses && statuses.length > 0) {
      const statusNames = statuses.filter((s) => !s.isHidden).map((s) => s.name as string);
      return ['All', ...statusNames];
    }
    return ['All'];
  }, [statuses]);

  const leadTypes: Array<'All' | 'Fresh' | 'Hot' | 'Cold' | 'Rotated'> = [
    'All',
    'Fresh',
    'Hot',
    'Cold',
    'Rotated',
  ];
  const priorities: Array<'All' | 'High' | 'Medium' | 'Low'> = ['All', 'High', 'Medium', 'Low'];

  const communicationWays = useMemo(() => {
    if (channels && channels.length > 0) {
      return ['All', ...channels.map((c) => c.name as string)];
    }
    return ['All'];
  }, [channels]);

  const filteredProjects = useMemo(() => {
    if (localFilters.interestedDeveloper === 'All') return projects;
    const devId = Number(localFilters.interestedDeveloper);
    return projects.filter((p: any) => {
      const developer = p.developer;
      if (typeof developer === 'number') return developer === devId;
      if (developer && typeof developer === 'object') return Number(developer.id) === devId;
      return false;
    });
  }, [projects, localFilters.interestedDeveloper]);

  return (
    <FilterDrawerShell
      isOpen={isFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterLeads')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('leadInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="leads-filter-search">{t('searchLeadsByNameOrPhone')}</FilterLabel>
            <FilterInput
              id="leads-filter-search"
              type="search"
              placeholder={t('searchLeadsByNameOrPhone')}
              value={localFilters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="leads-filter-status">{t('status')}</FilterLabel>
            <FilterSelect
              id="leads-filter-status"
              value={localFilters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              {leadStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'All' ? t('all') : t(status.replace(' ', '').toLowerCase() as any) || status}
                </option>
              ))}
            </FilterSelect>
          </div>

          {tags.length > 0 && (
            <div>
              <FilterLabel htmlFor="leads-filter-tags">{t('tags')}</FilterLabel>
              <TagMultiSelect
                id="leads-filter-tags"
                tags={tags}
                value={localFilters.tags.map(Number).filter((n) => !Number.isNaN(n))}
                onChange={(next) =>
                  setLocalFilters((prev) => ({ ...prev, tags: next.map(String) }))
                }
                placeholder={t('all')}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('tagsFilterAnyHint')}</p>
            </div>
          )}

          <div>
            <FilterLabel htmlFor="leads-filter-type">{t('type')}</FilterLabel>
            <FilterSelect
              id="leads-filter-type"
              value={localFilters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              {leadTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'All' ? t('all') : t(type.toLowerCase() as any) || type}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="leads-filter-priority">{t('priority')}</FilterLabel>
            <FilterSelect
              id="leads-filter-priority"
              value={localFilters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority === 'All' ? t('all') : t(priority.toLowerCase() as any) || priority}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="leads-filter-source">{t('source')}</FilterLabel>
            <FilterSelect
              id="leads-filter-source"
              value={localFilters.source || 'All'}
              onChange={(e) => handleFilterChange('source', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {LEAD_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {t(sourceLabelKey(source) as any) || source}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="leads-filter-campaign">{t('campaign')}</FilterLabel>
            <FilterSelect
              id="leads-filter-campaign"
              value={localFilters.campaign || 'All'}
              onChange={(e) => handleFilterChange('campaign', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              <option value="None">{t('noCampaign')}</option>
              {campaigns.map((c: any) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name || c.code || c.id}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="leads-filter-communication">{t('communicationWay')}</FilterLabel>
            <FilterSelect
              id="leads-filter-communication"
              value={localFilters.communicationWay}
              onChange={(e) => handleFilterChange('communicationWay', e.target.value)}
            >
              {communicationWays.map((way) => (
                <option key={way} value={way}>
                  {way === 'All' ? t('all') : way}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="leads-filter-created-by">{t('createdBy')}</FilterLabel>
            <FilterSelect
              id="leads-filter-created-by"
              value={localFilters.createdBy || 'All'}
              onChange={(e) => handleFilterChange('createdBy', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              <option value="None">{t('createdBySystem')}</option>
              {userOptions.map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {getUserDisplayName(user)}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FilterLabel htmlFor="leads-filter-budget-min">{t('budgetRangeStart')}</FilterLabel>
              <NumberInput
                id="leads-filter-budget-min"
                name="leads-filter-budget-min"
                value={localFilters.budgetMin}
                onChange={(e) => handleFilterChange('budgetMin', e.target.value)}
                placeholder={t('eg500000')}
                min={0}
                step={1}
              />
            </div>
            <div>
              <FilterLabel htmlFor="leads-filter-budget-max">{t('budgetRangeEnd')}</FilterLabel>
              <NumberInput
                id="leads-filter-budget-max"
                name="leads-filter-budget-max"
                value={localFilters.budgetMax}
                onChange={(e) => handleFilterChange('budgetMax', e.target.value)}
                placeholder={t('eg1000000')}
                min={0}
                step={1}
              />
            </div>
          </div>
        </div>
      </FilterSection>

      {isRealEstate && (
        <FilterSection title={t('interestedDeveloper')}>
          <div className="space-y-4 pt-2">
            <div>
              <FilterLabel htmlFor="leads-filter-developer">{t('interestedDeveloper')}</FilterLabel>
              <FilterSelect
                id="leads-filter-developer"
                value={localFilters.interestedDeveloper || 'All'}
                onChange={(e) => handleFilterChange('interestedDeveloper', e.target.value)}
              >
                <option value="All">{t('all')}</option>
                {developers.map((d: any) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div>
              <FilterLabel htmlFor="leads-filter-project">{t('interestedProject')}</FilterLabel>
              <FilterSelect
                id="leads-filter-project"
                value={localFilters.interestedProject || 'All'}
                onChange={(e) => handleFilterChange('interestedProject', e.target.value)}
              >
                <option value="All">{t('all')}</option>
                {filteredProjects.map((p: any) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </FilterSelect>
            </div>
          </div>
        </FilterSection>
      )}

      <FilterSection title={t('dates')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="leads-filter-date-from">
              {t('leadCreatedAtRange')} ({t('from')})
            </FilterLabel>
            <FilterInput
              id="leads-filter-date-from"
              type="date"
              value={localFilters.createdAtFrom}
              onChange={(e) => handleFilterChange('createdAtFrom', e.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="leads-filter-date-to">
              {t('leadCreatedAtRange')} ({t('to')})
            </FilterLabel>
            <FilterInput
              id="leads-filter-date-to"
              type="date"
              value={localFilters.createdAtTo}
              onChange={(e) => handleFilterChange('createdAtTo', e.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="leads-filter-contacted-from">
              {t('lastContactedAtRange')} ({t('from')})
            </FilterLabel>
            <FilterInput
              id="leads-filter-contacted-from"
              type="date"
              value={localFilters.lastContactedFrom || ''}
              onChange={(e) => handleFilterChange('lastContactedFrom', e.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="leads-filter-contacted-to">
              {t('lastContactedAtRange')} ({t('to')})
            </FilterLabel>
            <FilterInput
              id="leads-filter-contacted-to"
              type="date"
              value={localFilters.lastContactedTo || ''}
              onChange={(e) => handleFilterChange('lastContactedTo', e.target.value)}
            />
          </div>
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
