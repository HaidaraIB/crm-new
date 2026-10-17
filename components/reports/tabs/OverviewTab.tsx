import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { formatCount, formatDuration, formatMoney, formatPercent } from '../../../utils/reportFormat';
import { TrendChart } from '../ReportCharts';
import { DeltaBadge, KpiTile, ReportCard } from '../ReportKit';
import { SectionShell, type TabProps } from './SectionShell';

export const OverviewTab = ({ query, onDrill }: TabProps) => {
  const { t } = useAppContext();
  const drill = (title: string, extra: object) => () => onDrill({ title, query: { ...query, ...extra } });

  return (
    <SectionShell section="overview" query={query}>
      {(data) => {
        const c = data.current;
        const p = data.previous;
        return (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiTile
                label={t('reportNewLeads')}
                value={formatCount(c.new_leads)}
                delta={p ? <DeltaBadge current={c.new_leads} previous={p.new_leads} /> : null}
                onClick={drill(t('reportNewLeads'), { metric: 'created' })}
              />
              <KpiTile
                label={t('reportLeadsWorked')}
                value={formatCount(c.leads_worked)}
                sub={`${t('reportOf')} ${formatCount(c.assignments)} ${t('reportAssignments')}`}
                delta={p ? <DeltaBadge current={c.leads_worked} previous={p.leads_worked} /> : null}
                onClick={drill(t('reportLeadsWorked'), { metric: 'responded' })}
              />
              <KpiTile
                label={t('reportMedianResponse')}
                value={formatDuration(c.response_time.business.median, t)}
                sub={c.response_time.wall.median != null ? `${formatDuration(c.response_time.wall.median, t)} ${t('reportRaw')}` : undefined}
                delta={
                  p ? (
                    <DeltaBadge
                      current={c.response_time.business.median}
                      previous={p.response_time.business.median}
                      lowerIsBetter
                    />
                  ) : null
                }
              />
              <KpiTile
                label={t('reportWithinSla')}
                value={formatPercent(c.within_sla_pct)}
                sub={`≤ ${formatDuration(c.sla_seconds, t)}`}
                delta={p ? <DeltaBadge current={c.within_sla_pct} previous={p.within_sla_pct} /> : null}
              />
              <KpiTile
                label={t('reportStatusChanges')}
                value={formatCount(c.status_changes)}
                delta={p ? <DeltaBadge current={c.status_changes} previous={p.status_changes} /> : null}
              />
              <KpiTile
                label={t('reportCalls')}
                value={formatCount(c.calls)}
                delta={p ? <DeltaBadge current={c.calls} previous={p.calls} /> : null}
              />
              <KpiTile
                label={t('reportDealsWon')}
                value={formatCount(c.deals_won)}
                sub={`${formatMoney(c.revenue)} ${t('reportRevenue')}`}
                delta={p ? <DeltaBadge current={c.deals_won} previous={p.deals_won} /> : null}
              />
              <KpiTile
                label={t('reportConversionRate')}
                value={formatPercent(c.conversion_rate)}
                delta={p ? <DeltaBadge current={c.conversion_rate} previous={p.conversion_rate} /> : null}
              />
            </div>

            {c.unanswered_customer_messages > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                {t('reportUnansweredMessages').replace('{count}', String(c.unanswered_customer_messages))}
              </div>
            ) : null}

            <ReportCard title={t('reportNewLeadsOverTime')}>
              <TrendChart
                data={data.series}
                granularity={data.meta.granularity}
                series={[{ key: 'new_leads', label: t('reportNewLeads') }]}
              />
            </ReportCard>
          </>
        );
      }}
    </SectionShell>
  );
};
