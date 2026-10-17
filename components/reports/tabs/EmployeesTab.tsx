import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import type { EmployeesReport } from '../../../services/reportsTypes';
import { formatCount, formatDuration, formatMoney, formatPercent } from '../../../utils/reportFormat';
import { useReportPref } from '../../../utils/reportPrefs';
import { EmptyState, KpiTile, ReportCard, ResponseTimeCell } from '../ReportKit';
import { DataTable, DrillNumber, rowCls, SectionShell, tdCls, type TabProps } from './SectionShell';

type Row = EmployeesReport['rows'][number];

const SORTS: Record<string, (r: Row) => number> = {
  leads_assigned: (r) => r.leads_assigned,
  leads_touched: (r) => r.leads_touched,
  touch_rate: (r) => r.touch_rate ?? -1,
  response: (r) => -(r.response_business.median ?? Number.MAX_SAFE_INTEGER),
  calls: (r) => r.calls.total,
  tasks: (r) => r.tasks,
  visits: (r) => r.visits,
  messages: (r) => r.whatsapp_sent + r.sms_sent,
  status_changes: (r) => r.status_changes,
  deals_won: (r) => r.deals_won,
  revenue: (r) => r.revenue,
  worked: (r) => r.worked_seconds,
};

export const EmployeesTab = ({ query, onDrill }: TabProps) => {
  const { t } = useAppContext();
  const [sort, setSort] = useReportPref('employeeSort', 'deals_won');
  const drill = (title: string, extra: object) => () => onDrill({ title, query: { ...query, ...extra } });

  const sorted = (rows: Row[]) => {
    const fn = SORTS[sort] ?? SORTS.deals_won;
    return [...rows].sort((a, b) => fn(b) - fn(a));
  };

  const header = (key: string, label: string) => (
    <button type="button" onClick={() => setSort(key)} className={`font-semibold ${sort === key ? 'text-primary-700 dark:text-primary-300' : ''}`}>
      {label}
      {sort === key ? ' ↓' : ''}
    </button>
  );

  return (
    <SectionShell section="employees" query={query}>
      {(data) => {
        const rows = sorted(data.rows);
        const tracking = data.work_hours_tracking_enabled;
        return (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiTile label={t('reportLeadsAssigned')} value={formatCount(data.totals.leads_assigned)} />
              <KpiTile label={t('reportTouched')} value={formatCount(data.totals.leads_touched)} />
              <KpiTile label={t('reportDealsWon')} value={formatCount(data.totals.deals_won)} sub={`${formatMoney(data.totals.revenue)} ${t('reportRevenue')}`} />
              <KpiTile
                label={t('reportWorkedHours')}
                value={tracking ? formatDuration(data.totals.worked_seconds, t) : '—'}
                sub={tracking ? undefined : t('reportWorkTrackingOff')}
              />
            </div>

            <ReportCard title={t('reportEmployeeScorecard')} hint={t('reportEmployeeScorecardHint')}>
              {rows.length ? (
                <DataTable
                  minWidth={1100}
                  head={[
                    t('employee'),
                    header('leads_assigned', t('reportLeadsAssigned')),
                    header('leads_touched', t('reportTouched')),
                    header('touch_rate', t('reportTouchRate')),
                    header('response', t('reportMedianResponse')),
                    header('calls', t('reportCalls')),
                    header('tasks', t('reportTasks')),
                    header('visits', t('reportVisits')),
                    header('messages', t('reportMessagesSent')),
                    header('status_changes', t('reportStatusChanges')),
                    header('deals_won', t('reportDealsWon')),
                    header('revenue', t('reportRevenue')),
                    ...(tracking ? [header('worked', t('reportWorkedHours'))] : []),
                  ]}
                >
                  {rows.map((r) => (
                    <tr key={r.user_id} className={rowCls}>
                      <td className={`${tdCls} font-medium`}>{r.name}</td>
                      <td className={tdCls}>{formatCount(r.leads_assigned)}</td>
                      <td className={tdCls}>
                        <DrillNumber
                          value={r.leads_touched}
                          onClick={drill(`${r.name} · ${t('reportTouched')}`, { metric: 'responded', user_ids: [r.user_id] })}
                        />
                      </td>
                      <td className={`${tdCls} tabular-nums`}>{formatPercent(r.touch_rate)}</td>
                      <td className={tdCls}>
                        <ResponseTimeCell business={r.response_business.median} wall={r.response_wall.median} />
                      </td>
                      <td className={`${tdCls} tabular-nums`} title={`${t('reportAnswered')}: ${r.calls.answered} · ${t('reportMissed')}: ${r.calls.missed}`}>
                        {formatCount(r.calls.total)}
                      </td>
                      <td className={`${tdCls} tabular-nums`}>{formatCount(r.tasks)}</td>
                      <td className={`${tdCls} tabular-nums`}>{formatCount(r.visits)}</td>
                      <td className={`${tdCls} tabular-nums`} title={`WhatsApp ${r.whatsapp_sent} · SMS ${r.sms_sent}`}>
                        {formatCount(r.whatsapp_sent + r.sms_sent)}
                      </td>
                      <td className={`${tdCls} tabular-nums`}>{formatCount(r.status_changes)}</td>
                      <td className={`${tdCls} tabular-nums`}>{formatCount(r.deals_won)}</td>
                      <td className={`${tdCls} tabular-nums`}>{formatMoney(r.revenue)}</td>
                      {tracking ? <td className={`${tdCls} tabular-nums`}>{formatDuration(r.worked_seconds, t)}</td> : null}
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <EmptyState message={t('reportNoData')} />
              )}
            </ReportCard>
          </>
        );
      }}
    </SectionShell>
  );
};
