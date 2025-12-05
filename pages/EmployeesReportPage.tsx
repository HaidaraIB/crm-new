
import React, { useState, useEffect, useMemo } from 'react';
import { PageWrapper, Card, Loader, Button } from '../components/index';
import { useAppContext } from '../context/AppContext';
import { FilterIcon } from '../components/icons';

const reportColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Total Leads', accessor: 'totalLeads' },
    { header: 'Touched Leads', accessor: 'touchedLeads' },
    { header: 'Untouched Leads', accessor: 'untouchedLeads' },
    { header: 'Following', accessor: 'following' },
    { header: 'Meeting', accessor: 'meeting' },
    { header: 'No Answer', accessor: 'noAnswer' },
    { header: 'Out of Service', accessor: 'outOfService' },
    { header: 'Total Calls', accessor: 'totalCalls' },
    { header: 'Total Deals', accessor: 'totalDeals' },
    { header: 'Won Deals', accessor: 'wonDeals' },
];

export const EmployeesReportPage = () => {
    const { t, leads, activities, deals, users, employeesReportFilters, setIsEmployeesReportFilterDrawerOpen } = useAppContext();
    const { leadType, startDate, endDate } = employeesReportFilters;
    const [loading, setLoading] = useState(false);

    // Calculate employee statistics
    const employeeStats = useMemo(() => {
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

        // Group by employee
        return users.map(user => {
            const userLeads = filteredLeads.filter(lead => lead.assignedTo === user.id);
            const userActivities = filteredActivities.filter(activity => activity.user === user.name);
            const callActivities = userActivities.filter(activity => 
                activity.stage === 'call' || activity.stage === 'following'
            );
            const userDeals = filteredDeals.filter(deal => {
                const dealLead = filteredLeads.find(l => l.id === deal.leadId);
                return dealLead?.assignedTo === user.id;
            });

            return {
                id: user.id,
                name: user.name,
                totalLeads: userLeads.length,
                touchedLeads: userLeads.filter(lead => lead.status !== 'Untouched').length,
                untouchedLeads: userLeads.filter(lead => lead.status === 'Untouched').length,
                following: userLeads.filter(lead => lead.status === 'Following').length,
                meeting: userLeads.filter(lead => lead.status === 'Meeting').length,
                noAnswer: userLeads.filter(lead => lead.status === 'No Answer').length,
                outOfService: userLeads.filter(lead => lead.status === 'Out Of Service').length,
                totalCalls: callActivities.length,
                answeredCalls: callActivities.length, // Simplified - would need actual call data
                notAnsweredCalls: 0, // Simplified - would need actual call data
                totalDeals: userDeals.length,
                wonDeals: userDeals.filter(deal => deal.status === 'Won').length,
            };
        }).filter(emp => emp.totalLeads > 0 || emp.totalDeals > 0);
    }, [leads, activities, deals, users, leadType, startDate, endDate]);


    const totalCalls = employeeStats.reduce((sum, emp) => sum + emp.totalCalls, 0);
    const answeredCalls = employeeStats.reduce((sum, emp) => sum + emp.answeredCalls, 0);
    const notAnsweredCalls = employeeStats.reduce((sum, emp) => sum + emp.notAnsweredCalls, 0);

    const handleExport = () => {
        // TODO: Implement export functionality
        alert('Export functionality will be implemented soon');
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
                    <h3 className="text-lg font-semibold text-primary mb-4">Employee Details</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left rtl:text-right">
                            <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    {reportColumns.map(col => (
                                        <th key={col.accessor} className="px-4 py-3 font-semibold whitespace-nowrap">{col.header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {employeeStats.length > 0 ? (
                                    employeeStats.map((emp) => (
                                        <tr key={emp.id} className="bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            {reportColumns.map(col => (
                                                <td key={col.accessor} className="px-4 py-3 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    {emp[col.accessor as keyof typeof emp]}
                                                </td>
                                            ))}
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
