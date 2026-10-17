import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { formatCount } from '../../../utils/reportFormat';
import { leadTypeLabel, sourceLabel } from '../../../utils/reportLabels';
import { seedLabel } from '../../../utils/seedLabels';
import { BarList, TrendChart } from '../ReportCharts';
import { EmptyState, KpiTile, ReportCard } from '../ReportKit';
import { SectionShell, type TabProps } from './SectionShell';

export const LeadsTab = ({ query, onDrill }: TabProps) => {
  const { t, language } = useAppContext();
  const drill = (title: string, extra: object) => () => onDrill({ title, query: { ...query, ...extra } });

  return (
    <SectionShell section="leads" query={query}>
      {(data) => {
        const f = data.funnel;
        const startByStatus = new Map((data.status_as_of_start ?? []).map((s) => [s.status_id, s.count]));
        return (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiTile label={t('reportNewLeads')} value={formatCount(f.created)} onClick={drill(t('reportNewLeads'), { metric: 'created' })} />
              <KpiTile label={t('reportAssigned')} value={formatCount(f.assigned)} />
              <KpiTile label={t('reportTouched')} value={formatCount(f.touched)} onClick={drill(t('reportTouched'), { metric: 'responded' })} />
              <KpiTile
                label={t('reportUnassigned')}
                value={formatCount(data.unassigned)}
                onClick={drill(t('reportUnassigned'), { metric: 'unassigned' })}
              />
            </div>

            <ReportCard title={t('reportNewLeadsOverTime')}>
              <TrendChart data={data.series} granularity={data.meta.granularity} series={[{ key: 'new_leads', label: t('reportNewLeads') }]} bars />
            </ReportCard>

            <ReportCard title={t('reportStatusAsOfEnd')} hint={t('reportStatusAsOfEndHint')}>
              {data.status_as_of_end.length ? (
                <BarList
                  rows={data.status_as_of_end.map((s) => {
                    const before = data.status_as_of_start ? (startByStatus.get(s.status_id) ?? 0) : null;
                    return {
                      key: s.status_id ?? s.status,
                      label: seedLabel(s.status, language),
                      value: s.count,
                      color: s.color ?? undefined,
                      hint: before != null ? `${s.count - before >= 0 ? '+' : ''}${s.count - before}` : undefined,
                    };
                  })}
                />
              ) : (
                <EmptyState message={t('reportNoData')} />
              )}
            </ReportCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <ReportCard title={t('reportBySource')}>
                {data.by_source.length ? (
                  <BarList rows={data.by_source.map((r) => ({ key: String(r.key), label: sourceLabel(String(r.key), t), value: r.count }))} />
                ) : (
                  <EmptyState message={t('reportNoData')} />
                )}
              </ReportCard>
              <ReportCard title={t('reportByCampaign')}>
                {data.by_campaign.length ? (
                  <BarList rows={data.by_campaign.map((r) => ({ key: String(r.key), label: r.label, value: r.count }))} />
                ) : (
                  <EmptyState message={t('reportNoData')} />
                )}
              </ReportCard>
              <ReportCard title={t('reportByChannel')}>
                {data.by_channel.length ? (
                  <BarList rows={data.by_channel.map((r) => ({ key: String(r.key), label: seedLabel(r.label, language), value: r.count }))} />
                ) : (
                  <EmptyState message={t('reportNoData')} />
                )}
              </ReportCard>
              <ReportCard title={t('reportByAssignee')}>
                {data.by_assignee.length ? (
                  <BarList rows={data.by_assignee.map((r) => ({ key: String(r.key), label: r.label, value: r.count }))} />
                ) : (
                  <EmptyState message={t('reportNoData')} />
                )}
              </ReportCard>
              <ReportCard title={t('leadType')}>
                {data.by_type.length ? (
                  <BarList rows={data.by_type.map((r) => ({ key: String(r.key), label: leadTypeLabel(String(r.key), t), value: r.count }))} />
                ) : (
                  <EmptyState message={t('reportNoData')} />
                )}
              </ReportCard>
            </div>
          </>
        );
      }}
    </SectionShell>
  );
};
