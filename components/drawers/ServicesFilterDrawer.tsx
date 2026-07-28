import React, { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useServices } from '../../hooks/useQueries';
import { NumberInput } from '../NumberInput';
import type { ServiceFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

export const DEFAULT_SERVICE_FILTERS: ServiceFilters = {
  category: 'All',
  provider: 'All',
  isActive: 'All',
  priceMin: '',
  priceMax: '',
  search: '',
};

export const ServicesFilterDrawer = () => {
  const {
    isServiceFilterDrawerOpen,
    setIsServiceFilterDrawerOpen,
    t,
    serviceFilters,
    setServiceFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(serviceFilters);

  const { data } = useServices();
  const services = Array.isArray(data) ? data : data?.results || [];

  const syncDraft = useCallback(() => {
    setLocalFilters(serviceFilters);
  }, [serviceFilters]);

  const handleClose = () => {
    setLocalFilters(serviceFilters);
    setIsServiceFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof ServiceFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_SERVICE_FILTERS);
    setServiceFilters(DEFAULT_SERVICE_FILTERS);
  };

  const handleApply = () => {
    setServiceFilters(localFilters);
    setIsServiceFilterDrawerOpen(false);
  };

  const uniqueCategories = useMemo(
    () =>
      Array.from(new Set<string>(
          services
            .map((s: any) => s.category as string | undefined)
            .filter((c): c is string => Boolean(c)),
        ),
      ),
    [services],
  );
  const uniqueProviders = useMemo(
    () =>
      Array.from(new Set<string>(
          services
            .map((s: any) => s.provider as string | undefined)
            .filter((p): p is string => Boolean(p)),
        ),
      ),
    [services],
  );

  return (
    <FilterDrawerShell
      isOpen={isServiceFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterServices')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('serviceInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="services-filter-category">{t('category')}</FilterLabel>
            <FilterSelect
              id="services-filter-category"
              value={localFilters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="services-filter-provider">{t('provider')}</FilterLabel>
            <FilterSelect
              id="services-filter-provider"
              value={localFilters.provider}
              onChange={(e) => handleFilterChange('provider', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="services-filter-status">{t('status')}</FilterLabel>
            <FilterSelect
              id="services-filter-status"
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
              <FilterLabel htmlFor="services-filter-price-min">{t('priceRangeStart')}</FilterLabel>
              <NumberInput
                id="services-filter-price-min"
                name="services-filter-price-min"
                value={localFilters.priceMin}
                onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                placeholder={t('eg500000')}
                min={0}
                step={1}
              />
            </div>
            <div>
              <FilterLabel htmlFor="services-filter-price-max">{t('priceRangeEnd')}</FilterLabel>
              <NumberInput
                id="services-filter-price-max"
                name="services-filter-price-max"
                value={localFilters.priceMax}
                onChange={(e) => handleFilterChange('priceMax', e.target.value)}
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
          <FilterLabel htmlFor="services-filter-search">{t('searchByNameOrCode')}</FilterLabel>
          <FilterInput
            id="services-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
