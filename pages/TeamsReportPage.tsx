import React, { useMemo } from 'react';
import { PageWrapper, Button, Loader } from '../components/index';
import { useAppContext } from '../context/AppContext';
import { FilterIcon, UsersIcon, TargetIcon, CheckSquareIcon, DealIcon } from '../components/icons';
import { useTeamsReport } from '../hooks/useQueries';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../utils/dateUtils';
import { reportPageContainer } from '../components/reports/reportStyles';
import { ReportHero } from '../components/reports/ReportHero';
import { ReportSummaryTile } from '../components/reports/ReportSummaryTile';
import { ReportTableCard, ReportTableDefaults } from '../components/reports/ReportTableCard';
import { buildReportDateSubtitle, mapApiTeamReportRow, type TeamReportRow } from '../utils/reportMetrics';
import { downloadCsv } from '../utils/reportExport';

export const TeamsReportPage = () => {
  const { t, teamsReportFilters, setIsTeamsReportFilterDrawerOpen, language } = useAppContext();
  const { selectedTeam, leadType, startDate, endDate } = teamsReportFilters;

  const reportParams = useMemo(
    () => ({
      from: startDate || undefined,
      to: endDate || undefined,
      lead_type: leadType !== 'all' ? leadType : undefined,
      user_id: selectedTeam !== 'all' ? selectedTeam : undefined,
    }),
    [leadType, selectedTeam, startDate, endDate],
  );

  const { data, isLoading, isError } = useTeamsReport(reportParams);

  const teamStats = useMemo(() => (data?.rows ?? []).map(mapApiTeamReportRow), [data?.rows]);

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

  const handleExport = () => {
    if (!teamStats.length) return;
    const headers = [
      t('teamUser') || 'Team/User',
      t('totalLeads') || 'Total Leads',
      t('touched') || 'Touched',
      t('untouched') || 'Untouched',
      t('following') || 'Following',
      t('meeting') || 'Meeting',
      t('activities') || 'Activities',
      t('deals') || 'Deals',
      t('wonDeals') || 'Won Deals',
    ];
    downloadCsv(
      'teams-report.csv',
      headers,
      teamStats.map((team) => [
        team.name,
        team.totalLeads,
        team.touchedLeads,
        team.untouchedLeads,
        team.followingLeads ?? team.following,
        team.meetingLeads ?? team.meeting,
        team.totalActivities,
        team.totalDeals,
        team.wonDeals,
      ]),
    );
  };

  const totalLeads = data?.summary?.total_leads ?? teamStats.reduce((sum, team) => sum + team.totalLeads, 0);
  const totalActivities =
    data?.summary?.total_activities ?? teamStats.reduce((sum, team) => sum + team.totalActivities, 0);
  const totalDeals = data?.summary?.total_deals ?? teamStats.reduce((sum, team) => sum + team.totalDeals, 0);

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
            disabled={!teamStats.length}
            className="w-full sm:w-auto rounded-xl px-5 py-2.5 border border-gray-200/90 dark:border-gray-600 bg-white/90 dark:bg-gray-800 shadow-sm hover:shadow-md"
          >
            {t('export') || 'Export'}
          </Button>
        </div>
      }
    >
      <div className={reportPageContainer}>
        <ReportHero title={t('teamsReport')} subtitle={reportHeroSubtitle} language={language} />

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : teamStats.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <ReportSummaryTile
                title={t('totalTeams') || 'Total Teams'}
                value={data?.summary?.total_teams ?? teamStats.length}
                accent="indigo"
                icon={<UsersIcon />}
              />
              <ReportSummaryTile
                title={t('totalLeads') || 'Total Leads'}
                value={totalLeads.toLocaleString(undefined, withLatinDigits())}
                accent="blue"
                icon={<TargetIcon />}
              />
              <ReportSummaryTile
                title={t('totalActivities') || 'Total Activities'}
                value={totalActivities.toLocaleString(undefined, withLatinDigits())}
                accent="emerald"
                icon={<CheckSquareIcon />}
              />
              <ReportSummaryTile
                title={t('totalDeals') || 'Total Deals'}
                value={totalDeals.toLocaleString(undefined, withLatinDigits())}
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
              <thead className={ReportTableDefaults.theadRow}>
                <tr>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('teamUser') || 'Team/User'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('totalLeads') || 'Total Leads'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('touched') || 'Touched'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('untouched') || 'Untouched'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('following') || 'Following'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('meeting') || 'Meeting'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('activities') || 'Activities'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('deals') || 'Deals'}
                  </th>
                  <th scope="col" className={ReportTableDefaults.theadCell}>
                    {t('wonDeals') || 'Won Deals'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamStats.map((team: TeamReportRow) => (
                  <tr key={team.id} className={ReportTableDefaults.tbodyRow}>
                    <td className={`${ReportTableDefaults.tbodyCell} font-semibold`}>{team.name}</td>
                    <td className={ReportTableDefaults.tbodyCell}>
                      {team.totalLeads.toLocaleString(undefined, withLatinDigits())}
                    </td>
                    <td className={`${ReportTableDefaults.tbodyCell} text-green-600 dark:text-green-400 font-semibold`}>
                      {team.touchedLeads.toLocaleString(undefined, withLatinDigits())}
                    </td>
                    <td className={`${ReportTableDefaults.tbodyCell} text-amber-600 dark:text-amber-400 font-semibold`}>
                      {team.untouchedLeads.toLocaleString(undefined, withLatinDigits())}
                    </td>
                    <td className={`${ReportTableDefaults.tbodyCell} text-blue-600 dark:text-blue-400`}>
                      {(team.followingLeads ?? team.following).toLocaleString(undefined, withLatinDigits())}
                    </td>
                    <td className={`${ReportTableDefaults.tbodyCell} text-purple-600 dark:text-purple-400`}>
                      {(team.meetingLeads ?? team.meeting).toLocaleString(undefined, withLatinDigits())}
                    </td>
                    <td className={ReportTableDefaults.tbodyCell}>
                      {team.totalActivities.toLocaleString(undefined, withLatinDigits())}
                    </td>
                    <td className={ReportTableDefaults.tbodyCell}>
                      {team.totalDeals.toLocaleString(undefined, withLatinDigits())}
                    </td>
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
            emptyMessage={isError ? t('errorLoadingData') || t('noDataAvailable') : t('selectFiltersPrompt')}
            minWidth={800}
          />
        )}
      </div>
    </PageWrapper>
  );
};
