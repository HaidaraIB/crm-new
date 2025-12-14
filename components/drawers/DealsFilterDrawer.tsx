
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { XIcon } from '../icons';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';
import { useDeals, useProjects, useUnits } from '../../hooks/useQueries';

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

export const DealsFilterDrawer = () => {
    const { isDealsFilterDrawerOpen, setIsDealsFilterDrawerOpen, t, currentUser, dealFilters, setDealFilters } = useAppContext();
    const [localFilters, setLocalFilters] = useState(dealFilters);
    const isRealEstate = currentUser?.company?.specialization === 'real_estate';
    
    // Fetch data using React Query
    const { data: dealsResponse } = useDeals();
    const deals = dealsResponse?.results || [];
    
    const { data: projectsResponse } = useProjects();
    const projects = projectsResponse?.results || [];
    
    const { data: unitsResponse } = useUnits();
    const units = unitsResponse?.results || [];

    useEffect(() => {
        setLocalFilters(dealFilters);
    }, [dealFilters]);

    const handleFilterChange = (key: keyof typeof localFilters, value: string) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        const resetFilters = {
            status: 'All',
            paymentMethod: 'All',
            unit: 'All',
            project: 'All',
            valueMin: '',
            valueMax: '',
            search: '',
        };
        setLocalFilters(resetFilters);
        setDealFilters(resetFilters);
    };

    const handleApply = () => {
        setDealFilters(localFilters);
        setIsDealsFilterDrawerOpen(false);
    };

    // Get unique values from deals for filters
    // Handle both raw API data and transformed data
    // Helper function to translate status
    const translateStatus = (status: string): string => {
        if (!status) return status;
        const statusLower = status.toLowerCase();
        const statusMap: { [key: string]: string } = {
            'reservation': t('reservation') || 'Reservation',
            'contracted': t('contracted') || 'Contracted',
            'closed': t('closed') || 'Closed',
        };
        return statusMap[statusLower] || status;
    };

    // Helper function to translate payment method
    const translatePaymentMethod = (method: string): string => {
        if (!method) return method;
        const methodLower = method.toLowerCase();
        const methodMap: { [key: string]: string } = {
            'cash': t('cash') || 'Cash',
            'installment': t('installment') || 'Installment',
        };
        return methodMap[methodLower] || method;
    };

    const uniqueStatuses = Array.from(new Set((deals || [])
        .map(d => {
            // Handle status from both raw and transformed data
            return d.status || (d as any).status_name || '';
        })
        .filter(status => status && status.trim() !== '')))
        .sort();
    const uniquePaymentMethods = Array.from(new Set((deals || [])
        .map(d => {
            // Handle paymentMethod from both raw and transformed data
            return d.paymentMethod || (d as any).payment_method || '';
        })
        .filter(method => method && method.trim() !== '' && method !== '-')))
        .sort();
    const uniqueUnits = Array.from(new Set((deals || [])
        .map(d => {
            // Handle unit from both raw and transformed data
            // API now returns unit as ID (number) or unit_code (string) from serializer
            if ((d as any).unit_code) return String((d as any).unit_code);
            if (d.unit) {
                // If unit is a number (ID), find the unit code from units array
                if (typeof d.unit === 'number') {
                    const unitObj = units.find((u: any) => u.id === d.unit);
                    return unitObj ? String(unitObj.code || unitObj.id) : '';
                }
                // If unit is a string (code), return it
                if (typeof d.unit === 'string') return d.unit;
                // If unit is an object, get the code
                if (typeof d.unit === 'object' && d.unit?.code) return String(d.unit.code);
            }
            return '';
        })
        .filter(unit => {
            // Convert to string and check if it's valid
            const unitStr = String(unit || '');
            return unitStr && unitStr !== '-' && unitStr.trim() !== '';
        })))
        .sort();

    return (
        <>
            <aside className={`fixed inset-y-0 end-0 z-50 flex h-full w-full max-w-xs flex-col bg-card dark:bg-dark-card border-s dark:border-gray-800 transform transition-transform duration-300 ease-in-out 
                                ${isDealsFilterDrawerOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 h-16">
                    <h2 className="text-lg font-semibold">{t('filterDeals')}</h2>
                    <Button variant="ghost" className="p-1" onClick={() => setIsDealsFilterDrawerOpen(false)}>
                        <XIcon className="h-6 w-6" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
                    <FilterSection title={t('dealInfo')}>
                        <div className="space-y-4 pt-2">
                            <div>
                                <FilterLabel htmlFor="deals-filter-status">{t('status')}</FilterLabel>
                                <FilterSelect id="deals-filter-status" value={localFilters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniqueStatuses.map(status => (
                                        <option key={status} value={status}>{translateStatus(status)}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="deals-filter-payment">{t('paymentMethod')}</FilterLabel>
                                <FilterSelect id="deals-filter-payment" value={localFilters.paymentMethod} onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {uniquePaymentMethods.map(method => (
                                        <option key={method} value={method}>{translatePaymentMethod(method)}</option>
                                    ))}
                                </FilterSelect>
                            </div>

                            {isRealEstate && (
                                <>
                                    <div>
                                        <FilterLabel htmlFor="deals-filter-project">{t('project')}</FilterLabel>
                                        <FilterSelect id="deals-filter-project" value={localFilters.project} onChange={(e) => handleFilterChange('project', e.target.value)}>
                                            <option value="All">{t('all')}</option>
                                            {(projects || []).map((project: any) => (
                                                <option key={project.id} value={project.name}>{project.name}</option>
                                            ))}
                                        </FilterSelect>
                                    </div>

                                    <div>
                                        <FilterLabel htmlFor="deals-filter-unit">{t('unit')}</FilterLabel>
                                        <FilterSelect id="deals-filter-unit" value={localFilters.unit} onChange={(e) => handleFilterChange('unit', e.target.value)}>
                                            <option value="All">{t('all')}</option>
                                            {uniqueUnits.map(unit => (
                                                <option key={unit} value={unit}>{unit}</option>
                                            ))}
                                        </FilterSelect>
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <FilterLabel htmlFor="deals-filter-value-min">{t('valueRangeStart') || t('budgetRangeStart')}</FilterLabel>
                                    <NumberInput id="deals-filter-value-min" name="deals-filter-value-min" value={localFilters.valueMin} onChange={(e) => handleFilterChange('valueMin', e.target.value)} placeholder={t('eg500000')} min={0} step={1} />
                                </div>
                                <div>
                                    <FilterLabel htmlFor="deals-filter-value-max">{t('valueRangeEnd') || t('budgetRangeEnd')}</FilterLabel>
                                    <NumberInput id="deals-filter-value-max" name="deals-filter-value-max" value={localFilters.valueMax} onChange={(e) => handleFilterChange('valueMax', e.target.value)} placeholder={t('eg1000000')} min={0} step={1} />
                                </div>
                            </div>
                        </div>
                    </FilterSection>

                    <FilterSection title={t('search')}>
                        <div className="pt-2">
                            <FilterLabel htmlFor="deals-filter-search">{t('searchByClientNameOrId')}</FilterLabel>
                            <FilterInput id="deals-filter-search" placeholder={t('search')} value={localFilters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
                        </div>
                    </FilterSection>
                </div>
                <div className="p-4 border-t dark:border-gray-800 flex gap-2">
                    <Button variant="secondary" className="w-full" onClick={handleReset}>{t('reset')}</Button>
                    <Button className="w-full" onClick={handleApply}>{t('applyFilters')}</Button>
                </div>
            </aside>
            {isDealsFilterDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40"
                    aria-hidden="true"
                    onClick={() => setIsDealsFilterDrawerOpen(false)}
                ></div>
            )}
        </>
    );
};
