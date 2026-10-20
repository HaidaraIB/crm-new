/**
 * Settings > Phone System > Usage (spec section 6 GET /usage): this month's
 * outgoing minutes against the plan, quotas against what is in use, and the
 * last 30 days of calls (rolled up nightly; today is live).
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { getTelephonyUsageAPI, type PbxUsageDay } from '../../../services/api';
import { formatBytes } from './RecordingSection';
import { SectionHeader, useTr } from './shared';

const Meter = ({ id, label, used, limit, format = String }: {
  id: string; label: string; used: number; limit: number | null; format?: (n: number) => string;
}) => {
  const tr = useTr();
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800" data-usage={id}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100" dir="ltr">
        {format(used)}
        <span className="text-sm font-normal text-gray-500"> / {limit == null ? tr('pbxUsageUnlimited') : format(limit)}</span>
      </p>
      {limit ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700" aria-hidden>
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
};

const Chart = ({ days }: { days: PbxUsageDay[] }) => {
  const tr = useTr();
  const max = Math.max(1, ...days.map((d) => d.calls_inbound + d.calls_outbound + d.calls_internal));
  return (
    <figure>
      <figcaption className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{tr('pbxUsageCallsPerDay')}</figcaption>
      <div className="flex h-36 items-end gap-1" dir="ltr" role="img" aria-label={tr('pbxUsageCallsPerDay')}>
        {days.map((d) => {
          const total = d.calls_inbound + d.calls_outbound + d.calls_internal;
          return (
            <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${total}`}>
              <div className="w-full rounded-t bg-primary/70" style={{ height: `${(total / max) * 100}%`, minHeight: total ? 2 : 0 }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-500" dir="ltr">
        <span>{days[0]?.day}</span>
        <span>{days[days.length - 1]?.day}</span>
      </div>
    </figure>
  );
};

export const UsageSection = () => {
  const tr = useTr();
  const usage = useQuery({ queryKey: ['telephony', 'settings', 'usage'], queryFn: getTelephonyUsageAPI });
  const data = usage.data;
  const month = data?.days.filter((d) => d.day >= data.period_start) ?? [];
  const sum = (key: keyof PbxUsageDay) => month.reduce((n, d) => n + Number(d[key] || 0), 0);
  return (
    <div className="space-y-5">
      <SectionHeader title={tr('pbxUsage')} hint={tr('pbxUsageHint')} />
      {usage.isLoading ? <p className="text-sm text-gray-500">{tr('loading')}</p> : null}
      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Meter id="minutes" label={tr('pbxUsageMinutes')} used={data.minutes.used} limit={data.minutes.limit} />
            <Meter id="extensions" label={tr('pbxExtensions')} used={data.extensions.used} limit={data.extensions.limit} />
            <Meter id="trunks" label={tr('pbxTrunks')} used={data.trunks.used} limit={data.trunks.limit} />
            <Meter id="storage" label={tr('pbxRecordingStorage')} used={data.recording_bytes.used}
              limit={data.recording_bytes.limit} format={formatBytes} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tr('pbxUsageLimits')
              .replace('{calls}', data.concurrent_calls.limit == null ? tr('pbxUsageUnlimited') : String(data.concurrent_calls.limit))
              .replace('{cps}', data.cps.limit == null ? tr('pbxUsageUnlimited') : String(data.cps.limit))}
          </p>
          {data.concurrent_calls.hits_7d > 0 || data.cps.hits_7d > 0 ? (
            <div role="status" data-usage="limit-hits"
              className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
              {([
                ['pbxLimitHitConcurrent', data.concurrent_calls],
                ['pbxLimitHitCps', data.cps],
              ] as const).filter(([, q]) => q.hits_7d > 0).map(([key, q]) => (
                <p key={key}>
                  {tr(key)
                    .replace('{n}', String(q.hits_7d))
                    .replace('{limit}', String(q.limit ?? ''))
                    .replace('{when}', q.last_hit_at ? new Date(q.last_hit_at).toLocaleString() : '')}
                </p>
              ))}
              <p className="text-amber-800 dark:text-amber-200">{tr('pbxLimitHitAction')}</p>
            </div>
          ) : null}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-usage="month">
            {([
              ['pbxDirection_inbound', sum('calls_inbound')],
              ['pbxDirection_outbound', sum('calls_outbound')],
              ['pbxUsageAnswered', sum('calls_answered')],
              ['pbxUsageMissed', sum('calls_missed')],
            ] as const).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                <dt className="text-xs text-gray-500 dark:text-gray-400">{tr(key)} · {tr('pbxUsageThisMonth')}</dt>
                <dd className="text-lg font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <Chart days={data.days} />
        </>
      ) : null}
    </div>
  );
};
