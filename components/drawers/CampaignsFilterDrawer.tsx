import React, { useCallback, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { NumberInput } from '../NumberInput';
import type { CampaignFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

export const DEFAULT_CAMPAIGN_FILTERS: CampaignFilters = {
  isActive: 'All',
  budgetMin: '',
  budgetMax: '',
  createdAtFrom: '',
  createdAtTo: '',
  search: '',
};

export const CampaignsFilterDrawer = () => {
  const {
    isCampaignsFilterDrawerOpen,
    setIsCampaignsFilterDrawerOpen,
    t,
    campaignFilters,
    setCampaignFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(campaignFilters);

  const syncDraft = useCallback(() => {
    setLocalFilters(campaignFilters);
  }, [campaignFilters]);

  const handleClose = () => {
    setLocalFilters(campaignFilters);
    setIsCampaignsFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof CampaignFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_CAMPAIGN_FILTERS);
    setCampaignFilters(DEFAULT_CAMPAIGN_FILTERS);
  };

  const handleApply = () => {
    setCampaignFilters(localFilters);
    setIsCampaignsFilterDrawerOpen(false);
  };

  return (
    <FilterDrawerShell
      isOpen={isCampaignsFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterCampaigns')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('campaignInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="campaigns-filter-status">{t('status')}</FilterLabel>
            <FilterSelect
              id="campaigns-filter-status"
              value={localFilters.isActive}
              onChange={(e) => handleFilterChange('isActive', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              <option value="true">{t('active')}</option>
              <option value="false">{t('inactive')}</option>
            </FilterSelect>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FilterLabel htmlFor="campaigns-filter-budget-min">{t('budgetRangeStart')}</FilterLabel>
              <NumberInput
                id="campaigns-filter-budget-min"
                name="campaigns-filter-budget-min"
                value={localFilters.budgetMin}
                onChange={(e) => handleFilterChange('budgetMin', e.target.value)}
                placeholder={t('eg500000')}
                min={0}
                step={1}
              />
            </div>
            <div>
              <FilterLabel htmlFor="campaigns-filter-budget-max">{t('budgetRangeEnd')}</FilterLabel>
              <NumberInput
                id="campaigns-filter-budget-max"
                name="campaigns-filter-budget-max"
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

      <FilterSection title={t('dates')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="campaigns-filter-created-from">
              {t('campaignCreatedAtFrom')} ({t('from')})
            </FilterLabel>
            <FilterInput
              id="campaigns-filter-created-from"
              type="date"
              value={localFilters.createdAtFrom}
              onChange={(e) => handleFilterChange('createdAtFrom', e.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="campaigns-filter-created-to">
              {t('campaignCreatedAtTo')} ({t('to')})
            </FilterLabel>
            <FilterInput
              id="campaigns-filter-created-to"
              type="date"
              value={localFilters.createdAtTo}
              onChange={(e) => handleFilterChange('createdAtTo', e.target.value)}
            />
          </div>
        </div>
      </FilterSection>

      <FilterSection title={t('search')}>
        <div className="pt-2">
          <FilterLabel htmlFor="campaigns-filter-search">{t('searchByNameOrCode')}</FilterLabel>
          <FilterInput
            id="campaigns-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
