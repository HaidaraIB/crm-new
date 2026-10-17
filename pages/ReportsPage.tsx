import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { PageWrapper, Button, FilterButton, RefreshButton, hasActiveFilters } from '../components/index';
import { useAppContext } from '../context/AppContext';
import { getReportSectionAPI } from '../services/api';
import type { ReportQuery, ReportSection } from '../services/reportsTypes';
import { PeriodPicker } from '../components/reports/PeriodPicker';
import { ReportFiltersDrawer } from '../components/reports/ReportFiltersDrawer';
import { LeadDrilldownDrawer, type DrillTarget } from '../components/reports/LeadDrilldownDrawer';
import { ReportHero } from '../components/reports/ReportHero';
import { reportPageContainer } from '../components/reports/reportStyles';
import { OverviewTab } from '../components/reports/tabs/OverviewTab';
import { LeadsTab } from '../components/reports/tabs/LeadsTab';
import { StatusJourneyTab } from '../components/reports/tabs/StatusJourneyTab';
import { ResponseTimeTab } from '../components/reports/tabs/ResponseTimeTab';
import { EmployeesTab } from '../components/reports/tabs/EmployeesTab';
import { SourcesTab } from '../components/reports/tabs/SourcesTab';
import { CallsTab } from '../components/reports/tabs/CallsTab';
import { DealsTab } from '../components/reports/tabs/DealsTab';
import { DEFAULT_REPORT_FILTERS, filtersToQuery } from '../utils/reportFilters';
import type { TKey } from '../utils/reportLabels';
import {
  type ReportPeriod,
  periodFromSearch,
  periodToSearch,
  resolvePeriod,
  safeTimeZone,
} from '../utils/reportPeriod';
import { buildSheets, downloadSheetsCsv, downloadWorkbook, type SheetData } from '../utils/reportsExport';

export type ReportTab =
  | 'overview'
  | 'leads'
  | 'status-journey'
  | 'response-time'
  | 'employees'
  | 'sources'
  | 'calls'
  | 'deals';

const TABS: Array<{ id: ReportTab; labelKey: TKey }> = [
  { id: 'overview', labelKey: 'reportTabOverview' },
  { id: 'leads', labelKey: 'reportTabLeads' },
  { id: 'status-journey', labelKey: 'reportTabStatusJourney' },
  { id: 'response-time', labelKey: 'reportTabResponseTime' },
  { id: 'employees', labelKey: 'reportTabEmployees' },
  { id: 'sources', labelKey: 'reportTabSources' },
  { id: 'calls', labelKey: 'reportTabCalls' },
  { id: 'deals', labelKey: 'reportTabDeals' },
];

const isTab = (v: string | null): v is ReportTab => TABS.some((x) => x.id === v);

const TAB_COMPONENTS: Record<ReportTab, React.ComponentType<{ query: ReportQuery; onDrill: (t: DrillTarget) => void }>> = {
  overview: OverviewTab,
  leads: LeadsTab,
  'status-journey': StatusJourneyTab,
  'response-time': ResponseTimeTab,
  employees: EmployeesTab,
  sources: SourcesTab,
  calls: CallsTab,
  deals: DealsTab,
};

/** Tab, period and compare live in the query string so a report can be shared as a link. */
function readUrlState(defaultTab: ReportTab) {
  const search = new URLSearchParams(window.location.search);
  const tab = search.get('tab');
  return {
    tab: isTab(tab) ? tab : defaultTab,
    period: periodFromSearch(search),
    compare: search.get('compare') === '1',
  };
}

