import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { formatCount, formatDuration } from '../../../utils/reportFormat';
import { transitionSourceLabel } from '../../../utils/reportLabels';
import { seedLabel } from '../../../utils/seedLabels';
import { BarList, SankeyDiagram } from '../ReportCharts';
import { EmptyState, KpiTile, ReportCard } from '../ReportKit';
import { DataTable, DrillNumber, rowCls, SectionShell, tdCls, type TabProps } from './SectionShell';

export const StatusJourneyTab = ({ query, onDrill }: TabProps) => {
  const { t, language } = useAppContext();
  const label = (s: string) => seedLabel(s, language);
  const entered = (statusId: number | null, name: string) => () =>
    statusId != null &&
    onDrill({
      title: `${t('reportEnteredStatus')}: ${label(name)}`,
      query: { ...query, metric: 'status_entered', status_id: statusId },
    });

  return (
    <SectionShell section="status-journey" query={query}>
      {(data) => (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiTile label={t('reportStatusChanges')} value={formatCount(data.transitions)} />
            <KpiTile label={t('reportLeadsWithChanges')} value={formatCount(data.leads_with_changes)} />
            <KpiTile label={t('reportReopened')} value={formatCount(data.reopened)} sub={t('reportReopenedHint')} />
            <KpiTile
              label={t('reportAvgChangesPerLead')}
              value={data.leads_with_changes ? (data.transitions / data.leads_with_changes).toFixed(1) : '—'}
            />
          </div>

          <ReportCard title={t('reportStatusFlow')} hint={t('reportStatusFlowHint')}>
            {data.sankey.links.length ? (
              <SankeyDiagram nodes={data.sankey.nodes} links={data.sankey.links} localize={label} />
            ) : (
              <EmptyState message={t('reportNoTransitions')} />
            )}
          </ReportCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCard title={t('reportEnteredEachStatus')} hint={t('reportEnteredEachStatusHint')}>
              {data.entered.length ? (
                <BarList
                  rows={data.entered.map((r) => ({
                    key: r.status_id ?? r.status,
                    label: label(r.status),
                    value: r.leads,
                    hint: r.entries !== r.leads ? `${r.entries} ${t('reportEntries')}` : undefined,
                    onClick: r.status_id != null ? entered(r.status_id, r.status) : undefined,
                  }))}
                />
              ) : (
                <EmptyState message={t('reportNoTransitions')} />
              )}
            </ReportCard>

            <ReportCard title={t('reportTimeInStatus')} hint={t('reportTimeInStatusHint')}>
              {data.time_in_status.length ? (
                <DataTable head={[t('status'), t('reportAverage'), t('reportMedian'), 'P90', t('reportSamples')]} minWidth={420}>
                  {data.time_in_status.map((r) => (
                    <tr key={r.status} className={rowCls}>
                      <td className={`${tdCls} font-medium`}>{label(r.status)}</td>
                      <td className={`${tdCls} tabular-nums`}>{formatDuration(r.avg, t)}</td>
                      <td className={`${tdCls} tabular-nums`}>{formatDuration(r.median, t)}</td>
                      <td className={`${tdCls} tabular-nums`}>{formatDuration(r.p90, t)}</td>
                      <td className={`${tdCls} tabular-nums text-gray-500`}>{r.count}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <EmptyState message={t('reportNoTransitions')} />
              )}
            </ReportCard>
          </div>

          <ReportCard title={t('reportTransitionMatrix')} hint={t('reportTransitionMatrixHint')}>
            {data.matrix.length ? (
              <DataTable head={[t('reportFromStatus'), t('reportToStatus'), t('reportLeadsCountShort')]} minWidth={420}>
                {data.matrix.slice(0, 40).map((m, i) => (
                  <tr key={i} className={rowCls}>
                    <td className={tdCls}>{label(m.from)}</td>
                    <td className={tdCls}>{label(m.to)}</td>
                    <td className={tdCls}>
                      <DrillNumber value={m.count} onClick={entered(m.to_status_id, m.to)} />
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState message={t('reportNoTransitions')} />
            )}
          </ReportCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCard title={t('reportCommonPaths')}>
              {data.common_paths.length ? (
                <ul className="space-y-2">
                  {data.common_paths.map((p) => (
                    <li key={p.path} className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800/50">
                      <span dir="auto" className="min-w-0 break-words">
                        {p.path.split(' → ').map(label).join(' → ')}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{p.leads}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message={t('reportNoTransitions')} />
              )}
            </ReportCard>
            <ReportCard title={t('reportChangesBySource')} hint={t('reportChangesBySourceHint')}>
              {data.by_source.length ? (
                <BarList
                  rows={data.by_source.map((r) => ({
                    key: r.source,
                    label: transitionSourceLabel(r.source, t),
                    value: r.count,
                  }))}
                />
              ) : (
                <EmptyState message={t('reportNoTransitions')} />
              )}
            </ReportCard>
          </div>
        </>
      )}
    </SectionShell>
  );
};
