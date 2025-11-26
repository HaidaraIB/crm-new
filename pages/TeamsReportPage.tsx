
import React, { useState, useEffect, useMemo } from 'react';
import { PageWrapper, Card, Loader, Button } from '../components/index';
import { useAppContext } from '../context/AppContext';
import { FilterIcon } from '../components/icons';

export const TeamsReportPage = () => {
    const { t, leads, activities, deals, users, teamsReportFilters, setIsTeamsReportFilterDrawerOpen } = useAppContext();
    const { selectedTeam, leadType, startDate, endDate } = teamsReportFilters;
    const [loading, setLoading] = useState(false);

    // Calculate team statistics
    const teamStats = useMemo(() => {
        let filteredLeads = leads;
        let filteredActivities = activities;
        let filteredDeals = deals;

        // Filter by lead type
        if (leadType !== 'all') {
            filteredLeads = filteredLeads.filter(lead => 
                lead.type.toLowerCase() === leadType
            );
        }

        // Filter by date range
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            filteredLeads = filteredLeads.filter(lead => {
                const leadDate = new Date(lead.createdAt);
                return leadDate >= start && leadDate <= end;
            });
            filteredActivities = filteredActivities.filter(activity => {
                const activityDate = new Date(activity.date);
                return activityDate >= start && activityDate <= end;
            });
        }

        // Group by team/user
        const teamData: { [key: string]: any } = {};
        
        users.forEach(user => {
            const userLeads = filteredLeads.filter(lead => lead.assignedTo === user.id);
            const userActivities = filteredActivities.filter(activity => activity.user === user.name);
            const userDeals = filteredDeals.filter(deal => {
                const dealLead = filteredLeads.find(l => l.id === deal.leadId);
                return dealLead?.assignedTo === user.id;
            });

            const touchedLeads = userLeads.filter(lead => lead.status !== 'Untouched').length;
            const untouchedLeads = userLeads.filter(lead => lead.status === 'Untouched').length;
            const followingLeads = userLeads.filter(lead => lead.status === 'Following').length;
            const meetingLeads = userLeads.filter(lead => lead.status === 'Meeting').length;
            const wonDeals = userDeals.filter(deal => deal.status === 'Won').length;

            teamData[user.name] = {
                name: user.name,
                totalLeads: userLeads.length,
                touchedLeads,
                untouchedLeads,
                followingLeads,
                meetingLeads,
                totalActivities: userActivities.length,
                totalDeals: userDeals.length,
                wonDeals,
            };
        });

        return Object.values(teamData);
    }, [leads, activities, deals, users, leadType, startDate, endDate]);


    const handleExport = () => {
        // TODO: Implement export functionality
        alert('Export functionality will be implemented soon');
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
                                <p className="text-sm text-secondary mb-1">Total Teams</p>
                                <p className="text-2xl font-bold text-primary">{teamStats.length}</p>
                            </div>
                        </Card>
                        <Card className="border border-gray-200/50 dark:border-gray-700/50">
                            <div className="p-4">
                                <p className="text-sm text-secondary mb-1">Total Leads</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {teamStats.reduce((sum, team) => sum + team.totalLeads, 0)}
                                </p>
                            </div>
                        </Card>
                        <Card className="border border-gray-200/50 dark:border-gray-700/50">
                            <div className="p-4">
                                <p className="text-sm text-secondary mb-1">Total Activities</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {teamStats.reduce((sum, team) => sum + team.totalActivities, 0)}
                                </p>
                            </div>
                        </Card>
                        <Card className="border border-gray-200/50 dark:border-gray-700/50">
                            <div className="p-4">
                                <p className="text-sm text-secondary mb-1">Total Deals</p>
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {teamStats.reduce((sum, team) => sum + team.totalDeals, 0)}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Team Details Table */}
                    <Card className="border border-gray-200/50 dark:border-gray-700/50">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-primary mb-4">Team Details</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left rtl:text-right">
                                    <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Team/User</th>
                                            <th className="px-4 py-3 font-semibold">Total Leads</th>
                                            <th className="px-4 py-3 font-semibold">Touched</th>
                                            <th className="px-4 py-3 font-semibold">Untouched</th>
                                            <th className="px-4 py-3 font-semibold">Following</th>
                                            <th className="px-4 py-3 font-semibold">Meeting</th>
                                            <th className="px-4 py-3 font-semibold">Activities</th>
                                            <th className="px-4 py-3 font-semibold">Deals</th>
                                            <th className="px-4 py-3 font-semibold">Won Deals</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {teamStats.map((team, index) => (
                                            <tr key={index} className="bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{team.name}</td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{team.totalLeads}</td>
                                                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">{team.touchedLeads}</td>
                                                <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-semibold">{team.untouchedLeads}</td>
                                                <td className="px-4 py-3 text-blue-600 dark:text-blue-400">{team.followingLeads}</td>
                                                <td className="px-4 py-3 text-purple-600 dark:text-purple-400">{team.meetingLeads}</td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{team.totalActivities}</td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{team.totalDeals}</td>
                                                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">{team.wonDeals}</td>
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
