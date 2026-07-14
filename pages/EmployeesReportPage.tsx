import React, { useMemo } from 'react';
import { PageWrapper, Button, Loader } from '../components/index';
import { useAppContext } from '../context/AppContext';
import { FilterIcon, PhoneIcon, CheckIcon, ClockIcon, UsersIcon } from '../components/icons';
import { useEmployeeReport } from '../hooks/useQueries';
import { translations } from '../constants';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../utils/dateUtils';
import { reportPageContainer } from '../components/reports/reportStyles';
import { ReportHero } from '../components/reports/ReportHero';
import { ReportSummaryTile } from '../components/reports/ReportSummaryTile';
import { ReportTableCard, ReportTableDefaults } from '../components/reports/ReportTableCard';
import {
  buildReportDateSubtitle,
  mapApiEmployeeReportRow,
  type EmployeeReportRow,
} from '../utils/reportMetrics';
import { downloadCsv } from '../utils/reportExport';

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
  const { t, employeesReportFilters, setIsEmployeesReportFilterDrawerOpen, language } = useAppContext();
  const { leadType, startDate, endDate } = employeesReportFilters;

  const reportParams = useMemo(
    () => ({
      from: startDate || undefined,
      to: endDate || undefined,
      lead_type: leadType !== 'all' ? leadType : undefined,
    }),
    [leadType, startDate, endDate],
  );

  const { data, isLoading, isError } = useEmployeeReport(reportParams);

  const employeeStats = useMemo(
    () => (data?.rows ?? []).map(mapApiEmployeeReportRow),
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

  const reportColumns = getReportColumns(t);

  const totalCalls = data?.summary?.total_calls ?? employeeStats.reduce((sum, emp) => sum + emp.totalCalls, 0);
  const answeredCalls =
    data?.summary?.answered_calls ?? employeeStats.reduce((sum, emp) => sum + emp.answeredCalls, 0);
  const notAnsweredCalls =
    data?.summary?.not_answered_calls ?? employeeStats.reduce((sum, emp) => sum + emp.notAnsweredCalls, 0);

  const handleExport = () => {
    if (!employeeStats.length) return;
    downloadCsv(
      'employees-report.csv',
      reportColumns.map((col) => col.header),
      employeeStats.map((emp) =>
        reportColumns.map((col) => emp[col.accessor as keyof EmployeeReportRow] ?? ''),
      ),
    );
  };

  return (
    <PageWrapper
      title={t('employeesReport')}
      actions={
        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
          <Button
            variant="secondary"
            onClick={() => setIsEmployeesReportFilterDrawerOpen(true)}
            className="w-full sm:w-auto rounded-xl px-5 py-2.5 border border-gray-200/90 dark:border-gray-600 bg-white/90 dark:bg-gray-800 shadow-sm hover:shadow-md"
          >
            <FilterIcon className="h-4 w-4 shrink-0" />
            {t('filter') || 'Filter'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={!employeeStats.length}
            className="w-full sm:w-auto rounded-xl px-5 py-2.5 border border-gray-200/90 dark:border-gray-600 bg-white/90 dark:bg-gray-800 shadow-sm hover:shadow-md"
          >
            {t('export') || 'Export'}
          </Button>
        </div>
      }
    >
      <div className={reportPageContainer}>
        <ReportHero
          title={t('employeesReport')}
          subtitle={reportHeroSubtitle}
          language={language}
        />

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <ReportSummaryTile
                title={t('totalCalls')}
                value={totalCalls.toLocaleString(undefined, withLatinDigits())}
                accent="indigo"
                icon={<PhoneIcon />}
              />
              <ReportSummaryTile
                title={t('answered')}
                value={answeredCalls.toLocaleString(undefined, withLatinDigits())}
                accent="emerald"
                icon={<CheckIcon />}
              />
              <ReportSummaryTile
                title={t('notAnswered')}
                value={notAnsweredCalls.toLocaleString(undefined, withLatinDigits())}
                accent="violet"
                icon={<ClockIcon />}
              />
              <ReportSummaryTile
                title={t('employees')}
                value={(data?.summary?.employee_count ?? employeeStats.length).toLocaleString(
                  undefined,
                  withLatinDigits(),
                )}
                accent="blue"
                icon={<UsersIcon />}
              />
            </div>

            <ReportTableCard
              title={t('employeeDetails') || 'Employee Details'}
              empty={employeeStats.length === 0}
              emptyMessage={isError ? t('errorLoadingData') || t('noDataAvailable') : t('noDataAvailable')}
              minWidth={1040}
            >
              {!employeeStats.length ? null : (
                <>
                  <thead className={ReportTableDefaults.theadRow}>
                    <tr>
                      {reportColumns.map((col) => (
                        <th key={col.accessor} scope="col" className={ReportTableDefaults.theadCell}>
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employeeStats.map((emp) => (
                      <tr key={emp.id} className={ReportTableDefaults.tbodyRow}>
                        {reportColumns.map((col) => {
                          const value = emp[col.accessor as keyof EmployeeReportRow];
                          const displayValue =
                            typeof value === 'number'
                              ? value.toLocaleString(undefined, withLatinDigits())
                              : String(value ?? '');
                          return (
                            <td key={col.accessor} className={ReportTableDefaults.tbodyCell}>
                              {displayValue}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </ReportTableCard>
          </>
        )}
      </div>
    </PageWrapper>
  );
};
