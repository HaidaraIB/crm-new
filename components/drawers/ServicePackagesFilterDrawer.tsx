import React, { useCallback, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { NumberInput } from '../NumberInput';
import type { ServicePackageFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

export const DEFAULT_SERVICE_PACKAGE_FILTERS: ServicePackageFilters = {
  isActive: 'All',
  priceMin: '',
  priceMax: '',
  search: '',
};

export const ServicePackagesFilterDrawer = () => {
  const {
    isServicePackageFilterDrawerOpen,
    setIsServicePackageFilterDrawerOpen,
    t,
    servicePackageFilters,
    setServicePackageFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(servicePackageFilters);

  const syncDraft = useCallback(() => {
    setLocalFilters(servicePackageFilters);
  }, [servicePackageFilters]);

  const handleClose = () => {
    setLocalFilters(servicePackageFilters);
    setIsServicePackageFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof ServicePackageFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_SERVICE_PACKAGE_FILTERS);
    setServicePackageFilters(DEFAULT_SERVICE_PACKAGE_FILTERS);
  };

  const handleApply = () => {
    setServicePackageFilters(localFilters);
    setIsServicePackageFilterDrawerOpen(false);
  };

  return (
    <FilterDrawerShell
      isOpen={isServicePackageFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterServicePackages')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('packageInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="service-packages-filter-status">{t('status')}</FilterLabel>
            <FilterSelect
              id="service-packages-filter-status"
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
              <FilterLabel htmlFor="service-packages-filter-price-min">{t('priceRangeStart')}</FilterLabel>
              <NumberInput
                id="service-packages-filter-price-min"
                name="service-packages-filter-price-min"
                value={localFilters.priceMin}
                onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                placeholder={t('eg500000')}
                min={0}
                step={1}
              />
            </div>
            <div>
              <FilterLabel htmlFor="service-packages-filter-price-max">{t('priceRangeEnd')}</FilterLabel>
              <NumberInput
                id="service-packages-filter-price-max"
                name="service-packages-filter-price-max"
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
          <FilterLabel htmlFor="service-packages-filter-search">{t('searchByNameOrCode')}</FilterLabel>
          <FilterInput
            id="service-packages-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
