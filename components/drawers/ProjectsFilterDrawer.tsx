import React, { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useDevelopers, useProjects } from '../../hooks/useQueries';
import type { ProjectFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

export const DEFAULT_PROJECT_FILTERS: ProjectFilters = {
  developer: 'All',
  type: 'All',
  city: 'All',
  paymentMethod: 'All',
  search: '',
};

export const ProjectsFilterDrawer = () => {
  const {
    isProjectFilterDrawerOpen,
    setIsProjectFilterDrawerOpen,
    t,
    projectFilters,
    setProjectFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(projectFilters);

  const { data: developersResponse } = useDevelopers();
  const developers = Array.isArray(developersResponse)
    ? developersResponse
    : developersResponse?.results || [];

  const { data: projectsResponse } = useProjects();
  const projects = Array.isArray(projectsResponse)
    ? projectsResponse
    : projectsResponse?.results || [];

  const syncDraft = useCallback(() => {
    setLocalFilters(projectFilters);
  }, [projectFilters]);

  const handleClose = () => {
    setLocalFilters(projectFilters);
    setIsProjectFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof ProjectFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_PROJECT_FILTERS);
    setProjectFilters(DEFAULT_PROJECT_FILTERS);
  };

  const handleApply = () => {
    setProjectFilters(localFilters);
    setIsProjectFilterDrawerOpen(false);
  };

  const uniqueTypes = useMemo(
    () =>
      Array.from(new Set<string>(
          projects
            .map((p: any) => p.type as string | undefined)
            .filter((type): type is string => Boolean(type) && type !== '-' && type.trim() !== ''),
        ),
      ).sort(),
    [projects],
  );
  const uniqueCities = useMemo(
    () =>
      Array.from(new Set<string>(
          projects
            .map((p: any) => p.city as string | undefined)
            .filter((city): city is string => Boolean(city) && city !== '-' && city.trim() !== ''),
        ),
      ).sort(),
    [projects],
  );
  const uniquePaymentMethods = useMemo(
    () =>
      Array.from(new Set<string>(
          projects
            .map((p: any) => p.paymentMethod as string | undefined)
            .filter(
              (method): method is string =>
                Boolean(method) && method !== '-' && method.trim() !== '',
            ),
        ),
      ).sort(),
    [projects],
  );

  const translateType = (type: string): string => {
    if (!type) return type;
    const typeLower = type.toLowerCase();
    if (typeLower === 'apartment') return t('apartment');
    if (typeLower === 'villa') return t('villa');
    return type;
  };

  const translatePaymentMethod = (method: string): string => {
    if (!method) return method;
    const methodLower = method.toLowerCase();
    if (methodLower === 'cash') return t('cash');
    if (methodLower === 'installment') return t('installment');
    return method;
  };

  return (
    <FilterDrawerShell
      isOpen={isProjectFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterProjects')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('projectInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="projects-filter-developer">{t('developer')}</FilterLabel>
            <FilterSelect
              id="projects-filter-developer"
              value={localFilters.developer}
              onChange={(e) => handleFilterChange('developer', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {developers?.map((dev) => (
                <option key={dev.id} value={dev.name}>
                  {dev.name}
                </option>
              )) || []}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="projects-filter-type">{t('type')}</FilterLabel>
            <FilterSelect
              id="projects-filter-type"
              value={localFilters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {translateType(type)}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="projects-filter-city">{t('city')}</FilterLabel>
            <FilterSelect
              id="projects-filter-city"
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
            <FilterLabel htmlFor="projects-filter-payment">{t('paymentMethod')}</FilterLabel>
            <FilterSelect
              id="projects-filter-payment"
              value={localFilters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniquePaymentMethods.map((method) => (
                <option key={method} value={method}>
                  {translatePaymentMethod(method)}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>
      </FilterSection>

      <FilterSection title={t('search')}>
        <div className="pt-2">
          <FilterLabel htmlFor="projects-filter-search">{t('searchByNameOrCode')}</FilterLabel>
          <FilterInput
            id="projects-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
