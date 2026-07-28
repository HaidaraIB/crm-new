import React, { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useSuppliers } from '../../hooks/useQueries';
import type { SupplierFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

export const DEFAULT_SUPPLIER_FILTERS: SupplierFilters = {
  specialization: 'All',
  search: '',
};

export const SuppliersFilterDrawer = () => {
  const {
    isSupplierFilterDrawerOpen,
    setIsSupplierFilterDrawerOpen,
    t,
    supplierFilters,
    setSupplierFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(supplierFilters);

  const { data } = useSuppliers();
  const suppliers = Array.isArray(data) ? data : data?.results || [];

  const syncDraft = useCallback(() => {
    setLocalFilters(supplierFilters);
  }, [supplierFilters]);

  const handleClose = () => {
    setLocalFilters(supplierFilters);
    setIsSupplierFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof SupplierFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_SUPPLIER_FILTERS);
    setSupplierFilters(DEFAULT_SUPPLIER_FILTERS);
  };

  const handleApply = () => {
    setSupplierFilters(localFilters);
    setIsSupplierFilterDrawerOpen(false);
  };

  const uniqueSpecializations = useMemo(
    () =>
      Array.from(new Set<string>(
          suppliers
            .map((s: any) => s.specialization as string | undefined)
            .filter((spec): spec is string => Boolean(spec)),
        ),
      ),
    [suppliers],
  );

  return (
    <FilterDrawerShell
      isOpen={isSupplierFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterSuppliers')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('supplierInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="suppliers-filter-specialization">{t('specialization')}</FilterLabel>
            <FilterSelect
              id="suppliers-filter-specialization"
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
          <FilterLabel htmlFor="suppliers-filter-search">{t('searchByNameOrCode')}</FilterLabel>
          <FilterInput
            id="suppliers-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
