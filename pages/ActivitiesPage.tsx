

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Loader, Button, FilterIcon, SearchIcon, Input } from '../components/index';
import { Activity, TaskStage } from '../types';
import { getStageDisplayLabel, getStageCategory } from '../utils/taskStageMapper';

export const ActivitiesPage = () => {
    const { 
        t, 
        activities, 
        users, 
        leads,
        activityFilters,
        setActivityFilters,
        setIsActivitiesFilterDrawerOpen,
        stages,
    } = useAppContext();
    const [loading, setLoading] = useState(false);

    // Filter activities based on filters from FilterDrawer
    const filteredActivities = useMemo(() => {
        let filtered = activities;

        // User filter
        if (activityFilters.user && activityFilters.user !== 'All') {
            filtered = filtered.filter(activity => {
                const user = users.find(u => u.name === activity.user);
                return user && user.id.toString() === activityFilters.user;
            });
        }

        // Stage filter
        if (activityFilters.stage && activityFilters.stage !== 'All') {
            filtered = filtered.filter(activity => activity.stage === activityFilters.stage);
        }

        // Lead type filter
        if (activityFilters.leadType && activityFilters.leadType !== 'All') {
            filtered = filtered.filter(activity => {
                const lead = leads.find(l => l.name === activity.lead);
                if (!lead) return false;
                return lead.type.toLowerCase() === activityFilters.leadType.toLowerCase();
            });
        }

        // Time period filter
        if (activityFilters.timePeriod && activityFilters.timePeriod !== 'All') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            filtered = filtered.filter(activity => {
                const activityDate = new Date(activity.date);
                
                switch (activityFilters.timePeriod) {
                    case 'today': {
                        const activityDateOnly = new Date(activityDate);
                        activityDateOnly.setHours(0, 0, 0, 0);
                        return activityDateOnly.getTime() === today.getTime();
                    }
                    case 'yesterday': {
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        const activityDateOnly = new Date(activityDate);
                        activityDateOnly.setHours(0, 0, 0, 0);
                        return activityDateOnly.getTime() === yesterday.getTime();
                    }
                    case 'last7': {
                        const last7Days = new Date(today);
                        last7Days.setDate(last7Days.getDate() - 7);
                        return activityDate >= last7Days;
                    }
                    case 'thisMonth': {
                        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                        return activityDate >= thisMonthStart;
                    }
                    default:
                        return true;
                }
            });
        }

        // Date range filter
        if (activityFilters.dateFrom) {
            const fromDate = new Date(activityFilters.dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(activity => {
                const activityDate = new Date(activity.date);
                activityDate.setHours(0, 0, 0, 0);
                return activityDate >= fromDate;
            });
        }

        if (activityFilters.dateTo) {
            const toDate = new Date(activityFilters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(activity => {
                const activityDate = new Date(activity.date);
                return activityDate <= toDate;
            });
        }

        // Search filter
        if (activityFilters.search) {
            const searchLower = activityFilters.search.toLowerCase();
            filtered = filtered.filter(activity =>
                activity.lead.toLowerCase().includes(searchLower) ||
                activity.notes.toLowerCase().includes(searchLower) ||
                activity.user.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    }, [activities, activityFilters, users, leads]);

    if (loading) {
        return (
            <PageWrapper title={t('activities')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
            <PageWrapper
                title={t('activities')}
                actions={
                    <Button 
                        variant="secondary" 
                        onClick={() => setIsActivitiesFilterDrawerOpen(true)}
                    >
                        <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
                    </Button>
                }
            >
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">{t('user')}</th>
                                    <th scope="col" className="px-6 py-3">{t('lead')}</th>
                                    <th scope="col" className="px-6 py-3">{t('stage')}</th>
                                    <th scope="col" className="px-6 py-3">{t('date')}</th>
                                    <th scope="col" className="px-6 py-3">{t('notes')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredActivities.length > 0 ? (
                                    filteredActivities.map(activity => (
                                    <tr key={activity.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{activity.user}</td>
                                        <td className="px-6 py-4">{activity.lead}</td>
                                        <td className="px-6 py-4">
                                            {(() => {
                                                // Find stage from settings by name (normalize to match)
                                                const stageName = typeof activity.stage === 'string' 
                                                    ? activity.stage.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                                                    : activity.stage;
                                                const stageConfig = stages.find(s => 
                                                    s.name.toLowerCase().replace(/\s+/g, '_') === stageName.toLowerCase().replace(/\s+/g, '_') ||
                                                    s.name === stageName
                                                );
                                                const stageColor = stageConfig?.color || '#808080';
                                                
                                                // Convert hex to RGB for background opacity
                                                const hexToRgb = (hex: string) => {
                                                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                                    return result ? {
                                                        r: parseInt(result[1], 16),
                                                        g: parseInt(result[2], 16),
                                                        b: parseInt(result[3], 16)
                                                    } : null;
                                                };
                                                
                                                const rgb = hexToRgb(stageColor);
                                                const bgColor = rgb 
                                                    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`
                                                    : 'bg-gray-100 dark:bg-gray-700';
                                                const textColor = rgb
                                                    ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
                                                    : 'text-gray-800 dark:text-gray-200';
                                                
                                                return (
                                                    <span 
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${!rgb ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}`}
                                                        style={rgb ? {
                                                            backgroundColor: bgColor,
                                                            color: textColor,
                                                        } : {}}
                                                    >
                                                        {getStageDisplayLabel(activity.stage)}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4">{activity.date}</td>
                                        <td className="px-6 py-4">{activity.notes}</td>
                                    </tr>
                                    ))
                                 ) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10">
                                            {t('noActivitiesFound')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </PageWrapper>
    );
};
