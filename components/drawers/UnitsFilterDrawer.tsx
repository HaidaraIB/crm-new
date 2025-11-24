
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { XIcon } from '../icons';
import { Button } from '../Button';

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
    const { isUnitsFilterDrawerOpen, setIsUnitsFilterDrawerOpen, t, unitFilters, setUnitFilters, projects, units } = useAppContext();
    const [localFilters, setLocalFilters] = useState(unitFilters);

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
    const uniqueTypes = Array.from(new Set(units.map(u => u.type).filter(Boolean)));
    const uniqueFinishing = Array.from(new Set(units.map(u => u.finishing).filter(Boolean)));
    const uniqueCities = Array.from(new Set(units.map(u => u.city).filter(Boolean)));
    const uniqueDistricts = Array.from(new Set(units.map(u => u.district).filter(Boolean)));
    const uniqueZones = Array.from(new Set(units.map(u => u.zone).filter(Boolean)));
    const uniqueBedrooms = Array.from(new Set(units.map(u => u.bedrooms).filter(Boolean))).sort((a, b) => a - b);
    const uniqueBathrooms = Array.from(new Set(units.map(u => u.bathrooms).filter(Boolean))).sort((a, b) => a - b);

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
                                <FilterLabel htmlFor="filter-project">{t('project')}</FilterLabel>
                                <FilterSelect id="filter-project" value={localFilters.project} onChange={(e) => handleFilterChange('project', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {projects.map(proj => (
                                        <option key={proj.id} value={proj.name}>{proj.name}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-type">{t('type')}</FilterLabel>
                                <FilterSelect id="filter-type" value={localFilters.type} onChange={(e) => handleFilterChange('type', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-finishing">{t('finishing')}</FilterLabel>
                                <FilterSelect id="filter-finishing" value={localFilters.finishing} onChange={(e) => handleFilterChange('finishing', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueFinishing.map(finishing => (
                                        <option key={finishing} value={finishing}>{finishing}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-city">{t('city')}</FilterLabel>
                                <FilterSelect id="filter-city" value={localFilters.city} onChange={(e) => handleFilterChange('city', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueCities.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-district">{t('district')}</FilterLabel>
                                <FilterSelect id="filter-district" value={localFilters.district} onChange={(e) => handleFilterChange('district', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueDistricts.map(district => (
                                        <option key={district} value={district}>{district}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-zone">{t('zone')}</FilterLabel>
                                <FilterSelect id="filter-zone" value={localFilters.zone} onChange={(e) => handleFilterChange('zone', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueZones.map(zone => (
                                        <option key={zone} value={zone}>{zone}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-sold">{t('status')}</FilterLabel>
                                <FilterSelect id="filter-sold" value={localFilters.isSold} onChange={(e) => handleFilterChange('isSold', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    <option value="false">{t('available') || 'Available'}</option>
                                    <option value="true">{t('sold') || 'Sold'}</option>
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-bedrooms">{t('bedrooms')}</FilterLabel>
                                <FilterSelect id="filter-bedrooms" value={localFilters.bedrooms} onChange={(e) => handleFilterChange('bedrooms', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueBedrooms.map(bedrooms => (
                                        <option key={bedrooms} value={bedrooms.toString()}>{bedrooms}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-bathrooms">{t('bathrooms')}</FilterLabel>
                                <FilterSelect id="filter-bathrooms" value={localFilters.bathrooms} onChange={(e) => handleFilterChange('bathrooms', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueBathrooms.map(bathrooms => (
                                        <option key={bathrooms} value={bathrooms.toString()}>{bathrooms}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <FilterLabel htmlFor="filter-price-min">{t('priceRangeStart') || 'Min Price'}</FilterLabel>
                                    <FilterInput id="filter-price-min" type="number" placeholder={t('eg500000')} value={localFilters.priceMin} onChange={(e) => handleFilterChange('priceMin', e.target.value)} />
                                </div>
                                <div>
                                    <FilterLabel htmlFor="filter-price-max">{t('priceRangeEnd') || 'Max Price'}</FilterLabel>
                                    <FilterInput id="filter-price-max" type="number" placeholder={t('eg1000000')} value={localFilters.priceMax} onChange={(e) => handleFilterChange('priceMax', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </FilterSection>

                    <FilterSection title={t('search')}>
                        <div className="pt-2">
                            <FilterLabel htmlFor="filter-search">{t('searchByNameOrCode')}</FilterLabel>
                            <FilterInput id="filter-search" placeholder={t('search')} value={localFilters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
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
