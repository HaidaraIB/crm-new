
import React, { useState, useEffect, useMemo } from 'react';
import { PageWrapper, Card, Loader, Button } from '../components/index';
import { useAppContext } from '../context/AppContext';
import { FilterIcon } from '../components/icons';
import { useLeads, useDeals, useActivities, useUsers, useClientTasks, useClientCalls } from '../hooks/useQueries';
import { User } from '../types';

// Helper function to get user display name
const getUserDisplayName = (user: User): string => {
    if (user.first_name || user.last_name) {
        return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.name || user.username || user.email || `User ${user.id}`;
};

export const TeamsReportPage = () => {
    const { t, teamsReportFilters, setIsTeamsReportFilterDrawerOpen } = useAppContext();
    const { selectedTeam, leadType, startDate, endDate } = teamsReportFilters;
    const [loading, setLoading] = useState(false);
    
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

    // Calculate team statistics
    const teamStats = useMemo(() => {
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

        // Group by team/user
        const teamData: { [key: string]: any } = {};
        
        safeUsers.forEach(user => {
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
            
            const userDeals = filteredDeals.filter(deal => {
                const dealLead = filteredLeads.find(l => l.id === deal.leadId);
                return dealLead?.assignedTo === user.id;
            });

            const touchedLeads = userLeads.filter(lead => lead.status !== 'Untouched').length;
            const untouchedLeads = userLeads.filter(lead => lead.status === 'Untouched').length;
            const followingLeads = userLeads.filter(lead => lead.status === 'Following').length;
            const meetingLeads = userLeads.filter(lead => lead.status === 'Meeting').length;
            const wonDeals = userDeals.filter(deal => deal.status === 'Won').length;

            teamData[userName] = {
                name: userName,
                totalLeads: userLeads.length,
                touchedLeads,
                untouchedLeads,
                followingLeads,
                meetingLeads,
                totalActivities: userActivities.length + userClientTasks.length + userClientCalls.length,
                totalClientTasks: userClientTasks.length,
                totalClientCalls: userClientCalls.length,
                totalDeals: userDeals.length,
                wonDeals,
            };
        });

        return Object.values(teamData);
    }, [leads, activities, deals, users, clientTasks, clientCalls, leadType, startDate, endDate]);


    const handleExport = () => {
        // TODO: Implement export functionality
        alert(t('exportFunctionalityComingSoon') || 'Export functionality will be implemented soon');
    };

    if (loading) {
        return (
            <PageWrapper title={t('teamsReport')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title={t('teamsReport')}
            actions={
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setIsTeamsReportFilterDrawerOpen(true)} className="w-full sm:w-auto">
                        <FilterIcon className="h-4 w-4 inline-block mr-2" />
                        {t('filter') || 'Filter'}
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="w-full sm:w-auto">
                        {t('export') || 'Export'}
                    </Button>
                </div>
            }
        >
            {teamStats.length > 0 ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card className="border border-gray-200/50 dark:border-gray-700/50">
                            <div className="p-4">
                                <p className="text-sm text-secondary mb-1">{t('totalTeams') || 'Total Teams'}</p>
                                <p className="text-2xl font-bold text-primary">{teamStats.length}</p>
                            </div>
                        </Card>
                        <Card className="border border-gray-200/50 dark:border-gray-700/50">
                            <div className="p-4">
                                <p className="text-sm text-secondary mb-1">{t('totalLeads') || 'Total Leads'}</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {teamStats.reduce((sum, team) => sum + team.totalLeads, 0)}
                                </p>
                            </div>
                        </Card>
                        <Card className="border border-gray-200/50 dark:border-gray-700/50">
                            <div className="p-4">
                                <p className="text-sm text-secondary mb-1">{t('totalActivities') || 'Total Activities'}</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {teamStats.reduce((sum, team) => sum + team.totalActivities, 0)}
                                </p>
                            </div>
                        </Card>
                        <Card className="border border-gray-200/50 dark:border-gray-700/50">
                            <div className="p-4">
                                <p className="text-sm text-secondary mb-1">{t('totalDeals') || 'Total Deals'}</p>
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {teamStats.reduce((sum, team) => sum + team.totalDeals, 0)}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Team Details Table */}
                    <Card className="border border-gray-200/50 dark:border-gray-700/50">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-primary mb-4">{t('teamDetails') || 'Team Details'}</h3>
                            <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg">
                                <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400" style={{ minWidth: '800px' }}>
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('teamUser') || 'Team/User'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('totalLeads') || 'Total Leads'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('touched') || 'Touched'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('untouched') || 'Untouched'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('following') || 'Following'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('meeting') || 'Meeting'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('activities') || 'Activities'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('deals') || 'Deals'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('wonDeals') || 'Won Deals'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                                        {teamStats.map((team, index) => (
                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{team.name}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-gray-900 dark:text-gray-100">{team.totalLeads.toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-green-600 dark:text-green-400 font-semibold">{team.touchedLeads.toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-amber-600 dark:text-amber-400 font-semibold">{team.untouchedLeads.toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-blue-600 dark:text-blue-400">{team.followingLeads.toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-purple-600 dark:text-purple-400">{team.meetingLeads.toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-gray-900 dark:text-gray-100">{team.totalActivities.toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-gray-900 dark:text-gray-100">{team.totalDeals.toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">{team.wonDeals.toLocaleString()}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Card>
                </>
            ) : (
                <Card className="border border-gray-200/50 dark:border-gray-700/50">
                <div className="text-center py-10">
                    <p className="text-tertiary">{t('selectFiltersPrompt')}</p>
                </div>
            </Card>
            )}
        </PageWrapper>
    );
};
