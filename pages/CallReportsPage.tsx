import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, Input, Loader } from '../components/index';
import { PhoneIcon, CheckIcon, ClockIcon, UsersIcon } from '../components/icons';
import { useCallReport } from '../hooks/useQueries';
import { withLatinDigits } from '../utils/dateUtils';
import { reportPageContainer } from '../components/reports/reportStyles';
import { ReportHero } from '../components/reports/ReportHero';
import { ReportSummaryTile } from '../components/reports/ReportSummaryTile';
import { ReportTableCard, ReportTableDefaults } from '../components/reports/ReportTableCard';
import { downloadCsv } from '../utils/reportExport';

type CallReportTab = 'combined' | 'crm' | 'pbx';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {children}
    </label>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'bg-white/90 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/90 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

export const CallReportsPage = () => {
  const { t, goToPage, canAccessPage, language } = useAppContext();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activeTab, setActiveTab] = useState<CallReportTab>('combined');

  const reportParams = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
    }),
    [from, to],
  );

  const { data, isLoading, isError, refetch } = useCallReport(reportParams);

  const pbxEnabled = !!data?.pbx?.enabled;
  const crmSummary = data?.crm?.summary;
  const combinedSummary = data?.combined?.summary;
  const pbxSummary = data?.pbx?.summary;

  const handleExport = () => {
    if (!data) return;

    if (activeTab === 'crm') {
      downloadCsv(
        'call-reports-crm-by-user.csv',
        [t('user'), t('totalCalls'), t('answered'), t('missed'), t('callReportsManualCalls'), t('callReportsPbxLinkedCalls')],
        (data.crm.by_user ?? []).map((row) => [
          row.name,
          row.total,
          row.answered,
          row.missed,
          row.manual,
          row.pbx_linked,
        ]),
      );
      return;
    }

    if (activeTab === 'pbx' && pbxEnabled) {
      downloadCsv(
        'call-reports-pbx-agents.csv',
        [t('extension'), t('user'), t('totalCalls'), t('answered'), t('missed'), t('avgDuration')],
        (data.pbx.agents ?? []).map((row) => [
          row.extension,
          row.username || '',
          row.total,
          row.answered,
          row.missed,
          row.avg_duration_sec,
        ]),
      );
    }
  };

  const renderCombined = () => {
    if (!combinedSummary) return null;
    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 mb-6">
          <ReportSummaryTile title={t('totalCalls')} value={combinedSummary.total} accent="indigo" icon={<PhoneIcon />} />
          <ReportSummaryTile title={t('answered')} value={combinedSummary.answered} accent="emerald" icon={<CheckIcon />} />
          <ReportSummaryTile title={t('notAnswered')} value={combinedSummary.missed} accent="violet" icon={<ClockIcon />} />
          <ReportSummaryTile title={t('callReportsManualCalls')} value={combinedSummary.manual} accent="blue" icon={<UsersIcon />} />
          <ReportSummaryTile
            title={t('callReportsPbxUnlinkedCdr')}
            value={combinedSummary.pbx_cdr_unlinked}
            accent="violet"
            icon={<PhoneIcon />}
          />
          <ReportSummaryTile title={t('avgDuration')} value={combinedSummary.avg_duration_sec} accent="indigo" icon={<ClockIcon />} />
        </div>
        <Card className="p-4 text-sm text-gray-600 dark:text-gray-300 mb-6">
          {t('callReportsCombinedHint')}
        </Card>
        {!pbxEnabled ? (
          <Card className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('callReportsPbxDisabledHint')}</p>
            {canAccessPage('PBX') ? (
              <Button variant="secondary" onClick={() => goToPage('PBX')}>
                {t('callReportsOpenPbxSettings')}
              </Button>
            ) : null}
          </Card>
        ) : null}
      </>
    );
  };

  const renderCrm = () => {
    if (!crmSummary) return null;
    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 mb-6">
          <ReportSummaryTile title={t('totalCalls')} value={crmSummary.total} accent="indigo" icon={<PhoneIcon />} />
          <ReportSummaryTile title={t('answered')} value={crmSummary.answered} accent="emerald" icon={<CheckIcon />} />
          <ReportSummaryTile title={t('notAnswered')} value={crmSummary.missed} accent="violet" icon={<ClockIcon />} />
          <ReportSummaryTile title={t('callReportsManualCalls')} value={crmSummary.manual} accent="blue" icon={<UsersIcon />} />
          <ReportSummaryTile
            title={t('callReportsPbxLinkedCalls')}
            value={crmSummary.pbx_linked}
            accent="emerald"
            icon={<PhoneIcon />}
          />
        </div>

        <ReportTableCard
          title={t('callReportsByUserTitle')}
          empty={!(data?.crm?.by_user?.length)}
          emptyMessage={t('noDataAvailable')}
          minWidth={760}
        >
          {data?.crm?.by_user?.length ? (
            <>
              <thead className={ReportTableDefaults.theadRow}>
                <tr>
                  <th className={ReportTableDefaults.theadCell}>{t('user')}</th>
                  <th className={ReportTableDefaults.theadCell}>{t('totalCalls')}</th>
                  <th className={ReportTableDefaults.theadCell}>{t('answered')}</th>
                  <th className={ReportTableDefaults.theadCell}>{t('missed')}</th>
                  <th className={ReportTableDefaults.theadCell}>{t('callReportsManualCalls')}</th>
                  <th className={ReportTableDefaults.theadCell}>{t('callReportsPbxLinkedCalls')}</th>
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
                    <td className={ReportTableDefaults.tbodyCell}>{row.pbx_linked.toLocaleString(undefined, withLatinDigits())}</td>
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
    );
  };

  const renderPbx = () => {
    if (!pbxEnabled || !pbxSummary) {
      return (
        <Card className="p-8 max-w-lg mx-auto text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-300">{t('callReportsPbxDisabledHint')}</p>
          {canAccessPage('PBX') ? (
            <Button onClick={() => goToPage('PBX')}>{t('callReportsOpenPbxSettings')}</Button>
          ) : null}
        </Card>
      );
    }

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 mb-6">
          <ReportSummaryTile title={t('totalCalls')} value={pbxSummary.total} accent="indigo" icon={<PhoneIcon />} />
          <ReportSummaryTile title={t('inbound')} value={pbxSummary.inbound} accent="blue" icon={<PhoneIcon />} />
          <ReportSummaryTile title={t('outbound')} value={pbxSummary.outbound} accent="emerald" icon={<PhoneIcon />} />
          <ReportSummaryTile title={t('answered')} value={pbxSummary.answered} accent="emerald" icon={<CheckIcon />} />
          <ReportSummaryTile title={t('missed')} value={pbxSummary.missed} accent="violet" icon={<ClockIcon />} />
          <ReportSummaryTile title={t('avgDuration')} value={pbxSummary.avg_duration_sec} accent="indigo" icon={<ClockIcon />} />
        </div>

        <ReportTableCard
          title={t('pbxReportsAgentsTitle')}
          empty={!(data?.pbx?.agents?.length)}
          emptyMessage={t('noDataAvailable')}
          minWidth={760}
        >
          {data?.pbx?.agents?.length ? (
            <>
              <thead className={ReportTableDefaults.theadRow}>
                <tr>
                  <th className={ReportTableDefaults.theadCell}>{t('extension')}</th>
                  <th className={ReportTableDefaults.theadCell}>{t('user')}</th>
                  <th className={ReportTableDefaults.theadCell}>{t('totalCalls')}</th>
                  <th className={ReportTableDefaults.theadCell}>{t('answered')}</th>
                  <th className={ReportTableDefaults.theadCell}>{t('missed')}</th>
                  <th className={ReportTableDefaults.theadCell}>{t('avgDuration')}</th>
                </tr>
              </thead>
              <tbody>
                {data.pbx.agents.map((agent) => (
                  <tr key={agent.extension} className={ReportTableDefaults.tbodyRow}>
                    <td className={ReportTableDefaults.tbodyCell} dir="ltr">
                      {agent.extension}
                    </td>
                    <td className={ReportTableDefaults.tbodyCell}>{agent.username || '—'}</td>
                    <td className={ReportTableDefaults.tbodyCell}>{agent.total}</td>
                    <td className={ReportTableDefaults.tbodyCell}>{agent.answered}</td>
                    <td className={ReportTableDefaults.tbodyCell}>{agent.missed}</td>
                    <td className={ReportTableDefaults.tbodyCell}>{agent.avg_duration_sec}</td>
                  </tr>
                ))}
              </tbody>
            </>
          ) : null}
        </ReportTableCard>
      </>
    );
  };

  return (
    <PageWrapper
      title={t('callReports')}
      actions={
        activeTab !== 'combined' ? (
          <Button variant="secondary" onClick={handleExport} disabled={!data || isLoading}>
            {t('export') || 'Export'}
          </Button>
        ) : undefined
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
          <Button variant="secondary" onClick={() => refetch()}>
            {t('refresh')}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton active={activeTab === 'combined'} onClick={() => setActiveTab('combined')}>
            {t('callReportsTabCombined')}
          </TabButton>
          <TabButton active={activeTab === 'crm'} onClick={() => setActiveTab('crm')}>
            {t('callReportsTabCrm')}
          </TabButton>
          <TabButton active={activeTab === 'pbx'} onClick={() => setActiveTab('pbx')}>
            {t('callReportsTabPbx')}
          </TabButton>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : isError ? (
          <ReportTableCard title={t('callReports')} empty emptyMessage={t('noDataAvailable')} minWidth={640} />
        ) : (
          <>
            {activeTab === 'combined' && renderCombined()}
            {activeTab === 'crm' && renderCrm()}
            {activeTab === 'pbx' && renderPbx()}
          </>
        )}
      </div>
    </PageWrapper>
  );
};
