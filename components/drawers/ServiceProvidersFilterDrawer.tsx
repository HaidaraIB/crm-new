import React, { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useServiceProviders } from '../../hooks/useQueries';
import type { ServiceProviderFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

export const DEFAULT_SERVICE_PROVIDER_FILTERS: ServiceProviderFilters = {
  specialization: 'All',
  search: '',
};

export const ServiceProvidersFilterDrawer = () => {
  const {
    isServiceProviderFilterDrawerOpen,
    setIsServiceProviderFilterDrawerOpen,
    t,
    serviceProviderFilters,
    setServiceProviderFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(serviceProviderFilters);

  const { data } = useServiceProviders();
  const serviceProviders = Array.isArray(data) ? data : data?.results || [];

  const syncDraft = useCallback(() => {
    setLocalFilters(serviceProviderFilters);
  }, [serviceProviderFilters]);

  const handleClose = () => {
    setLocalFilters(serviceProviderFilters);
    setIsServiceProviderFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof ServiceProviderFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_SERVICE_PROVIDER_FILTERS);
    setServiceProviderFilters(DEFAULT_SERVICE_PROVIDER_FILTERS);
  };

  const handleApply = () => {
    setServiceProviderFilters(localFilters);
    setIsServiceProviderFilterDrawerOpen(false);
  };

  const uniqueSpecializations = useMemo(
    () =>
      Array.from(new Set<string>(
          serviceProviders
            .map((sp: any) => sp.specialization as string | undefined)
            .filter((spec): spec is string => Boolean(spec)),
        ),
      ),
    [serviceProviders],
  );

  return (
    <FilterDrawerShell
      isOpen={isServiceProviderFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterServiceProviders')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('providerInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="service-providers-filter-specialization">
              {t('specialization')}
            </FilterLabel>
            <FilterSelect
              id="service-providers-filter-specialization"
              value={localFilters.specialization}
              onChange={(e) => handleFilterChange('specialization', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueSpecializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>
      </FilterSection>

      <FilterSection title={t('search')}>
        <div className="pt-2">
          <FilterLabel htmlFor="service-providers-filter-search">{t('searchByNameOrCode')}</FilterLabel>
          <FilterInput
            id="service-providers-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
