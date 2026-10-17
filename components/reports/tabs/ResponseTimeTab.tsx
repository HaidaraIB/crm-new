import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import type { ResponseBucketKey } from '../../../services/reportsTypes';
import { formatCount, formatDuration, formatPercent } from '../../../utils/reportFormat';
import { BUCKET_LABEL_KEYS, channelLabel, responseKindLabel } from '../../../utils/reportLabels';
import { BarList, ResponseHeatmap } from '../ReportCharts';
import { EmptyState, KpiTile, ReportCard, ResponseTimeCell } from '../ReportKit';
import { DataTable, DrillNumber, rowCls, SectionShell, tdCls, type TabProps } from './SectionShell';

const BUCKET_COLORS: Record<ResponseBucketKey, string> = {
  lt_5m: '#10b981',
  '5_15m': '#84cc16',
  '15_60m': '#f59e0b',
  '1_4h': '#f97316',
  '4_24h': '#ef4444',
  gt_24h: '#b91c1c',
  no_response: '#6b7280',
};

export const ResponseTimeTab = ({ query, onDrill }: TabProps) => {
  const { t, openLeadDetails } = useAppContext();
  const [basis, setBasis] = useState<'business' | 'wall'>('business');
  const drill = (title: string, extra: object) => () => onDrill({ title, query: { ...query, ...extra } });

  return (
    <SectionShell section="response-time" query={query}>
      {(data) => {
        const s = data.summary;
        return (
          <>
            <div className="rounded-xl border border-primary-100 bg-primary-50/60 px-4 py-3 text-sm text-primary-900 dark:border-primary-900/50 dark:bg-primary-950/30 dark:text-primary-100">
              {t('reportResponseExplainer')}
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiTile
                label={t('reportMedianResponse')}
                value={formatDuration(s.business.median, t)}
                sub={s.wall.median != null ? `${formatDuration(s.wall.median, t)} ${t('reportRaw')}` : undefined}
              />
              <KpiTile
                label={t('reportSlowest10')}
                value={formatDuration(s.business.p90, t)}
                sub={s.wall.p90 != null ? `${formatDuration(s.wall.p90, t)} ${t('reportRaw')}` : undefined}
              />
              <KpiTile
                label={t('reportLeadsWorked')}
                value={formatCount(s.responded)}
                sub={`${t('reportOf')} ${formatCount(s.assignments)}`}
                onClick={drill(t('reportLeadsWorked'), { metric: 'responded' })}
              />
              <KpiTile
                label={t('reportWaitingNow')}
                value={formatCount(s.pending)}
                sub={t('reportWaitingNowHint')}
                onClick={drill(t('reportWaitingNow'), { metric: 'unanswered' })}
              />
            </div>

            <ReportCard
              title={t('reportResponseDistribution')}
              action={
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800" role="group" aria-label={t('reportTimeBasis')}>
                  {(['business', 'wall'] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={basis === b}
                      onClick={() => setBasis(b)}
                      className={`h-8 rounded-md px-3 text-xs font-semibold ${
                        basis === b ? 'bg-white shadow-sm dark:bg-gray-700' : 'text-gray-500'
                      }`}
                    >
                      {b === 'business' ? t('reportBusinessTime') : t('reportWallTime')}
                    </button>
                  ))}
                </div>
              }
              hint={t('reportResponseDistributionHint')}
            >
              <BarList
                rows={data.distribution[basis].map((b) => ({
                  key: b.bucket,
                  label: t(BUCKET_LABEL_KEYS[b.bucket]),
                  value: b.count,
                  color: BUCKET_COLORS[b.bucket],
                  onClick:
                    b.count > 0
                      ? drill(t(BUCKET_LABEL_KEYS[b.bucket]), { metric: 'response_bucket', bucket: b.bucket })
                      : undefined,
                }))}
              />
              {basis === 'wall' ? (
                <p className="mt-3 text-xs text-gray-500">{t('reportBucketsBusinessNote')}</p>
              ) : null}
            </ReportCard>

            <ReportCard title={t('reportByEmployee')} hint={`${t('reportSlaTarget')}: ${formatDuration(data.sla_seconds, t)}`}>
              {data.employees.length ? (
                <DataTable
                  minWidth={760}
                  head={[
                    t('employee'),
                    t('reportAssignments'),
                    t('reportResponded'),
                    t('reportWaitingNow'),
                    t('reportMissed'),
                    t('reportMedian'),
                    'P90',
                    t('reportWithinSla'),
                  ]}
                >
                  {data.employees.map((e) => (
                    <tr key={e.user_id} className={rowCls}>
                      <td className={`${tdCls} font-medium`}>{e.name}</td>
                      <td className={tdCls}>{formatCount(e.assignments)}</td>
                      <td className={tdCls}>
                        <DrillNumber
                          value={e.responded}
                          onClick={drill(`${e.name} · ${t('reportResponded')}`, { metric: 'responded', user_ids: [e.user_id] })}
                        />
                      </td>
                      <td className={tdCls}>
                        <DrillNumber
                          value={e.pending}
                          onClick={drill(`${e.name} · ${t('reportWaitingNow')}`, { metric: 'unanswered', user_ids: [e.user_id] })}
                        />
                      </td>
                      <td className={`${tdCls} tabular-nums`}>{formatCount(e.missed)}</td>
                      <td className={tdCls}>
                        <ResponseTimeCell business={e.business.median} wall={e.wall.median} />
                      </td>
                      <td className={tdCls}>
                        <ResponseTimeCell business={e.business.p90} wall={e.wall.p90} />
                      </td>
                      <td className={`${tdCls} tabular-nums`}>{formatPercent(e.within_sla_pct)}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <EmptyState message={t('reportNoData')} />
              )}
            </ReportCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <ReportCard title={t('reportHowTheyResponded')}>
                {data.by_kind.length ? (
                  <BarList rows={data.by_kind.map((k) => ({ key: k.kind, label: responseKindLabel(k.kind, t), value: k.count }))} />
                ) : (
                  <EmptyState message={t('reportNoData')} />
                )}
              </ReportCard>

              <ReportCard title={t('reportOldestWaiting')} hint={t('reportOldestWaitingHint')}>
                {data.oldest_pending.length ? (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.oldest_pending.map((p) => (
                      <li key={`${p.client_id}-${p.user_id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openLeadDetails({ id: p.client_id } as any)}
                            className="block max-w-full truncate text-start font-semibold text-primary-700 hover:underline dark:text-primary-300"
                          >
                            {p.client || `#${p.client_id}`}
                          </button>
                          <span className="text-xs text-gray-500">{p.user}</span>
                        </div>
                        <ResponseTimeCell business={p.waiting_business_seconds} wall={p.waiting_seconds} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message={t('reportNobodyWaiting')} />
                )}
              </ReportCard>
            </div>

            <ReportCard title={t('reportBusiestHours')} hint={t('reportBusiestHoursHint')}>
              <ResponseHeatmap data={data.heatmap} />
            </ReportCard>

            <ReportCard title={t('reportCustomerMessageReplies')} hint={t('reportCustomerMessageRepliesHint')}>
              {data.conversation_replies.total ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <DataTable head={[t('reportChannel'), t('reportReplies'), t('reportMedian'), 'P90']} minWidth={360}>
                    {data.conversation_replies.by_channel.map((c) => (
                      <tr key={c.channel} className={rowCls}>
                        <td className={`${tdCls} font-medium`}>{channelLabel(c.channel, t)}</td>
                        <td className={`${tdCls} tabular-nums`}>{formatCount(c.count)}</td>
                        <td className={tdCls}>
                          <ResponseTimeCell business={c.business.median} wall={c.wall.median} />
                        </td>
                        <td className={tdCls}>
                          <ResponseTimeCell business={c.business.p90} wall={c.wall.p90} />
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                  <DataTable head={[t('employee'), t('reportReplies'), t('reportMedian'), 'P90']} minWidth={360}>
                    {data.conversation_replies.by_employee.map((c) => (
                      <tr key={c.user_id ?? c.name} className={rowCls}>
                        <td className={`${tdCls} font-medium`}>{c.name}</td>
                        <td className={`${tdCls} tabular-nums`}>{formatCount(c.count)}</td>
                        <td className={tdCls}>
                          <ResponseTimeCell business={c.business.median} wall={c.wall.median} />
                        </td>
                        <td className={tdCls}>
                          <ResponseTimeCell business={c.business.p90} wall={c.wall.p90} />
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
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
