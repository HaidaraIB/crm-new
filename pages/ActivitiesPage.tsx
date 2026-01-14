

import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Loader, Button, FilterIcon, SearchIcon, Input } from '../components/index';
import { Activity, TaskStage } from '../types';
import { getStageDisplayLabel, getStageCategory } from '../utils/taskStageMapper';
import { useClientTasks, useClientCalls, useUsers, useLeads, useStages, useCallMethods } from '../hooks/useQueries';
import { formatDateToLocal } from '../utils/dateUtils';

export const ActivitiesPage = () => {
    const { 
        t, 
        activityFilters,
        setActivityFilters,
        setIsActivitiesFilterDrawerOpen,
    } = useAppContext();

    // Fetch data using React Query
    const { data: clientTasksResponse } = useClientTasks();
    const clientTasks = clientTasksResponse?.results || [];
    
    const { data: clientCallsResponse } = useClientCalls();
    const clientCalls = clientCallsResponse?.results || [];

    const { data: usersResponse } = useUsers();
    const users = usersResponse?.results || [];

    const { data: leadsResponse } = useLeads();
    const leads = leadsResponse?.results || [];

    const { data: stagesData } = useStages();
    const stages = Array.isArray(stagesData) 
        ? stagesData 
        : (stagesData?.results || []);
    
    const { data: callMethodsData } = useCallMethods();
    const callMethods = Array.isArray(callMethodsData) 
        ? callMethodsData 
        : (callMethodsData?.results || []);

    // Combine ClientTasks and ClientCalls, then filter and transform to Activities format
    const filteredActivities = useMemo(() => {
        // Combine client tasks and client calls
        const allActivities = [
            ...clientTasks.map((ct: any) => ({ ...ct, type: 'client_task' })),
            ...clientCalls.map((cc: any) => ({ ...cc, type: 'client_call' })),
        ];
        
        let filtered = allActivities;

        // User filter
        if (activityFilters.user && activityFilters.user !== 'All') {
            filtered = filtered.filter((ct: any) => {
                const createdById = ct.created_by || ct.createdBy;
                return createdById && createdById.toString() === activityFilters.user;
            });
        }

        // Stage filter (for client tasks) or call method filter (for client calls)
        if (activityFilters.stage && activityFilters.stage !== 'All') {
            filtered = filtered.filter((item: any) => {
                if (item.type === 'client_task') {
                    const stageName = item.stage_name || item.stage || '';
                    return stageName === activityFilters.stage;
                } else if (item.type === 'client_call') {
                    const callMethodName = item.call_method_name || item.call_method || '';
                    return callMethodName === activityFilters.stage;
                }
                return false;
            });
        }

        // Lead type filter
        if (activityFilters.leadType && activityFilters.leadType !== 'All') {
            filtered = filtered.filter((ct: any) => {
                const clientId = ct.client || ct.clientId;
                const lead = leads.find(l => l.id === clientId);
                if (!lead) return false;
                const leadType = (lead as any).type || lead.type || '';
                return leadType.toLowerCase() === activityFilters.leadType.toLowerCase();
            });
        }

        // Time period filter
        if (activityFilters.timePeriod && activityFilters.timePeriod !== 'All') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            filtered = filtered.filter((ct: any) => {
                const createdAt = ct.created_at || ct.createdAt;
                const activityDate = new Date(createdAt);
                
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
            filtered = filtered.filter((ct: any) => {
                const createdAt = ct.created_at || ct.createdAt;
                const activityDate = new Date(createdAt);
                activityDate.setHours(0, 0, 0, 0);
                return activityDate >= fromDate;
            });
        }

        if (activityFilters.dateTo) {
            const toDate = new Date(activityFilters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter((ct: any) => {
                const createdAt = ct.created_at || ct.createdAt;
                const activityDate = new Date(createdAt);
                return activityDate <= toDate;
            });
        }

        // Search filter
        if (activityFilters.search) {
            const searchLower = activityFilters.search.toLowerCase();
            filtered = filtered.filter((ct: any) => {
                // Find user and lead names for search
                const createdById = ct.created_by || ct.createdBy;
                const user = users.find(u => u.id === createdById);
                const userName = user?.name || ct.created_by_username || '';
                
                const clientId = ct.client || ct.clientId;
                const lead = leads.find(l => l.id === clientId);
                const leadName = lead?.name || ct.client_name || '';
                
                const notes = ct.notes || '';
                
                return leadName.toLowerCase().includes(searchLower) ||
                    notes.toLowerCase().includes(searchLower) ||
                    userName.toLowerCase().includes(searchLower);
            });
        }

        // Transform filtered ClientTasks and ClientCalls to Activities format
        return filtered.map((item: any) => {
            // Find user by created_by ID
            const createdById = item.created_by || item.createdBy;
            const user = users.find(u => u.id === createdById);
            const userName = user?.name || item.created_by_username || t('unknown');

            // Find lead by client ID
            const clientId = item.client || item.clientId;
            const lead = leads.find(l => l.id === clientId);
            const leadName = lead?.name || item.client_name || t('unknown');

            // Get stage name (for client tasks) or call method name (for client calls)
            let stageName = '';
            let callMethodName = '';
            if (item.type === 'client_task') {
                stageName = item.stage_name || item.stage || '';
            } else if (item.type === 'client_call') {
                callMethodName = item.call_method_name || item.call_method || '';
                // Client calls don't have stages
                stageName = '';
            }

            // Format date
            const createdAt = item.created_at || item.createdAt;
            const formattedDate = formatDateToLocal(createdAt);

            return {
                id: `${item.type}-${item.id}`, // Prefix to avoid conflicts
                user: userName,
                lead: leadName,
                stage: stageName,
                callMethod: callMethodName, // Store call method separately for client calls
                date: formattedDate,
                notes: item.notes || '',
                type: item.type, // Store type for display
            } as Activity & { type?: string; callMethod?: string };
        });
    }, [clientTasks, clientCalls, activityFilters, users, leads, t]);

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
                                    <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('type') || 'Type'}</th>
                                    <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('user')}</th>
                                    <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('lead')}</th>
                                    <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('stage')}</th>
                                    <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('callMethod') || 'Call Method'}</th>
                                    <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('date')}</th>
                                    <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('notes')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredActivities.length > 0 ? (
                                    filteredActivities.map(activity => {
                                        const activityType = (activity as any).type || 'client_task';
                                        const typeLabel = activityType === 'client_task' 
                                            ? (t('action') || 'Action')
                                            : (t('call') || 'Call');
                                        
                                        return (
                                    <tr key={activity.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                activityType === 'client_task' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            }`}>
                                                {typeLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap text-center">{activity.user}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">{activity.lead}</td>
                                        <td className="px-6 py-4 text-center">
                                            {(() => {
                                                let stageConfig = null;
                                                let callMethodConfig = null;
                                                let stageColor = '#808080';
                                                let displayName = '';
                                                
                                                if (activityType === 'client_task') {
                                                    // For client tasks, use stage
                                                    const stageName = typeof activity.stage === 'string' 
                                                        ? activity.stage.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                                                        : activity.stage;
                                                    displayName = stageName;
                                                    stageConfig = stages.find(s => 
                                                        s.name.toLowerCase().replace(/\s+/g, '_') === stageName.toLowerCase().replace(/\s+/g, '_') ||
                                                        s.name === stageName
                                                    );
                                                    stageColor = stageConfig?.color || '#808080';
                                                } else if (activityType === 'client_call') {
                                                    // For client calls, use call method (not stage)
                                                    const callMethodName = (activity as any).callMethod || '';
                                                    displayName = callMethodName;
                                                    callMethodConfig = callMethods.find(c => 
                                                        c.name.toLowerCase().replace(/\s+/g, '_') === callMethodName.toLowerCase().replace(/\s+/g, '_') ||
                                                        c.name === callMethodName
                                                    );
                                                    stageColor = callMethodConfig?.color || '#808080';
                                                }
                                                
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
                                                
                                                if (activityType === 'client_call') {
                                                    // Client calls don't have stages - show "-"
                                                    return (
                                                        <span className="text-sm text-gray-400 dark:text-gray-500 italic">-</span>
                                                    );
                                                } else {
                                                    // For client tasks, show stage
                                                    return (
                                                        <span 
                                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!rgb ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}`}
                                                            style={rgb ? {
                                                                backgroundColor: bgColor,
                                                                color: textColor,
                                                            } : {}}
                                                        >
                                                            {getStageDisplayLabel(displayName)}
                                                        </span>
                                                    );
                                                }
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {(() => {
                                                if (activityType === 'client_call') {
                                                    // Show call method for client calls
                                                    const callMethodName = (activity as any).callMethod || '';
                                                    const callMethodConfig = callMethods.find(c => 
                                                        c.name.toLowerCase().replace(/\s+/g, '_') === callMethodName.toLowerCase().replace(/\s+/g, '_') ||
                                                        c.name === callMethodName
                                                    );
                                                    const callMethodColor = callMethodConfig?.color || '#808080';
                                                    
                                                    const hexToRgb = (hex: string) => {
                                                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                                        return result ? {
                                                            r: parseInt(result[1], 16),
                                                            g: parseInt(result[2], 16),
                                                            b: parseInt(result[3], 16)
                                                        } : null;
                                                    };
                                                    
                                                    const rgb = hexToRgb(callMethodColor);
                                                    const bgColor = rgb 
                                                        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`
                                                        : 'bg-gray-100 dark:bg-gray-700';
                                                    const textColor = rgb
                                                        ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
                                                        : 'text-gray-800 dark:text-gray-200';
                                                    
                                                    return (
                                                        <span 
                                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!rgb ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}`}
                                                            style={rgb ? {
                                                                backgroundColor: bgColor,
                                                                color: textColor,
                                                            } : {}}
                                                        >
                                                            {callMethodName || '-'}
                                                        </span>
                                                    );
                                                } else {
                                                    // Other activity types don't have call methods
                                                    return (
                                                        <span className="text-sm text-gray-400 dark:text-gray-500 italic">-</span>
                                                    );
                                                }
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">{activity.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">{activity.notes}</td>
                                    </tr>
                                    );
                                    })
                                 ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10">
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
