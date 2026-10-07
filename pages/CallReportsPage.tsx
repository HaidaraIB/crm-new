import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Input, Loader, RefreshButton } from '../components/index';
import { PhoneIcon, CheckIcon, ClockIcon, UsersIcon } from '../components/icons';
import { useCallReport } from '../hooks/useQueries';
import { withLatinDigits } from '../utils/dateUtils';
import { reportPageContainer } from '../components/reports/reportStyles';
import { ReportHero } from '../components/reports/ReportHero';
import { ReportSummaryTile } from '../components/reports/ReportSummaryTile';
import { ReportTableCard, ReportTableDefaults } from '../components/reports/ReportTableCard';
import { downloadCsv } from '../utils/reportExport';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {children}
    </label>
  );
}

export const CallReportsPage = () => {
  const { t, language } = useAppContext();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const reportParams = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
    }),
    [from, to],
  );

  const { data, isLoading, isFetching, isError, refetch } = useCallReport(reportParams);
  const crmSummary = data?.crm?.summary;

  const handleExport = () => {
    if (!data) return;
    downloadCsv(
      'call-reports-crm-by-user.csv',
      [t('user'), t('totalCalls'), t('answered'), t('missed'), t('manual')],
      (data.crm.by_user ?? []).map((row) => [
        row.name,
        row.total,
        row.answered,
        row.missed,
        row.manual,
      ]),
    );
  };

  return (
    <PageWrapper
      title={t('callReports')}
      actions={
        <Button variant="secondary" onClick={handleExport} disabled={!data || isLoading}>
          {t('export') || 'Export'}
        </Button>
      }
    >
      <div className={reportPageContainer}>
        <ReportHero title={t('callReports')} subtitle={t('reportsPageHint')} language={language} />

        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <FieldLabel>{t('fromDate')}</FieldLabel>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <FieldLabel>{t('toDate')}</FieldLabel>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <RefreshButton onClick={() => refetch()} loading={isFetching && !isLoading} hideLabelOnMobile={false} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : isError || !crmSummary ? (
          <ReportTableCard title={t('callReports')} empty emptyMessage={t('noDataAvailable')} minWidth={640} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
              <ReportSummaryTile title={t('totalCalls')} value={crmSummary.total} accent="indigo" icon={<PhoneIcon />} />
              <ReportSummaryTile title={t('answered')} value={crmSummary.answered} accent="emerald" icon={<CheckIcon />} />
              <ReportSummaryTile title={t('notAnswered')} value={crmSummary.missed} accent="violet" icon={<ClockIcon />} />
              <ReportSummaryTile title={t('manual')} value={crmSummary.manual} accent="blue" icon={<UsersIcon />} />
            </div>

            <ReportTableCard
              title={t('callReportsByUserTitle')}
              empty={!(data?.crm?.by_user?.length)}
              emptyMessage={t('noDataAvailable')}
              minWidth={640}
            >
              {data?.crm?.by_user?.length ? (
                <>
                  <thead className={ReportTableDefaults.theadRow}>
                    <tr>
                      <th className={ReportTableDefaults.theadCell}>{t('user')}</th>
                      <th className={ReportTableDefaults.theadCell}>{t('totalCalls')}</th>
                      <th className={ReportTableDefaults.theadCell}>{t('answered')}</th>
                      <th className={ReportTableDefaults.theadCell}>{t('missed')}</th>
                      <th className={ReportTableDefaults.theadCell}>{t('manual')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.crm.by_user.map((row) => (
                      <tr key={row.id ?? row.name} className={ReportTableDefaults.tbodyRow}>
                        <td className={`${ReportTableDefaults.tbodyCell} font-semibold`}>{row.name}</td>
                        <td className={ReportTableDefaults.tbodyCell}>{row.total.toLocaleString(undefined, withLatinDigits())}</td>
                        <td className={ReportTableDefaults.tbodyCell}>{row.answered.toLocaleString(undefined, withLatinDigits())}</td>
                        <td className={ReportTableDefaults.tbodyCell}>{row.missed.toLocaleString(undefined, withLatinDigits())}</td>
                        <td className={ReportTableDefaults.tbodyCell}>{row.manual.toLocaleString(undefined, withLatinDigits())}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : null}
            </ReportTableCard>

            <ReportTableCard
              title={t('callReportsByMethodTitle')}
              empty={!(data?.crm?.by_method?.length)}
              emptyMessage={t('noDataAvailable')}
              minWidth={640}
            >
              {data?.crm?.by_method?.length ? (
                <>
                  <thead className={ReportTableDefaults.theadRow}>
                    <tr>
                      <th className={ReportTableDefaults.theadCell}>{t('callMethods')}</th>
                      <th className={ReportTableDefaults.theadCell}>{t('totalCalls')}</th>
                      <th className={ReportTableDefaults.theadCell}>{t('answered')}</th>
                      <th className={ReportTableDefaults.theadCell}>{t('missed')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.crm.by_method.map((row) => (
                      <tr key={row.name} className={ReportTableDefaults.tbodyRow}>
                        <td className={`${ReportTableDefaults.tbodyCell} font-semibold`}>{row.name}</td>
                        <td className={ReportTableDefaults.tbodyCell}>{row.total.toLocaleString(undefined, withLatinDigits())}</td>
                        <td className={ReportTableDefaults.tbodyCell}>{row.answered.toLocaleString(undefined, withLatinDigits())}</td>
                        <td className={ReportTableDefaults.tbodyCell}>{row.missed.toLocaleString(undefined, withLatinDigits())}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : null}
            </ReportTableCard>
          </>
        )}
      </div>
    </PageWrapper>
  );
};
