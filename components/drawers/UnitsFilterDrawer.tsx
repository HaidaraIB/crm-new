
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { XIcon } from '../icons';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';
import { useProjects, useUnits } from '../../hooks/useQueries';

const FilterSection = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <details className="group" open>
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-medium text-gray-900 dark:text-white">
            {title}
            <span className="transition group-open:rotate-180">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </span>
        </summary>
        <div className="py-2 text-gray-500 dark:text-gray-400">
            {children}
        </div>
    </details>
);

const FilterLabel = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{children}</label>
);

const FilterSelect = ({ id, value, onChange, children }: { id: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; children?: React.ReactNode }) => {
    const { language } = useAppContext();
    return (
        <select id={id} value={value} onChange={onChange} dir={language === 'ar' ? 'rtl' : 'ltr'} className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100">
            {children}
        </select>
    );
};

const FilterInput = ({ id, type = 'text', placeholder, value, onChange }: { id: string; type?: string; placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    const { language } = useAppContext();
    return (
        <input type={type} id={id} placeholder={placeholder} value={value} onChange={onChange} dir={language === 'ar' ? 'rtl' : 'ltr'} className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100" />
    );
};

export const UnitsFilterDrawer = () => {
    const { isUnitsFilterDrawerOpen, setIsUnitsFilterDrawerOpen, t, unitFilters, setUnitFilters } = useAppContext();
    const [localFilters, setLocalFilters] = useState(unitFilters);
    
    // Fetch data using React Query
    const { data: projectsResponse } = useProjects();
    const projects = projectsResponse?.results || [];
    
    const { data: unitsResponse } = useUnits();
    const units = unitsResponse?.results || [];

    useEffect(() => {
        setLocalFilters(unitFilters);
    }, [unitFilters]);

    const handleFilterChange = (key: keyof typeof localFilters, value: string) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        const resetFilters = {
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
        setLocalFilters(resetFilters);
        setUnitFilters(resetFilters);
    };

    const handleApply = () => {
        setUnitFilters(localFilters);
        setIsUnitsFilterDrawerOpen(false);
    };

    // Get unique values from units for filters
    const uniqueTypes = Array.from(new Set((units || [])
        .map(u => u.type)
        .filter(type => type && type !== '-' && type.trim() !== '')))
        .sort();
    const uniqueFinishing = Array.from(new Set((units || [])
        .map(u => u.finishing)
        .filter(finishing => finishing && finishing !== '-' && finishing.trim() !== '')))
        .sort();
    const uniqueCities = Array.from(new Set((units || [])
        .map(u => u.city)
        .filter(city => city && city !== '-' && city.trim() !== '')))
        .sort();
    const uniqueDistricts = Array.from(new Set((units || [])
        .map(u => u.district)
        .filter(district => district && district !== '-' && district.trim() !== '')))
        .sort();
    const uniqueZones = Array.from(new Set((units || [])
        .map(u => u.zone)
        .filter(zone => zone && zone !== '-' && zone.trim() !== '')))
        .sort();
    const uniqueBedrooms = Array.from(new Set((units || [])
        .map(u => u.bedrooms)
        .filter(bedrooms => bedrooms !== null && bedrooms !== undefined && bedrooms !== '')))
        .sort((a, b) => Number(a) - Number(b));
    const uniqueBathrooms = Array.from(new Set((units || [])
        .map(u => u.bathrooms)
        .filter(bathrooms => bathrooms !== null && bathrooms !== undefined && bathrooms !== '')))
        .sort((a, b) => Number(a) - Number(b));

    // Helper function to translate type
    const translateType = (type: string): string => {
        if (!type) return type;
        const typeLower = type.toLowerCase();
        const typeMap: { [key: string]: string } = {
            'apartment': t('apartment') || 'Apartment',
            'villa': t('villa') || 'Villa',
        };
        return typeMap[typeLower] || type;
    };

    // Helper function to translate finishing
    const translateFinishing = (finishing: string): string => {
        if (!finishing) return finishing;
        const finishingLower = finishing.toLowerCase();
        const finishingMap: { [key: string]: string } = {
            'finished': t('finished') || 'Finished',
            'semi-finished': t('semiFinished') || 'Semi-Finished',
            'semifinished': t('semiFinished') || 'Semi-Finished',
        };
        return finishingMap[finishingLower] || finishing;
    };

    // Helper function to translate status
    const translateStatus = (status: string): string => {
        if (!status) return status;
        const statusLower = status.toLowerCase();
        const statusMap: { [key: string]: string } = {
            'true': t('sold') || 'Sold',
            'false': t('available') || 'Available',
        };
        return statusMap[statusLower] || status;
    };

    return (
        <>
            <aside className={`fixed inset-y-0 end-0 z-50 flex h-full w-full max-w-xs flex-col bg-card dark:bg-dark-card border-s dark:border-gray-800 transform transition-transform duration-300 ease-in-out 
                                ${isUnitsFilterDrawerOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 h-16">
                    <h2 className="text-lg font-semibold">{t('filterUnits')}</h2>
                    <Button variant="ghost" className="p-1" onClick={() => setIsUnitsFilterDrawerOpen(false)}>
                        <XIcon className="h-6 w-6" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
                    <FilterSection title={t('unitInfo') || t('filterUnits')}>
                        <div className="space-y-4 pt-2">
                            <div>
                                <FilterLabel htmlFor="units-filter-project">{t('project')}</FilterLabel>
                                <FilterSelect id="units-filter-project" value={localFilters.project} onChange={(e) => handleFilterChange('project', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {projects?.map(proj => (
                                        <option key={proj.id} value={proj.name}>{proj.name}</option>
                                    )) || []}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="units-filter-type">{t('type')}</FilterLabel>
                                <FilterSelect id="units-filter-type" value={localFilters.type} onChange={(e) => handleFilterChange('type', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueTypes.map(type => (
                                        <option key={type} value={type}>{translateType(type)}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="units-filter-finishing">{t('finishing')}</FilterLabel>
                                <FilterSelect id="units-filter-finishing" value={localFilters.finishing} onChange={(e) => handleFilterChange('finishing', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueFinishing.map(finishing => (
                                        <option key={finishing} value={finishing}>{translateFinishing(finishing)}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="units-filter-city">{t('city')}</FilterLabel>
                                <FilterSelect id="units-filter-city" value={localFilters.city} onChange={(e) => handleFilterChange('city', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueCities.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="units-filter-district">{t('district')}</FilterLabel>
                                <FilterSelect id="units-filter-district" value={localFilters.district} onChange={(e) => handleFilterChange('district', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueDistricts.map(district => (
                                        <option key={district} value={district}>{district}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="units-filter-zone">{t('zone')}</FilterLabel>
                                <FilterSelect id="units-filter-zone" value={localFilters.zone} onChange={(e) => handleFilterChange('zone', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueZones.map(zone => (
                                        <option key={zone} value={zone}>{zone}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="units-filter-sold">{t('status')}</FilterLabel>
                                <FilterSelect id="units-filter-sold" value={localFilters.isSold} onChange={(e) => handleFilterChange('isSold', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    <option value="false">{translateStatus('false')}</option>
                                    <option value="true">{translateStatus('true')}</option>
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="units-filter-bedrooms">{t('bedrooms')}</FilterLabel>
                                <FilterSelect id="units-filter-bedrooms" value={localFilters.bedrooms} onChange={(e) => handleFilterChange('bedrooms', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueBedrooms.map(bedrooms => (
                                        <option key={bedrooms} value={bedrooms.toString()}>{bedrooms}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="units-filter-bathrooms">{t('bathrooms')}</FilterLabel>
                                <FilterSelect id="units-filter-bathrooms" value={localFilters.bathrooms} onChange={(e) => handleFilterChange('bathrooms', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueBathrooms.map(bathrooms => (
                                        <option key={bathrooms} value={bathrooms.toString()}>{bathrooms}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <FilterLabel htmlFor="units-filter-price-min">{t('priceRangeStart') || 'Min Price'}</FilterLabel>
                                    <NumberInput id="units-filter-price-min" name="units-filter-price-min" value={localFilters.priceMin} onChange={(e) => handleFilterChange('priceMin', e.target.value)} placeholder={t('eg500000')} min={0} step={1} />
                                </div>
                                <div>
                                    <FilterLabel htmlFor="units-filter-price-max">{t('priceRangeEnd') || 'Max Price'}</FilterLabel>
                                    <NumberInput id="units-filter-price-max" name="units-filter-price-max" value={localFilters.priceMax} onChange={(e) => handleFilterChange('priceMax', e.target.value)} placeholder={t('eg1000000')} min={0} step={1} />
                                </div>
                            </div>
                        </div>
                    </FilterSection>

                    <FilterSection title={t('search')}>
                        <div className="pt-2">
                            <FilterLabel htmlFor="units-filter-search">{t('searchByNameOrCode')}</FilterLabel>
                            <FilterInput id="units-filter-search" placeholder={t('search')} value={localFilters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
                        </div>
                    </FilterSection>
                </div>
                <div className="p-4 border-t dark:border-gray-800 flex gap-2">
                    <Button variant="secondary" className="w-full" onClick={handleReset}>{t('reset')}</Button>
                    <Button className="w-full" onClick={handleApply}>{t('applyFilters')}</Button>
                </div>
            </aside>
            {isUnitsFilterDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40"
                    aria-hidden="true"
                    onClick={() => setIsUnitsFilterDrawerOpen(false)}
                ></div>
            )}
        </>
    );
};
