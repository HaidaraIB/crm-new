import React, { useCallback, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { NumberInput } from '../NumberInput';
import { useProjects, useUnits } from '../../hooks/useQueries';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';
import type { DealFilters } from '../../types';

export const DEFAULT_DEAL_FILTERS: DealFilters = {
  status: 'All',
  paymentMethod: 'All',
  unit: 'All',
  project: 'All',
  valueMin: '',
  valueMax: '',
  search: '',
};

const DEAL_STATUSES = ['reservation', 'contracted', 'closed'] as const;
const PAYMENT_METHODS = ['cash', 'installment'] as const;

export const DealsFilterDrawer = () => {
  const {
    isDealsFilterDrawerOpen,
    setIsDealsFilterDrawerOpen,
    t,
    currentUser,
    dealFilters,
    setDealFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(dealFilters);
  const isRealEstate = currentUser?.company?.specialization === 'real_estate';

  const { data: projectsResponse } = useProjects();
  const projects = projectsResponse?.results || [];

  const { data: unitsResponse } = useUnits();
  const units = unitsResponse?.results || [];

  const syncDraft = useCallback(() => {
    setLocalFilters(dealFilters);
  }, [dealFilters]);

  const handleClose = () => {
    setLocalFilters(dealFilters);
    setIsDealsFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof DealFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_DEAL_FILTERS);
    setDealFilters(DEFAULT_DEAL_FILTERS);
  };

  const handleApply = () => {
    setDealFilters(localFilters);
    setIsDealsFilterDrawerOpen(false);
  };

  return (
    <FilterDrawerShell
      isOpen={isDealsFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterDeals')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('dealInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="deals-filter-status">{t('status')}</FilterLabel>
            <FilterSelect
              id="deals-filter-status"
              value={localFilters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {DEAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(status as any) || status}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="deals-filter-payment">{t('paymentMethod')}</FilterLabel>
            <FilterSelect
              id="deals-filter-payment"
              value={localFilters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {t(method as any) || method}
                </option>
              ))}
            </FilterSelect>
          </div>

          {isRealEstate && (
            <>
              <div>
                <FilterLabel htmlFor="deals-filter-project">{t('project')}</FilterLabel>
                <FilterSelect
                  id="deals-filter-project"
                  value={localFilters.project}
                  onChange={(e) => handleFilterChange('project', e.target.value)}
                >
                  <option value="All">{t('all')}</option>
                  {projects.map((project: any) => (
                    <option key={project.id} value={project.name}>
                      {project.name}
                    </option>
                  ))}
                </FilterSelect>
              </div>

              <div>
                <FilterLabel htmlFor="deals-filter-unit">{t('unit')}</FilterLabel>
                <FilterSelect
                  id="deals-filter-unit"
                  value={localFilters.unit}
                  onChange={(e) => handleFilterChange('unit', e.target.value)}
                >
                  <option value="All">{t('all')}</option>
                  {units.map((unit: any) => {
                    const code = unit.code || String(unit.id);
                    return (
                      <option key={unit.id} value={code}>
                        {code}
                      </option>
                    );
                  })}
                </FilterSelect>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FilterLabel htmlFor="deals-filter-value-min">{t('valueRangeStart')}</FilterLabel>
              <NumberInput
                id="deals-filter-value-min"
                name="deals-filter-value-min"
                value={localFilters.valueMin}
                onChange={(e) => handleFilterChange('valueMin', e.target.value)}
                placeholder={t('eg500000')}
                min={0}
                step={1}
              />
            </div>
            <div>
              <FilterLabel htmlFor="deals-filter-value-max">{t('valueRangeEnd')}</FilterLabel>
              <NumberInput
                id="deals-filter-value-max"
                name="deals-filter-value-max"
                value={localFilters.valueMax}
                onChange={(e) => handleFilterChange('valueMax', e.target.value)}
                placeholder={t('eg1000000')}
                min={0}
                step={1}
              />
            </div>
          </div>
        </div>
      </FilterSection>

      <FilterSection title={t('search')}>
        <div className="pt-2">
          <FilterLabel htmlFor="deals-filter-search">{t('searchByClientNameOrId')}</FilterLabel>
          <FilterInput
            id="deals-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
