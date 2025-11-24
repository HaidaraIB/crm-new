
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { XIcon } from '../icons';
import { Button } from '../Button';
import { TaskStage } from '../../types';
import { getStageDisplayLabel } from '../../utils/taskStageMapper';

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

export const ActivitiesFilterDrawer = () => {
    const { isActivitiesFilterDrawerOpen, setIsActivitiesFilterDrawerOpen, t, users, activityFilters, setActivityFilters } = useAppContext();
    const [localFilters, setLocalFilters] = useState(activityFilters);

    // Update local filters when activityFilters changes
    useEffect(() => {
        setLocalFilters(activityFilters);
    }, [activityFilters]);

    const handleFilterChange = (key: keyof typeof localFilters, value: string) => {
        setLocalFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleReset = () => {
        const resetFilters = {
            user: 'All',
            stage: 'All',
            leadType: 'All',
            timePeriod: 'All',
            dateFrom: '',
            dateTo: '',
            search: '',
        };
        setLocalFilters(resetFilters);
        setActivityFilters(resetFilters);
    };

    const handleApply = () => {
        setActivityFilters(localFilters);
        setIsActivitiesFilterDrawerOpen(false);
    };

    const stages: Array<TaskStage | 'All'> = ['All', 'following', 'meeting', 'done_meeting', 'whatsapp_pending', 'no_answer', 'out_of_service', 'cancellation', 'not_interested', 'hold'];
    const leadTypes: Array<'All' | 'Fresh' | 'Cold'> = ['All', 'Fresh', 'Cold'];
    const timePeriods: Array<'All' | 'today' | 'yesterday' | 'last7' | 'thisMonth'> = ['All', 'today', 'yesterday', 'last7', 'thisMonth'];

    return (
        <>
            <aside className={`fixed inset-y-0 end-0 z-50 flex h-full w-full max-w-xs flex-col bg-card dark:bg-dark-card border-s dark:border-gray-800 transform transition-transform duration-300 ease-in-out 
                                ${isActivitiesFilterDrawerOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 h-16">
                    <h2 className="text-lg font-semibold">{t('filterActivities')}</h2>
                    <Button variant="ghost" className="p-1" onClick={() => setIsActivitiesFilterDrawerOpen(false)}>
                        <XIcon className="h-6 w-6" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
                    <FilterSection title={t('activityInfo')}>
                        <div className="space-y-4 pt-2">
                            <div>
                                <FilterLabel htmlFor="filter-user">{t('user')}</FilterLabel>
                                <FilterSelect id="filter-user" value={localFilters.user} onChange={(e) => handleFilterChange('user', e.target.value)}>
                                    <option value="All">{t('allUsers') || 'All Users'}</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id.toString()}>
                                            {user.name}
                                        </option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-stage">{t('stage')}</FilterLabel>
                                <FilterSelect id="filter-stage" value={localFilters.stage} onChange={(e) => handleFilterChange('stage', e.target.value)}>
                                    {stages.map(stage => (
                                        <option key={stage} value={stage}>
                                            {stage === 'All' ? t('all') : getStageDisplayLabel(stage as TaskStage)}
                                        </option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-lead-type">{t('leadType')}</FilterLabel>
                                <FilterSelect id="filter-lead-type" value={localFilters.leadType} onChange={(e) => handleFilterChange('leadType', e.target.value)}>
                                    {leadTypes.map(type => (
                                        <option key={type} value={type}>
                                            {type === 'All' ? t('all') : t(type.toLowerCase() + 'Lead') || type}
                                        </option>
                                    ))}
                                </FilterSelect>
                            </div>

                            <div>
                                <FilterLabel htmlFor="filter-time-period">{t('timePeriod')}</FilterLabel>
                                <FilterSelect id="filter-time-period" value={localFilters.timePeriod} onChange={(e) => handleFilterChange('timePeriod', e.target.value)}>
                                    {timePeriods.map(period => (
                                        <option key={period} value={period}>
                                            {period === 'All' ? (t('all') + ' ' + t('time')) : t(period) || period}
                                        </option>
                                    ))}
                                </FilterSelect>
                            </div>
                        </div>
                    </FilterSection>

                    <FilterSection title={t('dates')}>
                        <div className="space-y-4 pt-2">
                            <div>
                                <FilterLabel htmlFor="filter-date-from">{t('activityDateFrom') || t('date')} ({t('from')})</FilterLabel>
                                <FilterInput id="filter-date-from" type="date" value={localFilters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} />
                            </div>
                            <div>
                                <FilterLabel htmlFor="filter-date-to">{t('activityDateTo') || t('date')} ({t('to')})</FilterLabel>
                                <FilterInput id="filter-date-to" type="date" value={localFilters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)} />
                            </div>
                        </div>
                    </FilterSection>
                </div>
                <div className="p-4 border-t dark:border-gray-800 flex gap-2">
                    <Button variant="secondary" className="w-full" onClick={handleReset}>{t('reset')}</Button>
                    <Button className="w-full" onClick={handleApply}>{t('applyFilters')}</Button>
                </div>
            </aside>
            {isActivitiesFilterDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40"
                    aria-hidden="true"
                    onClick={() => setIsActivitiesFilterDrawerOpen(false)}
                ></div>
            )}
        </>
    );
};

