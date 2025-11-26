
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { XIcon } from '../icons';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';

// FIX: Made children optional to fix missing children prop error.
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

// FIX: Made children optional to fix missing children prop error.
const FilterLabel = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
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


export const FilterDrawer = () => {
    const { isFilterDrawerOpen, setIsFilterDrawerOpen, t, users, leadFilters, setLeadFilters, channels } = useAppContext();
    const [localFilters, setLocalFilters] = useState(leadFilters);

    // Update local filters when leadFilters changes
    useEffect(() => {
        setLocalFilters(leadFilters);
    }, [leadFilters]);

    const handleFilterChange = (key: keyof typeof localFilters, value: string) => {
        setLocalFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleReset = () => {
        const resetFilters = {
            status: 'All',
            type: 'All',
            priority: 'All',
            assignedTo: 'All',
            communicationWay: 'All',
            budgetMin: '',
            budgetMax: '',
            createdAtFrom: '',
            createdAtTo: '',
            search: '',
        };
        setLocalFilters(resetFilters);
        setLeadFilters(resetFilters);
    };

    const handleApply = () => {
        setLeadFilters(localFilters);
        setIsFilterDrawerOpen(false);
    };

    const leadStatuses: Array<'All' | 'Untouched' | 'Touched' | 'Following' | 'Meeting' | 'No Answer' | 'Out Of Service'> = ['All', 'Untouched', 'Touched', 'Following', 'Meeting', 'No Answer', 'Out Of Service'];
    const leadTypes: Array<'All' | 'Fresh' | 'Cold' | 'Rotated'> = ['All', 'Fresh', 'Cold', 'Rotated'];
    const priorities: Array<'All' | 'High' | 'Medium' | 'Low'> = ['All', 'High', 'Medium', 'Low'];
    const communicationWays: Array<'All' | 'WhatsApp' | 'Call'> = ['All', 'WhatsApp', 'Call'];

    return (
        <>
            <aside className={`fixed inset-y-0 end-0 z-50 flex h-full w-full max-w-xs flex-col bg-card dark:bg-dark-card border-s dark:border-gray-800 transform transition-transform duration-300 ease-in-out 
                                ${isFilterDrawerOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 h-16">
                    <h2 className="text-lg font-semibold">{t('filterLeads')}</h2>
                    <Button variant="ghost" className="p-1" onClick={() => setIsFilterDrawerOpen(false)}>
                        <XIcon className="h-6 w-6" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
                    <FilterSection title={t('leadInfo')}>
                        <div className="space-y-4 pt-2">
                            <div>
                                <FilterLabel htmlFor="filter-status">{t('status')}</FilterLabel>
                                <FilterSelect id="filter-status" value={localFilters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                                    {leadStatuses.map(status => (
                                        <option key={status} value={status}>
                                            {status === 'All' ? t('all') : t(status.replace(' ', '').toLowerCase() as any) || status}
                                        </option>
                                    ))}
                                </FilterSelect>
                            </div>
                            
                            <div>
                                <FilterLabel htmlFor="filter-type">{t('type')}</FilterLabel>
                                <FilterSelect id="filter-type" value={localFilters.type} onChange={(e) => handleFilterChange('type', e.target.value)}>
                                    {leadTypes.map(type => (
                                        <option key={type} value={type}>
                                            {type === 'All' ? t('all') : t(type.toLowerCase() as any) || type}
                                        </option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-priority">{t('priority')}</FilterLabel>
                                <FilterSelect id="filter-priority" value={localFilters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}>
                                    {priorities.map(priority => (
                                        <option key={priority} value={priority}>
                                            {priority === 'All' ? t('all') : t(priority.toLowerCase() as any) || priority}
                                        </option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-communication">{t('communicationWay')}</FilterLabel>
                                <FilterSelect id="filter-communication" value={localFilters.communicationWay} onChange={(e) => handleFilterChange('communicationWay', e.target.value)}>
                                    {communicationWays.map(way => (
                                        <option key={way} value={way}>
                                            {way === 'All' ? t('all') : way}
                                        </option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-assigned">{t('assignedTo')}</FilterLabel>
                                <FilterSelect id="filter-assigned" value={localFilters.assignedTo} onChange={(e) => handleFilterChange('assignedTo', e.target.value)}>
                                    <option value="All">{t('all')}</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id.toString()}>
                                            {user.name}
                                        </option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <FilterLabel htmlFor="filter-budget-min">{t('budgetRangeStart')}</FilterLabel>
                                    <NumberInput id="filter-budget-min" name="filter-budget-min" value={localFilters.budgetMin} onChange={(e) => handleFilterChange('budgetMin', e.target.value)} placeholder={t('eg500000')} min={0} step={1} />
                                </div>
                                <div>
                                    <FilterLabel htmlFor="filter-budget-max">{t('budgetRangeEnd')}</FilterLabel>
                                    <NumberInput id="filter-budget-max" name="filter-budget-max" value={localFilters.budgetMax} onChange={(e) => handleFilterChange('budgetMax', e.target.value)} placeholder={t('eg1000000')} min={0} step={1} />
                                </div>
                            </div>
                        </div>
                    </FilterSection>

                    <FilterSection title={t('dates')}>
                        <div className="space-y-4 pt-2">
                            <div>
                                <FilterLabel htmlFor="filter-date-from">{t('leadCreatedAtRange') || t('dateAddedRange')} ({t('from')})</FilterLabel>
                                <FilterInput id="filter-date-from" type="date" value={localFilters.createdAtFrom} onChange={(e) => handleFilterChange('createdAtFrom', e.target.value)} />
                            </div>
                            <div>
                                <FilterLabel htmlFor="filter-date-to">{t('leadCreatedAtRange') || t('dateAddedRange')} ({t('to')})</FilterLabel>
                                <FilterInput id="filter-date-to" type="date" value={localFilters.createdAtTo} onChange={(e) => handleFilterChange('createdAtTo', e.target.value)} />
                            </div>
                        </div>
                    </FilterSection>
                </div>
                <div className="p-4 border-t dark:border-gray-800 flex gap-2">
                    <Button variant="secondary" className="w-full" onClick={handleReset}>{t('reset')}</Button>
                    <Button className="w-full" onClick={handleApply}>{t('applyFilters')}</Button>
                </div>
            </aside>
            {isFilterDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40"
                    aria-hidden="true"
                    onClick={() => setIsFilterDrawerOpen(false)}
                ></div>
            )}
        </>
    );
};