export const ReportsPage = ({ defaultTab = 'overview' }: { defaultTab?: ReportTab }) => {
  const { t, language, currentUser, reportFilters, setIsReportFilterDrawerOpen } = useAppContext();
  const queryClient = useQueryClient();
  const timeZone = safeTimeZone(currentUser?.company?.timezone);

  const initial = useMemo(() => readUrlState(defaultTab), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState<ReportTab>(initial.tab);
  const [period, setPeriod] = useState<ReportPeriod>(initial.period);
  const [compare, setCompare] = useState(initial.compare);
  const [drill, setDrill] = useState<DrillTarget | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    search.set('tab', tab);
    periodToSearch(period, search);
    if (compare) search.set('compare', '1');
    else search.delete('compare');
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${search.toString()}${window.location.hash}`);
  }, [tab, period, compare]);

  const range = useMemo(() => resolvePeriod(period, timeZone), [period, timeZone]);
  const query = useMemo<ReportQuery>(
    () => ({
      start: range.start,
      end: range.end,
      compare: compare && tab === 'overview' ? true : undefined,
      ...filtersToQuery(reportFilters),
    }),
    [range.start, range.end, compare, tab, reportFilters],
  );

  const fetching = useIsFetching({ queryKey: ['reportSection'] }) > 0;
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['reportSection'] });
  }, [queryClient]);

  const filename = `loop-crm-report-${range.start.slice(0, 10)}_${range.end.slice(0, 10)}`;

  const exportExcel = async () => {
    setExporting(true);
    try {
      const sections: ReportSection[] = TABS.map((x) => x.id);
      const results = await Promise.all(
        sections.map(async (section) => ({
          section,
          data: await getReportSectionAPI(section, { ...query, compare: section === 'overview' ? compare : undefined }),
        })),
      );
      const sheets: SheetData[] = results.flatMap(({ section, data }) => buildSheets(section, data as never, t, language));
      await downloadWorkbook(filename, sheets, language === 'ar');
    } finally {
      setExporting(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const data = await getReportSectionAPI(tab, query);
      downloadSheetsCsv(`${filename}-${tab}.csv`, buildSheets(tab, data as never, t, language));
    } finally {
      setExporting(false);
    }
  };

  const ActiveTab = TAB_COMPONENTS[tab];
  const filtersActive = hasActiveFilters(reportFilters, DEFAULT_REPORT_FILTERS);

  return (
    <PageWrapper
      title={t('reports')}
      actions={
        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 print:hidden">
          <FilterButton
            onClick={() => setIsReportFilterDrawerOpen(true)}
            hideLabelOnMobile={false}
            className="w-full sm:w-auto"
            hasActiveFilters={filtersActive}
          />
          <RefreshButton onClick={refresh} loading={fetching} hideLabelOnMobile={false} className="w-full sm:w-auto" />
          <Button variant="secondary" onClick={exportExcel} disabled={exporting} className="w-full sm:w-auto">
            {exporting ? t('reportExporting') : t('reportExportExcel')}
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={exporting} className="w-full sm:w-auto">
            {t('reportExportCsv')}
          </Button>
          <Button variant="secondary" onClick={() => window.print()} className="w-full sm:w-auto">
            {t('reportPrint')}
          </Button>
        </div>
      }
    >
      <div className={reportPageContainer}>
        <ReportHero title={t('reports')} subtitle={t('reportsHubHint')} language={language} />

        <div className="print:hidden">
          <PeriodPicker
            period={period}
            onChange={setPeriod}
            compare={compare}
            onCompareChange={setCompare}
            timeZone={timeZone}
          />
        </div>

        <div
          role="tablist"
          aria-label={t('reports')}
          className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700 print:hidden"
        >
          {TABS.map((x) => (
            <button
              key={x.id}
              role="tab"
              type="button"
              id={`report-tab-${x.id}`}
              aria-selected={tab === x.id}
              aria-controls="report-tabpanel"
              onClick={() => setTab(x.id)}
              className={`-mb-px h-11 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors ${
                tab === x.id
                  ? 'border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {t(x.labelKey)}
            </button>
          ))}
        </div>

        <div role="tabpanel" id="report-tabpanel" aria-labelledby={`report-tab-${tab}`}>
          {compare && tab !== 'overview' ? (
            <p className="mb-4 text-xs text-gray-500">{t('reportCompareOverviewOnly')}</p>
          ) : null}
          <ActiveTab query={query} onDrill={setDrill} />
        </div>
      </div>

      <ReportFiltersDrawer />
      <LeadDrilldownDrawer target={drill} onClose={() => setDrill(null)} />
    </PageWrapper>
  );
};
