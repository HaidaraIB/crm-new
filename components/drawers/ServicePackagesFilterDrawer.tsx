
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { XIcon } from '../icons';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';

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

export const ServicePackagesFilterDrawer = () => {
    const { isServicePackageFilterDrawerOpen, setIsServicePackageFilterDrawerOpen, t, servicePackageFilters, setServicePackageFilters } = useAppContext();
    const [localFilters, setLocalFilters] = useState(servicePackageFilters);

    useEffect(() => {
        setLocalFilters(servicePackageFilters);
    }, [servicePackageFilters]);

    const handleFilterChange = (key: keyof typeof localFilters, value: string) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        const resetFilters = {
            isActive: 'All',
            priceMin: '',
            priceMax: '',
            search: '',
        };
        setLocalFilters(resetFilters);
        setServicePackageFilters(resetFilters);
    };

    const handleApply = () => {
        setServicePackageFilters(localFilters);
        setIsServicePackageFilterDrawerOpen(false);
    };

    return (
        <>
            <aside className={`fixed inset-y-0 end-0 z-50 flex h-full w-full max-w-xs flex-col bg-card dark:bg-dark-card border-s dark:border-gray-800 transform transition-transform duration-300 ease-in-out 
                                ${isServicePackageFilterDrawerOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 h-16">
                    <h2 className="text-lg font-semibold">{t('filterServicePackages')}</h2>
                    <Button variant="ghost" className="p-1" onClick={() => setIsServicePackageFilterDrawerOpen(false)}>
                        <XIcon className="h-6 w-6" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
                    <FilterSection title={t('packageInfo')}>
                        <div className="space-y-4 pt-2">
                            <div>
                                <FilterLabel htmlFor="filter-status">{t('status')}</FilterLabel>
                                <FilterSelect id="filter-status" value={localFilters.isActive} onChange={(e) => handleFilterChange('isActive', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    <option value="true">{t('active')}</option>
                                    <option value="false">{t('inactive')}</option>
                                </FilterSelect>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <FilterLabel htmlFor="filter-price-min">{t('priceRangeStart')}</FilterLabel>
                                    <NumberInput id="filter-price-min" name="filter-price-min" value={localFilters.priceMin} onChange={(e) => handleFilterChange('priceMin', e.target.value)} placeholder={t('eg500000')} min={0} step={1} />
                                </div>
                                <div>
                                    <FilterLabel htmlFor="filter-price-max">{t('priceRangeEnd')}</FilterLabel>
                                    <NumberInput id="filter-price-max" name="filter-price-max" value={localFilters.priceMax} onChange={(e) => handleFilterChange('priceMax', e.target.value)} placeholder={t('eg1000000')} min={0} step={1} />
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
            {isServicePackageFilterDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40"
                    aria-hidden="true"
                    onClick={() => setIsServicePackageFilterDrawerOpen(false)}
                ></div>
            )}
        </>
    );
};

