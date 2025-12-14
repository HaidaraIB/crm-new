
import React, { useState, useEffect, useMemo } from 'react';
import { PageWrapper, Card, Loader, Button } from '../components/index';
import { useAppContext } from '../context/AppContext';
import { FilterIcon } from '../components/icons';
import { useCampaigns, useLeads } from '../hooks/useQueries';

export const MarketingReportPage = () => {
    const { t, marketingReportFilters, setIsMarketingReportFilterDrawerOpen } = useAppContext();
    const { selectedCampaign, startDate, endDate } = marketingReportFilters;
    const [loading, setLoading] = useState(false);
    
    // Fetch data using React Query
    const { data: campaignsData } = useCampaigns();
    const campaigns = Array.isArray(campaignsData) 
        ? campaignsData 
        : (campaignsData?.results || []);
    
    const { data: leadsData } = useLeads();
    const leads = Array.isArray(leadsData) 
        ? leadsData 
        : (leadsData?.results || []);

    // Calculate campaign statistics
    const campaignStats = useMemo(() => {
        // Ensure all data is arrays
        const safeLeads = Array.isArray(leads) ? leads : [];
        const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
        
        let filteredLeads = safeLeads;

        // Filter by campaign (if we had campaign association in leads)
        // For now, we'll show all leads
        if (selectedCampaign !== 'all') {
            // TODO: Filter by campaign when campaign association is added to leads
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
        }

        // Calculate campaign performance
        return safeCampaigns.map(campaign => {
            // For now, we'll show general stats since we don't have campaign association
            const campaignLeads = filteredLeads; // Would filter by campaign.id if available
            const convertedLeads = campaignLeads.filter(lead => lead.status === 'Meeting' || lead.status === 'Following').length;

            return {
                id: campaign.id,
                name: campaign.name,
                budget: campaign.budget,
                totalLeads: campaignLeads.length,
                convertedLeads,
                conversionRate: campaignLeads.length > 0 ? (convertedLeads / campaignLeads.length * 100).toFixed(1) : '0',
                costPerLead: campaignLeads.length > 0 ? (campaign.budget / campaignLeads.length).toFixed(2) : '0',
            };
        });
    }, [campaigns, leads, selectedCampaign, startDate, endDate]);


    const handleExport = () => {
        // TODO: Implement export functionality
        alert(t('exportFunctionalityComingSoon') || 'Export functionality will be implemented soon');
    };

    if (loading) {
        return (
            <PageWrapper title={t('marketingReport')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title={t('marketingReport')}
            actions={
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setIsMarketingReportFilterDrawerOpen(true)} className="w-full sm:w-auto">
                        <FilterIcon className="h-4 w-4 inline-block mr-2" />
                        {t('filter') || 'Filter'}
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="w-full sm:w-auto">
                        {t('export') || 'Export'}
                    </Button>
                </div>
            }
        >
            {campaignStats.length > 0 ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card className="border border-gray-200/50 dark:border-gray-700/50">
                            <div className="p-4">
                                <p className="text-sm text-secondary mb-1">{t('totalCampaigns') || 'Total Campaigns'}</p>
                                <p className="text-2xl font-bold text-primary">{campaignStats.length}</p>
                            </div>
                        </Card>
                        <Card className="border border-gray-200/50 dark:border-gray-700/50">
                            <div className="p-4">
                                <p className="text-sm text-secondary mb-1">{t('totalBudget') || 'Total Budget'}</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {campaignStats.reduce((sum, camp) => sum + camp.budget, 0).toLocaleString()}
                                </p>
                            </div>
                        </Card>
                        <Card className="border border-gray-200/50 dark:border-gray-700/50">
                            <div className="p-4">
                                <p className="text-sm text-secondary mb-1">{t('totalLeads') || 'Total Leads'}</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {campaignStats.reduce((sum, camp) => sum + camp.totalLeads, 0)}
                                </p>
                            </div>
                        </Card>
                        <Card className="border border-gray-200/50 dark:border-gray-700/50">
                            <div className="p-4">
                                <p className="text-sm text-secondary mb-1">{t('avgConversionRate') || 'Avg Conversion Rate'}</p>
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {campaignStats.length > 0 
                                        ? (campaignStats.reduce((sum, camp) => sum + parseFloat(camp.conversionRate), 0) / campaignStats.length).toFixed(1)
                                        : '0'
                                    }%
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Campaign Details Table */}
                    <Card className="border border-gray-200/50 dark:border-gray-700/50">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-primary mb-4">{t('campaignDetails') || 'Campaign Details'}</h3>
                            <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg">
                                <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400" style={{ minWidth: '800px' }}>
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('campaign') || 'Campaign'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('budget') || 'Budget'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('totalLeads') || 'Total Leads'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('converted') || 'Converted'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('conversionRate') || 'Conversion Rate'}</th>
                                            <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('costPerLead') || 'Cost per Lead'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                                        {campaignStats.map((campaign) => (
                                            <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{campaign.name}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-gray-900 dark:text-gray-100">{campaign.budget.toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-gray-900 dark:text-gray-100">{campaign.totalLeads.toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-green-600 dark:text-green-400 font-semibold">{campaign.convertedLeads.toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{campaign.conversionRate}%</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm text-gray-900 dark:text-gray-100">{parseFloat(campaign.costPerLead).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                        <p className="text-tertiary">{t('noDataAvailable')}</p>
                    </div>
                </Card>
            )}
        </PageWrapper>
    );
};
