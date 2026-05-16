import React, { useMemo } from 'react';
import { PageWrapper, Button } from '../components/index';
import { useAppContext } from '../context/AppContext';
import { FilterIcon, UsersIcon, TargetIcon, CheckSquareIcon, DealIcon } from '../components/icons';
import { useLeads, useDeals, useActivities, useUsers, useClientTasks, useClientCalls } from '../hooks/useQueries';
import { User } from '../types';
import { showInLeadAssigneePicker } from '../utils/roles';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../utils/dateUtils';
import { reportPageContainer } from '../components/reports/reportStyles';
import { ReportHero } from '../components/reports/ReportHero';
import { ReportSummaryTile } from '../components/reports/ReportSummaryTile';
import { ReportTableCard, ReportTableDefaults } from '../components/reports/ReportTableCard';

// Helper function to get user display name
const getUserDisplayName = (user: User): string => {
    if (user.first_name || user.last_name) {
        return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.name || user.username || user.email || `User ${user.id}`;
};

export const TeamsReportPage = () => {
    const { t, teamsReportFilters, setIsTeamsReportFilterDrawerOpen, language } = useAppContext();
    const { leadType, startDate, endDate } = teamsReportFilters;
    const reportHeroSubtitle = useMemo(() => {
        const locale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US';
        let range = t('reportsAllDates');
        if (startDate && endDate) {
            try {
                const s = new Date(startDate);
                const e = new Date(endDate);
                if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
                    range = `${s.toLocaleDateString(locale, withLatinDigits())} — ${e.toLocaleDateString(locale, withLatinDigits())}`;
                }
            } catch {
                /* ignore */
            }
        }
        return `${range}. ${t('reportsPageHint')}`;
    }, [language, startDate, endDate, t]);
    
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
        const safeUsers = (Array.isArray(users) ? users : []).filter((u) =>
            showInLeadAssigneePicker(u.role)
        );
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

    return (
        <PageWrapper
            title={t('teamsReport')}
            actions={
                <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
                    <Button
                        variant="secondary"
                        onClick={() => setIsTeamsReportFilterDrawerOpen(true)}
                        className="w-full sm:w-auto rounded-xl px-5 py-2.5 border border-gray-200/90 dark:border-gray-600 bg-white/90 dark:bg-gray-800 shadow-sm hover:shadow-md"
                    >
                        <FilterIcon className="h-4 w-4 shrink-0" />
                        {t('filter') || 'Filter'}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleExport}
                        className="w-full sm:w-auto rounded-xl px-5 py-2.5 border border-gray-200/90 dark:border-gray-600 bg-white/90 dark:bg-gray-800 shadow-sm hover:shadow-md"
                    >
                        {t('export') || 'Export'}
                    </Button>
                </div>
            }
        >
            <div className={reportPageContainer}>
                <ReportHero
                    title={t('teamsReport')}
                    subtitle={reportHeroSubtitle}
                    language={language}
                />

                {teamStats.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            <ReportSummaryTile
                                title={t('totalTeams') || 'Total Teams'}
                                value={teamStats.length}
                                accent="indigo"
                                icon={<UsersIcon />}
                            />
                            <ReportSummaryTile
                                title={t('totalLeads') || 'Total Leads'}
                                value={teamStats.reduce((sum, team) => sum + team.totalLeads, 0).toLocaleString(undefined, withLatinDigits())}
                                accent="blue"
                                icon={<TargetIcon />}
                            />
                            <ReportSummaryTile
                                title={t('totalActivities') || 'Total Activities'}
                                value={teamStats.reduce((sum, team) => sum + team.totalActivities, 0).toLocaleString(undefined, withLatinDigits())}
                                accent="emerald"
                                icon={<CheckSquareIcon />}
                            />
                            <ReportSummaryTile
                                title={t('totalDeals') || 'Total Deals'}
                                value={teamStats.reduce((sum, team) => sum + team.totalDeals, 0).toLocaleString(undefined, withLatinDigits())}
                                accent="violet"
                                icon={<DealIcon />}
                            />
                        </div>

                        <ReportTableCard
                            title={t('teamDetails') || 'Team Details'}
                            empty={false}
                            emptyMessage={t('noDataAvailable')}
                            minWidth={900}
                        >
                            <thead className={`${ReportTableDefaults.theadRow}`}>
                                <tr>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{t('teamUser') || 'Team/User'}</th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{t('totalLeads') || 'Total Leads'}</th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{t('touched') || 'Touched'}</th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{t('untouched') || 'Untouched'}</th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{t('following') || 'Following'}</th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{t('meeting') || 'Meeting'}</th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{t('activities') || 'Activities'}</th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{t('deals') || 'Deals'}</th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{t('wonDeals') || 'Won Deals'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamStats.map((team, index) => (
                                    <tr key={index} className={ReportTableDefaults.tbodyRow}>
                                        <td className={`${ReportTableDefaults.tbodyCell} font-semibold`}>{team.name}</td>
                                        <td className={ReportTableDefaults.tbodyCell}>{team.totalLeads.toLocaleString(undefined, withLatinDigits())}</td>
                                        <td className={`${ReportTableDefaults.tbodyCell} text-green-600 dark:text-green-400 font-semibold`}>
                                            {team.touchedLeads.toLocaleString(undefined, withLatinDigits())}
                                        </td>
                                        <td className={`${ReportTableDefaults.tbodyCell} text-amber-600 dark:text-amber-400 font-semibold`}>
                                            {team.untouchedLeads.toLocaleString(undefined, withLatinDigits())}
                                        </td>
                                        <td className={`${ReportTableDefaults.tbodyCell} text-blue-600 dark:text-blue-400`}>
                                            {team.followingLeads.toLocaleString(undefined, withLatinDigits())}
                                        </td>
                                        <td className={`${ReportTableDefaults.tbodyCell} text-purple-600 dark:text-purple-400`}>
                                            {team.meetingLeads.toLocaleString(undefined, withLatinDigits())}
                                        </td>
                                        <td className={ReportTableDefaults.tbodyCell}>{team.totalActivities.toLocaleString(undefined, withLatinDigits())}</td>
                                        <td className={ReportTableDefaults.tbodyCell}>{team.totalDeals.toLocaleString(undefined, withLatinDigits())}</td>
                                        <td className={`${ReportTableDefaults.tbodyCell} text-emerald-600 dark:text-emerald-400 font-semibold`}>
                                            {team.wonDeals.toLocaleString(undefined, withLatinDigits())}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </ReportTableCard>
                    </>
                ) : (
                    <ReportTableCard
                        title={t('teamDetails') || 'Team Details'}
                        empty
                        emptyMessage={t('selectFiltersPrompt')}
                        minWidth={800}
                    />
                )}
            </div>
        </PageWrapper>
    );
};
