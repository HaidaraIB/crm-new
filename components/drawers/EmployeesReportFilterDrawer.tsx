
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

const FilterInput = ({ id, type = 'date', value, onChange }: { id: string; type?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    const { language } = useAppContext();
    return (
        <input type={type} id={id} value={value} onChange={onChange} dir={language === 'ar' ? 'rtl' : 'ltr'} className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100" />
    );
};

interface EmployeesReportFilters {
    leadType: string;
    startDate: string;
    endDate: string;
}

export const EmployeesReportFilterDrawer = () => {
    const { isEmployeesReportFilterDrawerOpen, setIsEmployeesReportFilterDrawerOpen, t, employeesReportFilters, setEmployeesReportFilters } = useAppContext();
    const [localFilters, setLocalFilters] = useState<EmployeesReportFilters>(employeesReportFilters);

    useEffect(() => {
        setLocalFilters(employeesReportFilters);
    }, [employeesReportFilters]);

    const handleFilterChange = (key: keyof EmployeesReportFilters, value: string) => {
        setLocalFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleReset = () => {
        const resetFilters: EmployeesReportFilters = {
            leadType: 'all',
            startDate: '',
            endDate: '',
        };
        setLocalFilters(resetFilters);
        setEmployeesReportFilters(resetFilters);
    };

    const handleApply = () => {
        setEmployeesReportFilters(localFilters);
        setIsEmployeesReportFilterDrawerOpen(false);
    };

    return (
        <>
            <aside className={`fixed inset-y-0 end-0 z-50 flex h-full w-full max-w-xs flex-col bg-card dark:bg-dark-card border-s dark:border-gray-800 transform transition-transform duration-300 ease-in-out 
                                ${isEmployeesReportFilterDrawerOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 h-16">
                    <h2 className="text-lg font-semibold">{t('filterEmployeesReport') || 'Filter Employees Report'}</h2>
                    <Button variant="ghost" className="p-1" onClick={() => setIsEmployeesReportFilterDrawerOpen(false)}>
                        <XIcon className="h-6 w-6" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
                    <FilterSection title={t('reportInfo') || 'Report Information'}>
                        <div className="space-y-3">
                            <div>
                                <FilterLabel htmlFor="employees-report-filter-lead-type">{t('leadType')}</FilterLabel>
                                <FilterSelect id="employees-report-filter-lead-type" value={localFilters.leadType} onChange={(e) => handleFilterChange('leadType', e.target.value)}>
                                    <option value="all">{t('allLeadsType')}</option>
                                    <option value="fresh">{t('freshLeads')}</option>
                                    <option value="cold">{t('coldLeads')}</option>
                                </FilterSelect>
                            </div>
                            <div>
                                <FilterLabel htmlFor="employees-report-filter-start-date">{t('startDate')}</FilterLabel>
                                <FilterInput id="employees-report-filter-start-date" type="date" value={localFilters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
                            </div>
                            <div>
                                <FilterLabel htmlFor="employees-report-filter-end-date">{t('endDate') || 'End Date'}</FilterLabel>
                                <FilterInput id="employees-report-filter-end-date" type="date" value={localFilters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
                            </div>
                        </div>
                    </FilterSection>
                </div>
                <div className="p-4 border-t dark:border-gray-800 flex gap-2">
                    <Button variant="secondary" onClick={handleReset} className="flex-1">{t('reset')}</Button>
                    <Button onClick={handleApply} className="flex-1">{t('applyFilters')}</Button>
                </div>
            </aside>
        </>
    );
};

