import React, { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useOwners } from '../../hooks/useQueries';
import type { OwnerFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

export const DEFAULT_OWNER_FILTERS: OwnerFilters = {
  city: 'All',
  district: 'All',
  search: '',
};

export const OwnersFilterDrawer = () => {
  const {
    isOwnerFilterDrawerOpen,
    setIsOwnerFilterDrawerOpen,
    t,
    ownerFilters,
    setOwnerFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(ownerFilters);

  const { data: ownersResponse } = useOwners();
  const owners = Array.isArray(ownersResponse)
    ? ownersResponse
    : ownersResponse?.results || [];

  const syncDraft = useCallback(() => {
    setLocalFilters(ownerFilters);
  }, [ownerFilters]);

  const handleClose = () => {
    setLocalFilters(ownerFilters);
    setIsOwnerFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof OwnerFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_OWNER_FILTERS);
    setOwnerFilters(DEFAULT_OWNER_FILTERS);
  };

  const handleApply = () => {
    setOwnerFilters(localFilters);
    setIsOwnerFilterDrawerOpen(false);
  };

  const uniqueCities = useMemo(
    () =>
      Array.from(new Set<string>(
          owners
            .map((o: any) => o.city as string | undefined)
            .filter((c): c is string => Boolean(c)),
        ),
      ),
    [owners],
  );
  const uniqueDistricts = useMemo(
    () =>
      Array.from(new Set<string>(
          owners
            .map((o: any) => o.district as string | undefined)
            .filter((d): d is string => Boolean(d)),
        ),
      ),
    [owners],
  );

  return (
    <FilterDrawerShell
      isOpen={isOwnerFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterOwners')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('ownerInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="owners-filter-city">{t('city')}</FilterLabel>
            <FilterSelect
              id="owners-filter-city"
              value={localFilters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="owners-filter-district">{t('district')}</FilterLabel>
            <FilterSelect
              id="owners-filter-district"
              value={localFilters.district}
              onChange={(e) => handleFilterChange('district', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueDistricts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>
      </FilterSection>

      <FilterSection title={t('search')}>
        <div className="pt-2">
          <FilterLabel htmlFor="owners-filter-search">{t('searchByNameOrCode')}</FilterLabel>
          <FilterInput
            id="owners-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
