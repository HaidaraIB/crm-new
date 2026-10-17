import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { formatCount, formatMoney, formatPercent } from '../../../utils/reportFormat';
import { BarList, TrendChart } from '../ReportCharts';
import { EmptyState, KpiTile, ReportCard } from '../ReportKit';
import { DataTable, rowCls, SectionShell, tdCls, type TabProps } from './SectionShell';

export const DealsTab = ({ query }: TabProps) => {
  const { t } = useAppContext();
  return (
    <SectionShell section="deals" query={query}>
      {(data) => {
        const s = data.summary;
        return (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <KpiTile label={t('reportDealsCreated')} value={formatCount(s.created)} />
              <KpiTile label={t('reportDealsWon')} value={formatCount(s.won)} />
              <KpiTile label={t('reportDealsLost')} value={formatCount(s.lost)} />
              <KpiTile label={t('reportWinRate')} value={formatPercent(s.win_rate)} />
              <KpiTile label={t('reportRevenue')} value={formatMoney(s.revenue)} />
              <KpiTile
                label={t('reportAvgCycle')}
                value={s.avg_cycle_days != null ? `${s.avg_cycle_days} ${t('reportUnitDay')}` : '—'}
                sub={t('reportAvgCycleHint')}
              />
            </div>

            <ReportCard title={t('reportDealsWonOverTime')}>
              <TrendChart
                data={data.series}
                granularity={data.meta.granularity}
                series={[{ key: 'won', label: t('reportDealsWon') }]}
                bars
              />
            </ReportCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <ReportCard title={t('reportLostReasons')}>
                {data.lost_reasons.length ? (
                  <BarList rows={data.lost_reasons.map((r) => ({ key: r.reason, label: r.reason, value: r.count }))} />
                ) : (
                  <EmptyState message={t('reportNoData')} />
                )}
              </ReportCard>
              <ReportCard title={t('reportStageMovement')} hint={t('reportStageMovementHint')}>
                {data.stage_movement.length ? (
                  <BarList rows={data.stage_movement.map((r) => ({ key: r.stage, label: r.stage, value: r.count }))} />
                ) : (
                  <EmptyState message={t('reportNoData')} />
                )}
              </ReportCard>
            </div>

            <ReportCard title={t('reportWonByEmployee')}>
              {data.by_employee.length ? (
                <DataTable head={[t('employee'), t('reportDealsWon'), t('reportRevenue')]} minWidth={360}>
                  {data.by_employee.map((e) => (
                    <tr key={e.user_id ?? e.name} className={rowCls}>
                      <td className={`${tdCls} font-medium`}>{e.name}</td>
                      <td className={`${tdCls} tabular-nums`}>{e.won}</td>
                      <td className={`${tdCls} tabular-nums`}>{formatMoney(e.revenue)}</td>
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
