import React, { useCallback, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { EmployeesReportFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

export const DEFAULT_EMPLOYEES_REPORT_FILTERS: EmployeesReportFilters = {
  leadType: 'all',
  startDate: '',
  endDate: '',
};

export const EmployeesReportFilterDrawer = () => {
  const {
    isEmployeesReportFilterDrawerOpen,
    setIsEmployeesReportFilterDrawerOpen,
    t,
    employeesReportFilters,
    setEmployeesReportFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(employeesReportFilters);

  const syncDraft = useCallback(() => {
    setLocalFilters(employeesReportFilters);
  }, [employeesReportFilters]);

  const handleClose = () => {
    setLocalFilters(employeesReportFilters);
    setIsEmployeesReportFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof EmployeesReportFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_EMPLOYEES_REPORT_FILTERS);
    setEmployeesReportFilters(DEFAULT_EMPLOYEES_REPORT_FILTERS);
  };

  const handleApply = () => {
    setEmployeesReportFilters(localFilters);
    setIsEmployeesReportFilterDrawerOpen(false);
  };

  return (
    <FilterDrawerShell
      isOpen={isEmployeesReportFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterEmployeesReport')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('reportInfo')}>
        <div className="space-y-3">
          <div>
            <FilterLabel htmlFor="employees-report-filter-lead-type">{t('leadType')}</FilterLabel>
            <FilterSelect
              id="employees-report-filter-lead-type"
              value={localFilters.leadType}
              onChange={(e) => handleFilterChange('leadType', e.target.value)}
            >
              <option value="all">{t('allLeadsType')}</option>
              <option value="fresh">{t('freshLeads')}</option>
              <option value="cold">{t('coldLeads')}</option>
            </FilterSelect>
          </div>
          <div>
            <FilterLabel htmlFor="employees-report-filter-start-date">{t('startDate')}</FilterLabel>
            <FilterInput
              id="employees-report-filter-start-date"
              type="date"
              value={localFilters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="employees-report-filter-end-date">{t('endDate')}</FilterLabel>
            <FilterInput
              id="employees-report-filter-end-date"
              type="date"
              value={localFilters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
