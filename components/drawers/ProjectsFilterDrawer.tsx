
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

export const ProjectsFilterDrawer = () => {
    const { isProjectFilterDrawerOpen, setIsProjectFilterDrawerOpen, t, projectFilters, setProjectFilters, developers, projects } = useAppContext();
    const [localFilters, setLocalFilters] = useState(projectFilters);

    useEffect(() => {
        setLocalFilters(projectFilters);
    }, [projectFilters]);

    const handleFilterChange = (key: keyof typeof localFilters, value: string) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        const resetFilters = {
            developer: 'All',
            type: 'All',
            city: 'All',
            paymentMethod: 'All',
            search: '',
        };
        setLocalFilters(resetFilters);
        setProjectFilters(resetFilters);
    };

    const handleApply = () => {
        setProjectFilters(localFilters);
        setIsProjectFilterDrawerOpen(false);
    };

    // Get unique values from projects for filters
    const uniqueTypes = Array.from(new Set(projects.map(p => p.type).filter(Boolean)));
    const uniqueCities = Array.from(new Set(projects.map(p => p.city).filter(Boolean)));
    const uniquePaymentMethods = Array.from(new Set(projects.map(p => p.paymentMethod).filter(Boolean)));

    return (
        <>
            <aside className={`fixed inset-y-0 end-0 z-50 flex h-full w-full max-w-xs flex-col bg-card dark:bg-dark-card border-s dark:border-gray-800 transform transition-transform duration-300 ease-in-out 
                                ${isProjectFilterDrawerOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 h-16">
                    <h2 className="text-lg font-semibold">{t('filterProjects')}</h2>
                    <Button variant="ghost" className="p-1" onClick={() => setIsProjectFilterDrawerOpen(false)}>
                        <XIcon className="h-6 w-6" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
                    <FilterSection title={t('projectInfo')}>
                        <div className="space-y-4 pt-2">
                            <div>
                                <FilterLabel htmlFor="filter-developer">{t('developer')}</FilterLabel>
                                <FilterSelect id="filter-developer" value={localFilters.developer} onChange={(e) => handleFilterChange('developer', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {developers.map(dev => (
                                        <option key={dev.id} value={dev.name}>{dev.name}</option>
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
                                <FilterLabel htmlFor="filter-city">{t('city')}</FilterLabel>
                                <FilterSelect id="filter-city" value={localFilters.city} onChange={(e) => handleFilterChange('city', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueCities.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-payment">{t('paymentMethod')}</FilterLabel>
                                <FilterSelect id="filter-payment" value={localFilters.paymentMethod} onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniquePaymentMethods.map(method => (
                                        <option key={method} value={method}>{method}</option>
                                    ))}
                                </FilterSelect>
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
            {isProjectFilterDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40"
                    aria-hidden="true"
                    onClick={() => setIsProjectFilterDrawerOpen(false)}
                ></div>
            )}
        </>
    );
};

