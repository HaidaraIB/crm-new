import React, { useCallback, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';
import {
  DEFAULT_ARRIVAL_FILTERS,
  DEFAULT_ARRIVAL_DRAWER_FILTERS,
} from '../../utils/arrivalFilters';
import type { ArrivalFilters } from '../../types';

export { DEFAULT_ARRIVAL_FILTERS };

/**
 * Arrivals board filters. Status stays in the toolbar chips and the customer search
 * in the page's search bar, so the drawer only owns the day and the scope.
 */
export const ArrivalsFilterDrawer: React.FC = () => {
  const {
    isArrivalsFilterDrawerOpen,
    setIsArrivalsFilterDrawerOpen,
    arrivalFilters,
    setArrivalFilters,
    t,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState<ArrivalFilters>(arrivalFilters);

  const syncDraft = useCallback(() => {
    setLocalFilters({ ...DEFAULT_ARRIVAL_FILTERS, ...arrivalFilters });
  }, [arrivalFilters]);

  // Status (toolbar) and search (search bar) are owned outside the drawer; Reset
  // and Apply must leave both exactly where the user put them.
  const handleReset = () => {
    setLocalFilters((prev) => ({ ...prev, ...DEFAULT_ARRIVAL_DRAWER_FILTERS }));
    setArrivalFilters((prev) => ({ ...prev, ...DEFAULT_ARRIVAL_DRAWER_FILTERS }));
  };

  const handleApply = () => {
    setArrivalFilters((prev) => ({
      ...prev,
      date: localFilters.date,
      mine: localFilters.mine,
    }));
    setIsArrivalsFilterDrawerOpen(false);
  };

  return (
    <FilterDrawerShell
      isOpen={isArrivalsFilterDrawerOpen}
      onClose={() => setIsArrivalsFilterDrawerOpen(false)}
      title={t('filterArrivals')}
      onReset={handleReset}
      onApply={handleApply}
      onOpen={syncDraft}
    >
      <FilterSection title={t('date')}>
        <FilterLabel htmlFor="arrivals-filter-date">{t('date')}</FilterLabel>
        <FilterInput
          id="arrivals-filter-date"
          type="date"
          value={localFilters.date}
          onChange={(e) => setLocalFilters((prev) => ({ ...prev, date: e.target.value }))}
        />
        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
          {t('arrivalDateFilterHint')}
        </p>
      </FilterSection>

      <FilterSection title={t('arrivalScope')}>
        <FilterLabel htmlFor="arrivals-filter-scope">{t('arrivalScope')}</FilterLabel>
        <FilterSelect
          id="arrivals-filter-scope"
          value={localFilters.mine ? 'mine' : 'All'}
          onChange={(e) =>
            setLocalFilters((prev) => ({ ...prev, mine: e.target.value === 'mine' }))
          }
        >
          <option value="All">{t('arrivalScopeAll')}</option>
          <option value="mine">{t('arrivalScopeMine')}</option>
        </FilterSelect>
        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
          {t('arrivalScopeMineHint')}
        </p>
      </FilterSection>
    </FilterDrawerShell>
  );
};
