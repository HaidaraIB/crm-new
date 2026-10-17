import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { formatCount, formatDuration } from '../../../utils/reportFormat';
import { BarList, TrendChart } from '../ReportCharts';
import { EmptyState, KpiTile, ReportCard } from '../ReportKit';
import { DataTable, rowCls, SectionShell, tdCls, type TabProps } from './SectionShell';

export const CallsTab = ({ query }: TabProps) => {
  const { t } = useAppContext();
  return (
    <SectionShell section="calls" query={query}>
      {(data) => {
        const s = data.summary;
        const hours = data.by_hour.map((count, h) => ({ key: h, label: `${String(h).padStart(2, '0')}:00`, value: count }));
        return (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiTile label={t('reportCalls')} value={formatCount(s.total)} />
              <KpiTile label={t('reportAnswered')} value={formatCount(s.answered)} />
              <KpiTile label={t('reportMissed')} value={formatCount(s.missed)} />
              <KpiTile
                label={t('reportAvgRecordedDuration')}
                value={formatDuration(s.avg_recorded_duration_seconds, t)}
                sub={t('reportRecordedOnly')}
              />
            </div>

            <ReportCard title={t('reportCallsOverTime')}>
              <TrendChart data={data.series} granularity={data.meta.granularity} series={[{ key: 'calls', label: t('reportCalls') }]} bars />
            </ReportCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <ReportCard title={t('reportCallsByHour')} hint={t('reportCallsByHourHint')}>
                {s.total ? <BarList rows={hours.filter((h) => h.value > 0)} /> : <EmptyState message={t('reportNoData')} />}
              </ReportCard>
              <ReportCard title={t('callReportsByMethodTitle')}>
                {data.by_method.length ? (
                  <DataTable head={[t('callMethod'), t('reportCalls'), t('reportAnswered'), t('reportMissed')]} minWidth={360}>
                    {data.by_method.map((m) => (
                      <tr key={m.name} className={rowCls}>
                        <td className={`${tdCls} font-medium`}>{m.name}</td>
                        <td className={`${tdCls} tabular-nums`}>{m.total}</td>
                        <td className={`${tdCls} tabular-nums`}>{m.answered}</td>
                        <td className={`${tdCls} tabular-nums`}>{m.missed}</td>
                      </tr>
                    ))}
                  </DataTable>
                ) : (
                  <EmptyState message={t('reportNoData')} />
                )}
              </ReportCard>
            </div>

            <ReportCard title={t('callReportsByUserTitle')}>
              {data.by_user.length ? (
                <DataTable head={[t('employee'), t('reportCalls'), t('reportAnswered'), t('reportMissed'), t('reportUnclassified')]} minWidth={520}>
                  {data.by_user.map((u) => (
                    <tr key={u.id} className={rowCls}>
                      <td className={`${tdCls} font-medium`}>{u.name}</td>
                      <td className={`${tdCls} tabular-nums`}>{u.total}</td>
                      <td className={`${tdCls} tabular-nums`}>{u.answered}</td>
                      <td className={`${tdCls} tabular-nums`}>{u.missed}</td>
                      <td className={`${tdCls} tabular-nums text-gray-500`}>{u.unknown}</td>
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
