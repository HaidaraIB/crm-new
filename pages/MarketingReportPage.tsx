import React, { useMemo } from 'react';
import { PageWrapper, Button, Loader } from '../components/index';
import { useAppContext } from '../context/AppContext';
import { FilterIcon, MegaphoneIcon, TargetIcon, CheckIcon, ChartIcon } from '../components/icons';
import { useMarketingReport } from '../hooks/useQueries';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../utils/dateUtils';
import { reportPageContainer } from '../components/reports/reportStyles';
import { ReportHero } from '../components/reports/ReportHero';
import { ReportSummaryTile } from '../components/reports/ReportSummaryTile';
import { ReportTableCard, ReportTableDefaults } from '../components/reports/ReportTableCard';
import { buildReportDateSubtitle, mapApiMarketingReportRow } from '../utils/reportMetrics';
import { downloadCsv } from '../utils/reportExport';

export const MarketingReportPage = () => {
  const { t, marketingReportFilters, setIsMarketingReportFilterDrawerOpen, language } = useAppContext();
  const { selectedCampaign, startDate, endDate } = marketingReportFilters;

  const reportParams = useMemo(
    () => ({
      from: startDate || undefined,
      to: endDate || undefined,
      campaign_id: selectedCampaign !== 'all' ? selectedCampaign : undefined,
    }),
    [selectedCampaign, startDate, endDate],
  );

  const { data, isLoading, isError } = useMarketingReport(reportParams);

  const campaignStats = useMemo(
    () => (data?.rows ?? []).map(mapApiMarketingReportRow),
    [data?.rows],
  );

  const reportHeroSubtitle = useMemo(
    () =>
      buildReportDateSubtitle(
        startDate,
        endDate,
        t('reportsAllDates'),
        t('reportsPageHint'),
        language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
        withLatinDigits,
      ),
    [language, startDate, endDate, t],
  );

  const totalBudget = data?.summary?.total_budget ?? campaignStats.reduce((sum, camp) => sum + camp.budget, 0);
  const leadsSum = data?.summary?.total_leads ?? campaignStats.reduce((sum, camp) => sum + camp.totalLeads, 0);
  const avgConversion = data?.summary?.avg_conversion_rate ?? (
    campaignStats.length > 0
      ? (
          campaignStats.reduce((sum, camp) => sum + parseFloat(String(camp.conversionRate)), 0) /
          campaignStats.length
        ).toFixed(1)
      : '0'
  );

  const handleExport = () => {
    if (!campaignStats.length) return;
    downloadCsv(
      'marketing-report.csv',
      [
        t('campaign') || 'Campaign',
        t('budget') || 'Budget',
        t('totalLeads') || 'Total Leads',
        t('converted') || 'Converted',
        t('conversionRate') || 'Conversion Rate',
        t('costPerLead') || 'Cost per Lead',
      ],
      campaignStats.map((campaign) => [
        campaign.name,
        campaign.budget,
        campaign.totalLeads,
        campaign.convertedLeads,
        `${campaign.conversionRate}%`,
        campaign.costPerLead,
      ]),
    );
  };

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
            disabled={!campaignStats.length}
            className="w-full sm:w-auto rounded-xl px-5 py-2.5 border border-gray-200/90 dark:border-gray-600 bg-white/90 dark:bg-gray-800 shadow-sm hover:shadow-md"
          >
            {t('export') || 'Export'}
          </Button>
        </div>
      }
    >
      <div className={reportPageContainer}>
        <ReportHero title={t('marketingReport')} subtitle={reportHeroSubtitle} language={language} />

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : campaignStats.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <ReportSummaryTile
                title={t('totalCampaigns') || 'Total Campaigns'}
                value={data?.summary?.total_campaigns ?? campaignStats.length}
                accent="indigo"
                icon={<MegaphoneIcon />}
              />
              <ReportSummaryTile
                title={t('totalBudget') || 'Total Budget'}
                value={totalBudget.toLocaleString(undefined, withLatinDigits())}
                accent="blue"
                icon={<ChartIcon />}
              />
              <ReportSummaryTile
                title={t('totalLeads') || 'Total Leads'}
                value={leadsSum.toLocaleString(undefined, withLatinDigits())}
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
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('campaign') || 'Campaign'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('budget') || 'Budget'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('totalLeads') || 'Total Leads'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('converted') || 'Converted'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('conversionRate') || 'Conversion Rate'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('costPerLead') || 'Cost per Lead'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaignStats.map((campaign) => (
                  <tr key={campaign.id} className={ReportTableDefaults.tbodyRow}>
                    <td className={`${ReportTableDefaults.tbodyCell} font-semibold`}>{campaign.name}</td>
                    <td className={ReportTableDefaults.tbodyCell}>
                      {campaign.budget.toLocaleString(undefined, withLatinDigits())}
                    </td>
                    <td className={ReportTableDefaults.tbodyCell}>
                      {campaign.totalLeads.toLocaleString(undefined, withLatinDigits())}
                    </td>
                    <td className={`${ReportTableDefaults.tbodyCell} text-emerald-600 dark:text-emerald-400 font-semibold`}>
                      {campaign.convertedLeads.toLocaleString(undefined, withLatinDigits())}
                    </td>
                    <td className={`${ReportTableDefaults.tbodyCell} text-blue-600 dark:text-blue-400 font-semibold`}>
                      {campaign.conversionRate}%
                    </td>
                    <td className={ReportTableDefaults.tbodyCell}>
                      {parseFloat(String(campaign.costPerLead)).toLocaleString(
                        undefined,
                        withLatinDigits({
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </ReportTableCard>
          </>
        ) : (
          <ReportTableCard
            title={t('campaignDetails') || 'Campaign Details'}
            empty
            emptyMessage={isError ? t('errorLoadingData') || t('noDataAvailable') : t('noDataAvailable')}
            minWidth={800}
          />
        )}
      </div>
    </PageWrapper>
  );
};
