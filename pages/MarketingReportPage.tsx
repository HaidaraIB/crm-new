import React, { useMemo } from 'react';
import { PageWrapper, Button } from '../components/index';
import { useAppContext } from '../context/AppContext';
import { FilterIcon, MegaphoneIcon, TargetIcon, CheckIcon, ChartIcon } from '../components/icons';
import { useCampaigns, useLeads } from '../hooks/useQueries';
import { ARABIC_DATE_LOCALE } from '../utils/dateUtils';
import { reportPageContainer } from '../components/reports/reportStyles';
import { ReportHero } from '../components/reports/ReportHero';
import { ReportSummaryTile } from '../components/reports/ReportSummaryTile';
import { ReportTableCard, ReportTableDefaults } from '../components/reports/ReportTableCard';

export const MarketingReportPage = () => {
    const { t, marketingReportFilters, setIsMarketingReportFilterDrawerOpen, language } = useAppContext();
    const { selectedCampaign, startDate, endDate } = marketingReportFilters;

    const reportHeroSubtitle = useMemo(() => {
        const locale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US';
        let range = t('reportsAllDates');
        if (startDate && endDate) {
            try {
                const s = new Date(startDate);
                const e = new Date(endDate);
                if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
                    range = `${s.toLocaleDateString(locale)} — ${e.toLocaleDateString(locale)}`;
                }
            } catch {
                /* ignore */
            }
        }
        return `${range}. ${t('reportsPageHint')}`;
    }, [language, startDate, endDate, t]);
    
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

    const totalBudget = campaignStats.reduce((sum, camp) => sum + camp.budget, 0);
    const leadsSum = campaignStats.reduce((sum, camp) => sum + camp.totalLeads, 0);
    const avgConversion =
        campaignStats.length > 0
            ? (
                  campaignStats.reduce((sum, camp) => sum + parseFloat(String(camp.conversionRate)), 0) /
                  campaignStats.length
              ).toFixed(1)
            : '0';

    return (
        <PageWrapper
            title={t('marketingReport')}
            actions={
                <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
                    <Button
                        variant="secondary"
                        onClick={() => setIsMarketingReportFilterDrawerOpen(true)}
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
                    title={t('marketingReport')}
                    subtitle={reportHeroSubtitle}
                    language={language}
                />

                {campaignStats.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            <ReportSummaryTile
                                title={t('totalCampaigns') || 'Total Campaigns'}
                                value={campaignStats.length}
                                accent="indigo"
                                icon={<MegaphoneIcon />}
                            />
                            <ReportSummaryTile
                                title={t('totalBudget') || 'Total Budget'}
                                value={totalBudget.toLocaleString()}
                                accent="blue"
                                icon={<ChartIcon />}
                            />
                            <ReportSummaryTile
                                title={t('totalLeads') || 'Total Leads'}
                                value={leadsSum.toLocaleString()}
                                accent="emerald"
                                icon={<TargetIcon />}
                            />
                            <ReportSummaryTile
                                title={t('avgConversionRate') || 'Avg Conversion Rate'}
                                value={`${avgConversion}%`}
                                accent="violet"
                                icon={<CheckIcon />}
                            />
                        </div>

                        <ReportTableCard
                            title={t('campaignDetails') || 'Campaign Details'}
                            empty={false}
                            emptyMessage={t('noDataAvailable')}
                            minWidth={880}
                        >
                            <thead className={ReportTableDefaults.theadRow}>
                                <tr>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                                        {t('campaign') || 'Campaign'}
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                                        {t('budget') || 'Budget'}
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                                        {t('totalLeads') || 'Total Leads'}
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                                        {t('converted') || 'Converted'}
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                                        {t('conversionRate') || 'Conversion Rate'}
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                                        {t('costPerLead') || 'Cost per Lead'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaignStats.map((campaign) => (
                                    <tr key={campaign.id} className={ReportTableDefaults.tbodyRow}>
                                        <td className={`${ReportTableDefaults.tbodyCell} font-semibold`}>{campaign.name}</td>
                                        <td className={ReportTableDefaults.tbodyCell}>{campaign.budget.toLocaleString()}</td>
                                        <td className={ReportTableDefaults.tbodyCell}>{campaign.totalLeads.toLocaleString()}</td>
                                        <td className={`${ReportTableDefaults.tbodyCell} text-emerald-600 dark:text-emerald-400 font-semibold`}>
                                            {campaign.convertedLeads.toLocaleString()}
                                        </td>
                                        <td className={`${ReportTableDefaults.tbodyCell} text-blue-600 dark:text-blue-400 font-semibold`}>
                                            {campaign.conversionRate}%
                                        </td>
                                        <td className={ReportTableDefaults.tbodyCell}>
                                            {parseFloat(String(campaign.costPerLead)).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </ReportTableCard>
                    </>
                ) : (
                    <ReportTableCard title={t('campaignDetails') || 'Campaign Details'} empty emptyMessage={t('noDataAvailable')} minWidth={800} />
                )}
            </div>
        </PageWrapper>
    );
};
