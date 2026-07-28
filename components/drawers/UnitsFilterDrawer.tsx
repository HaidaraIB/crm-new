import React, { useCallback, useMemo, useState } from 'react';
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
import type { Unit, UnitFilters } from '../../types';

export const DEFAULT_UNIT_FILTERS: UnitFilters = {
  project: 'All',
  type: 'All',
  finishing: 'All',
  city: 'All',
  district: 'All',
  zone: 'All',
  isSold: 'All',
  bedrooms: 'All',
  bathrooms: 'All',
  priceMin: '',
  priceMax: '',
  search: '',
};

export const UnitsFilterDrawer = () => {
  const { isUnitsFilterDrawerOpen, setIsUnitsFilterDrawerOpen, t, unitFilters, setUnitFilters } =
    useAppContext();
  const [localFilters, setLocalFilters] = useState(unitFilters);

  const { data: projectsResponse } = useProjects();
  const projects = projectsResponse?.results || [];

  // Options for client-only fields — unfiltered list (no page filters)
  const { data: unitsResponse } = useUnits(undefined);
  const units: Unit[] = unitsResponse?.results ?? [];

  const syncDraft = useCallback(() => {
    setLocalFilters(unitFilters);
  }, [unitFilters]);

  const handleClose = () => {
    setLocalFilters(unitFilters);
    setIsUnitsFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof UnitFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_UNIT_FILTERS);
    setUnitFilters(DEFAULT_UNIT_FILTERS);
  };

  const handleApply = () => {
    setUnitFilters(localFilters);
    setIsUnitsFilterDrawerOpen(false);
  };

  const uniqueTypes = useMemo(
    () =>
      Array.from(
        new Set(
          (units || [])
            .map((u) => u.type)
            .filter((type) => type && type !== '-' && type.trim() !== ''),
        ),
      ).sort(),
    [units],
  );
  const uniqueFinishing = useMemo(
    () =>
      Array.from(
        new Set(
          (units || [])
            .map((u) => u.finishing)
            .filter((f) => f && f !== '-' && f.trim() !== ''),
        ),
      ).sort(),
    [units],
  );
  const uniqueCities = useMemo(
    () =>
      Array.from(
        new Set(
          (units || []).map((u) => u.city).filter((c) => c && c !== '-' && c.trim() !== ''),
        ),
      ).sort(),
    [units],
  );
  const uniqueDistricts = useMemo(
    () =>
      Array.from(
        new Set(
          (units || [])
            .map((u) => u.district)
            .filter((d) => d && d !== '-' && d.trim() !== ''),
        ),
      ).sort(),
    [units],
  );
  const uniqueZones = useMemo(
    () =>
      Array.from(
        new Set(
          (units || []).map((u) => u.zone).filter((z) => z && z !== '-' && z.trim() !== ''),
        ),
      ).sort(),
    [units],
  );
  const uniqueBedrooms = useMemo(
    () =>
      Array.from(
        new Set(
          (units || [])
            .map((u) => u.bedrooms)
            .filter((b) => b !== null && b !== undefined),
        ),
      ).sort((a, b) => Number(a) - Number(b)),
    [units],
  );
  const uniqueBathrooms = useMemo(
    () =>
      Array.from(
        new Set(
          (units || [])
            .map((u) => u.bathrooms)
            .filter((b) => b !== null && b !== undefined),
        ),
      ).sort((a, b) => Number(a) - Number(b)),
    [units],
  );

  return (
    <FilterDrawerShell
      isOpen={isUnitsFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterUnits')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('unitInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="units-filter-project">{t('project')}</FilterLabel>
            <FilterSelect
              id="units-filter-project"
              value={localFilters.project}
              onChange={(e) => handleFilterChange('project', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {projects.map((proj: any) => (
                <option key={proj.id} value={String(proj.id)}>
                  {proj.name}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="units-filter-type">{t('type')}</FilterLabel>
            <FilterSelect
              id="units-filter-type"
              value={localFilters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {t(String(type).toLowerCase() as any) || type}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="units-filter-finishing">{t('finishing')}</FilterLabel>
            <FilterSelect
              id="units-filter-finishing"
              value={localFilters.finishing}
              onChange={(e) => handleFilterChange('finishing', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueFinishing.map((finishing) => (
                <option key={finishing} value={finishing}>
                  {String(finishing).toLowerCase().includes('semi')
                    ? t('semiFinished')
                    : t(String(finishing).toLowerCase() as any) || finishing}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="units-filter-city">{t('city')}</FilterLabel>
            <FilterSelect
              id="units-filter-city"
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
            <FilterLabel htmlFor="units-filter-district">{t('district')}</FilterLabel>
            <FilterSelect
              id="units-filter-district"
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

          <div>
            <FilterLabel htmlFor="units-filter-zone">{t('zone')}</FilterLabel>
            <FilterSelect
              id="units-filter-zone"
              value={localFilters.zone}
              onChange={(e) => handleFilterChange('zone', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="units-filter-sold">{t('status')}</FilterLabel>
            <FilterSelect
              id="units-filter-sold"
              value={localFilters.isSold}
              onChange={(e) => handleFilterChange('isSold', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              <option value="false">{t('available')}</option>
              <option value="true">{t('sold')}</option>
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="units-filter-bedrooms">{t('bedrooms')}</FilterLabel>
            <FilterSelect
              id="units-filter-bedrooms"
              value={localFilters.bedrooms}
              onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueBedrooms.map((bedrooms) => (
                <option key={String(bedrooms)} value={String(bedrooms)}>
                  {bedrooms}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="units-filter-bathrooms">{t('bathrooms')}</FilterLabel>
            <FilterSelect
              id="units-filter-bathrooms"
              value={localFilters.bathrooms}
              onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueBathrooms.map((bathrooms) => (
                <option key={String(bathrooms)} value={String(bathrooms)}>
                  {bathrooms}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FilterLabel htmlFor="units-filter-price-min">{t('priceRangeStart')}</FilterLabel>
              <NumberInput
                id="units-filter-price-min"
                name="units-filter-price-min"
                value={localFilters.priceMin}
                onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                placeholder={t('eg500000')}
                min={0}
                step={1}
              />
            </div>
            <div>
              <FilterLabel htmlFor="units-filter-price-max">{t('priceRangeEnd')}</FilterLabel>
              <NumberInput
                id="units-filter-price-max"
                name="units-filter-price-max"
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
          <FilterLabel htmlFor="units-filter-search">{t('searchByNameOrCode')}</FilterLabel>
          <FilterInput
            id="units-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
