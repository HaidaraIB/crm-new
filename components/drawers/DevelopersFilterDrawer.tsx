import React, { useCallback, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { DeveloperFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterInput,
} from '../filters';

export const DEFAULT_DEVELOPER_FILTERS: DeveloperFilters = {
  search: '',
};

export const DevelopersFilterDrawer = () => {
  const {
    isDeveloperFilterDrawerOpen,
    setIsDeveloperFilterDrawerOpen,
    t,
    developerFilters,
    setDeveloperFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(developerFilters);

  const syncDraft = useCallback(() => {
    setLocalFilters(developerFilters);
  }, [developerFilters]);

  const handleClose = () => {
    setLocalFilters(developerFilters);
    setIsDeveloperFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof DeveloperFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_DEVELOPER_FILTERS);
    setDeveloperFilters(DEFAULT_DEVELOPER_FILTERS);
  };

  const handleApply = () => {
    setDeveloperFilters(localFilters);
    setIsDeveloperFilterDrawerOpen(false);
  };

  return (
    <FilterDrawerShell
      isOpen={isDeveloperFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterDevelopers')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('search')}>
        <div className="pt-2">
          <FilterLabel htmlFor="developers-filter-search">{t('searchByNameOrCode')}</FilterLabel>
          <FilterInput
            id="developers-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
