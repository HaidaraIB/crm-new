import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import type { SourceRow } from '../../../services/reportsTypes';
import { formatCount, formatDuration, formatMoney, formatPercent } from '../../../utils/reportFormat';
import { sourceLabel } from '../../../utils/reportLabels';
import { EmptyState, ReportCard } from '../ReportKit';
import { DataTable, DrillNumber, rowCls, SectionShell, tdCls, type TabProps } from './SectionShell';

export const SourcesTab = ({ query, onDrill }: TabProps) => {
  const { t } = useAppContext();

  const table = (rows: SourceRow[], nameOf: (r: SourceRow) => string, drillKey: 'sources' | 'campaign_ids', campaign: boolean) =>
    rows.length ? (
      <DataTable
        minWidth={campaign ? 860 : 720}
        head={[
          campaign ? t('reportCampaign') : t('reportSource'),
          t('reportLeadsCountShort'),
          t('reportConvertedLeads'),
          t('reportConversionRate'),
          t('reportDealsWon'),
          t('reportRevenue'),
          t('reportAvgResponse'),
          ...(campaign ? [t('budget'), t('costPerLead')] : []),
        ]}
      >
        {rows.map((r) => (
          <tr key={String(r.key)} className={rowCls}>
            <td className={`${tdCls} font-medium`}>{nameOf(r)}</td>
            <td className={tdCls}>
              <DrillNumber
                value={r.leads}
                onClick={() =>
                  onDrill({
                    title: nameOf(r),
                    query: {
                      ...query,
                      metric: 'created',
                      ...(drillKey === 'sources' ? { sources: [String(r.key)] } : { campaign_ids: [Number(r.key)] }),
                    },
                  })
                }
              />
            </td>
            <td className={`${tdCls} tabular-nums`}>{formatCount(r.converted_leads)}</td>
            <td className={`${tdCls} tabular-nums`}>{formatPercent(r.conversion_rate)}</td>
            <td className={`${tdCls} tabular-nums`}>{formatCount(r.deals_won)}</td>
            <td className={`${tdCls} tabular-nums`}>{formatMoney(r.revenue)}</td>
            <td className={`${tdCls} tabular-nums`}>{formatDuration(r.avg_business_response_seconds, t)}</td>
            {campaign ? <td className={`${tdCls} tabular-nums`}>{r.budget != null ? formatMoney(r.budget) : '—'}</td> : null}
            {campaign ? <td className={`${tdCls} tabular-nums`}>{r.cost_per_lead != null ? formatMoney(r.cost_per_lead) : '—'}</td> : null}
          </tr>
        ))}
      </DataTable>
    ) : (
      <EmptyState message={t('reportNoData')} />
    );

  return (
    <SectionShell section="sources" query={query}>
      {(data) => (
        <>
          <ReportCard title={t('reportBySource')} hint={t('reportSourcesHint')}>
            {table(data.by_source, (r) => sourceLabel(String(r.key), t), 'sources', false)}
          </ReportCard>
          <ReportCard title={t('reportByCampaign')}>{table(data.by_campaign, (r) => r.label, 'campaign_ids', true)}</ReportCard>
        </>
      )}
    </SectionShell>
  );
};
