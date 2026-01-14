
import React, { useState, useEffect, useMemo } from 'react';
import { PageWrapper, Card, Loader, Button } from '../components/index';
import { useAppContext } from '../context/AppContext';
import { FilterIcon } from '../components/icons';
import { useLeads, useDeals, useActivities, useUsers, useClientTasks, useClientCalls } from '../hooks/useQueries';
import { User } from '../types';
import { translations } from '../constants';

// Helper function to get user display name
const getUserDisplayName = (user: User): string => {
    if (user.first_name || user.last_name) {
        return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.name || user.username || user.email || `User ${user.id}`;
};

// Helper function to get translated column headers
const getReportColumns = (t: (key: keyof typeof translations.en) => string) => [
    { header: t('name') || 'Name', accessor: 'name' },
    { header: t('totalLeads') || 'Total Leads', accessor: 'totalLeads' },
    { header: t('touchedLeads') || 'Touched Leads', accessor: 'touchedLeads' },
    { header: t('untouchedLeads') || 'Untouched Leads', accessor: 'untouchedLeads' },
    { header: t('following') || 'Following', accessor: 'following' },
    { header: t('meeting') || 'Meeting', accessor: 'meeting' },
    { header: t('noAnswer') || 'No Answer', accessor: 'noAnswer' },
    { header: t('outOfService') || 'Out of Service', accessor: 'outOfService' },
    { header: t('totalCalls') || 'Total Calls', accessor: 'totalCalls' },
    { header: t('totalDeals') || 'Total Deals', accessor: 'totalDeals' },
    { header: t('wonDeals') || 'Won Deals', accessor: 'wonDeals' },
];

export const EmployeesReportPage = () => {
    const { t, employeesReportFilters, setIsEmployeesReportFilterDrawerOpen } = useAppContext();
    const { leadType, startDate, endDate } = employeesReportFilters;
    const [loading, setLoading] = useState(false);
    
    // Get translated column headers
    const reportColumns = getReportColumns(t);
    
    // Fetch data using React Query
    const { data: leadsData } = useLeads();
    const leads = Array.isArray(leadsData) 
        ? leadsData 
        : (leadsData?.results || []);
    
    const { data: dealsData } = useDeals();
    const deals = Array.isArray(dealsData) 
        ? dealsData 
        : (dealsData?.results || []);
    
    const { data: activitiesData } = useActivities();
    const activities = Array.isArray(activitiesData) 
        ? activitiesData 
        : (activitiesData?.results || []);
    
    // Fetch client tasks and client calls for reports
    const { data: clientTasksData } = useClientTasks();
    const clientTasks = Array.isArray(clientTasksData) 
        ? clientTasksData 
        : (clientTasksData?.results || []);
    
    const { data: clientCallsData } = useClientCalls();
    const clientCalls = Array.isArray(clientCallsData) 
        ? clientCallsData 
        : (clientCallsData?.results || []);
    
    const { data: usersData } = useUsers();
    const users = Array.isArray(usersData) 
        ? usersData 
        : (usersData?.results || []);

    // Calculate employee statistics
    const employeeStats = useMemo(() => {
        // Ensure all data is arrays
        const safeLeads = Array.isArray(leads) ? leads : [];
        const safeActivities = Array.isArray(activities) ? activities : [];
        const safeDeals = Array.isArray(deals) ? deals : [];
        const safeUsers = Array.isArray(users) ? users : [];
        const safeClientTasks = Array.isArray(clientTasks) ? clientTasks : [];
        const safeClientCalls = Array.isArray(clientCalls) ? clientCalls : [];
        
        let filteredLeads = safeLeads;
        let filteredActivities = safeActivities;
        let filteredDeals = safeDeals;
        let filteredClientTasks = safeClientTasks;
        let filteredClientCalls = safeClientCalls;

        // Filter by lead type
        if (leadType !== 'all') {
            filteredLeads = filteredLeads.filter(lead => 
                lead.type?.toLowerCase() === leadType
            );
        }

        // Filter by date range
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            filteredLeads = filteredLeads.filter(lead => {
                if (!lead.createdAt) return false;
                const leadDate = new Date(lead.createdAt);
                return leadDate >= start && leadDate <= end;
            });
            filteredActivities = filteredActivities.filter(activity => {
                if (!activity.date) return false;
                const activityDate = new Date(activity.date);
                return activityDate >= start && activityDate <= end;
            });
            filteredClientTasks = filteredClientTasks.filter((ct: any) => {
                const createdAt = ct.created_at || ct.createdAt;
                if (!createdAt) return false;
                const taskDate = new Date(createdAt);
                return taskDate >= start && taskDate <= end;
            });
            filteredClientCalls = filteredClientCalls.filter((cc: any) => {
                const createdAt = cc.created_at || cc.createdAt;
                if (!createdAt) return false;
                const callDate = new Date(createdAt);
                return callDate >= start && callDate <= end;
            });
        }

        // Group by employee
        return safeUsers.map(user => {
            const userName = getUserDisplayName(user);
            const userLeads = filteredLeads.filter(lead => lead.assignedTo === user.id);
            const userActivities = filteredActivities.filter(activity => {
                // Match by user name or user ID
                return activity.user === userName || activity.user === user.name || activity.userId === user.id;
            });
            
            // Get user's client tasks
            const userClientTasks = filteredClientTasks.filter((ct: any) => {
                const createdById = ct.created_by || ct.createdBy;
                return createdById === user.id;
            });
            
            // Get user's client calls
            const userClientCalls = filteredClientCalls.filter((cc: any) => {
                const createdById = cc.created_by || cc.createdBy;
                return createdById === user.id;
            });
            
            const callActivities = userActivities.filter(activity => 
                activity.stage === 'call' || activity.stage === 'following'
            );
            const userDeals = filteredDeals.filter(deal => {
                const dealLead = filteredLeads.find(l => l.id === deal.leadId);
                return dealLead?.assignedTo === user.id;
            });

            return {
                id: user.id,
                name: userName,
                totalLeads: userLeads.length,
                touchedLeads: userLeads.filter(lead => lead.status !== 'Untouched').length,
                untouchedLeads: userLeads.filter(lead => lead.status === 'Untouched').length,
                following: userLeads.filter(lead => lead.status === 'Following').length,
                meeting: userLeads.filter(lead => lead.status === 'Meeting').length,
                noAnswer: userLeads.filter(lead => lead.status === 'No Answer').length,
                outOfService: userLeads.filter(lead => lead.status === 'Out Of Service').length,
                totalCalls: callActivities.length + userClientCalls.length, // Include client calls
                answeredCalls: callActivities.length + userClientCalls.length, // Simplified - would need actual call data
                notAnsweredCalls: 0, // Simplified - would need actual call data
                totalClientTasks: userClientTasks.length,
                totalClientCalls: userClientCalls.length,
                totalDeals: userDeals.length,
                wonDeals: userDeals.filter(deal => deal.status === 'Won').length,
            };
        }).filter(emp => emp.totalLeads > 0 || emp.totalDeals > 0);
    }, [leads, activities, deals, users, clientTasks, clientCalls, leadType, startDate, endDate]);


    const totalCalls = employeeStats.reduce((sum, emp) => sum + emp.totalCalls, 0);
    const answeredCalls = employeeStats.reduce((sum, emp) => sum + emp.answeredCalls, 0);
    const notAnsweredCalls = employeeStats.reduce((sum, emp) => sum + emp.notAnsweredCalls, 0);

    const handleExport = () => {
        // TODO: Implement export functionality
        alert(t('exportFunctionalityComingSoon') || 'Export functionality will be implemented soon');
    };

    if (loading) {
        return (
            <PageWrapper title={t('employeesReport')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title={t('employeesReport')}
            actions={
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setIsEmployeesReportFilterDrawerOpen(true)} className="w-full sm:w-auto">
                        <FilterIcon className="h-4 w-4 inline-block mr-2" />
                        {t('filter') || 'Filter'}
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="w-full sm:w-auto">
                        {t('export') || 'Export'}
                    </Button>
                </div>
            }
        >
            {/* Summary Card */}
            <Card className="mb-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-4 flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <strong className="text-primary">{t('totalCalls')}:</strong>
                        <span className="text-lg font-semibold text-secondary">{totalCalls}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-secondary">{t('answered')}: {answeredCalls}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-secondary">{t('notAnswered')}: {notAnsweredCalls}</span>
                    </div>
                </div>
            </Card>

            {/* Employee Details Table */}
            <Card className="border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-primary mb-4">{t('employeeDetails') || 'Employee Details'}</h3>
                    <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg">
                        <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400" style={{ minWidth: '1000px' }}>
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    {reportColumns.map(col => (
                                        <th key={col.accessor} scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{col.header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                                {employeeStats.length > 0 ? (
                                    employeeStats.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                            {reportColumns.map(col => {
                                                const value = emp[col.accessor as keyof typeof emp];
                                                // Format numbers with toLocaleString
                                                const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
                                                return (
                                                    <td key={col.accessor} className="px-4 py-4 whitespace-nowrap text-center">
                                                        <span className="text-sm text-gray-900 dark:text-gray-100">{displayValue}</span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={reportColumns.length} className="px-4 py-8 text-center text-tertiary">
                                            {t('noDataAvailable')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </PageWrapper>
    );
};
