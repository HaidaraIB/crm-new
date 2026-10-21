/**
 * Calls page > Phone system > Live: live calls, queue waits and today's queue
 * stats (GET /telephony/wallboard/). No socket carries call data (ADR 0003): the
 * board is re-read when the `telephony` sync slice moves, with a slow floor poll
 * in case a bump is ever missed. Durations tick locally between reads.
 */
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAppContext } from '../../context/AppContext';
import { usePersistedTab } from '../../hooks/usePersistedTab';
import { useInvalidateOnSliceChange } from '../../hooks/useSliceVersion';
import { getPbxWallboardAPI, type AgentPresence, type PbxLiveCall, type PbxWallboardQueue } from '../../services/api';
import { PhoneText, isPhoneLike } from '../PhoneText';
import { PbxCallsPanel } from './PbxCallsPanel';

const WALLBOARD_KEY = ['telephony', 'wallboard'] as const;
const FLOOR_MS = 30_000;

function useTr() {
  const { t } = useAppContext();
  return (key: string) => (t as (k: string) => string)(key);
}

/** Re-render every second so waits and talk times move between reads. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function clock(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`;
}

const since = (iso: string | null, now: number) => (iso ? (now - new Date(iso).getTime()) / 1000 : null);

function Party({ value }: { value: string }) {
  if (!value) return <span>—</span>;
  return isPhoneLike(value) || /^\d{2,6}$/.test(value) ? <PhoneText>{value}</PhoneText> : <span>{value}</span>;
}

const Tile = ({ label, value, tone = 'gray' }: { label: string; value: React.ReactNode; tone?: 'gray' | 'amber' | 'rose' | 'emerald' }) => {
  const tones = {
    gray: 'text-gray-900 dark:text-gray-100',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
    </div>
  );
};

const QueueCard = ({ queue, serviceLevelS }: { queue: PbxWallboardQueue; serviceLevelS: number }) => {
  const tr = useTr();
  const { agents, today } = queue;
  const stat = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
  );
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800" aria-label={queue.name} data-queue={queue.id}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-base font-semibold text-gray-900 dark:text-gray-100">{queue.name}</h3>
        <div className="text-end">
          <p className={`text-3xl font-semibold tabular-nums ${queue.waiting ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}`} data-waiting={queue.waiting}>
            {queue.waiting}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{tr('pbxWallWaiting')}</p>
        </div>
      </div>
      {queue.waiting ? (
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
          {tr('pbxWallLongestWait')} <span className="tabular-nums" dir="ltr">{clock(queue.longest_wait_s)}</span>
        </p>
      ) : null}
      <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
        {stat(tr('pbxWallAgentsAvailable'), agents.available)}
        {stat(tr('pbxWallAgentsOnCall'), agents.on_call)}
        {stat(tr('pbxWallAgentsPaused'), agents.paused)}
        {stat(tr('pbxWallAgentsOffline'), agents.offline)}
      </dl>
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
        {stat(tr('pbxWallOffered'), today.offered)}
        {stat(tr('pbxWallAnswered'), today.answered)}
        {stat(tr('pbxWallAbandoned'), today.abandoned)}
        {stat(tr('pbxWallOverflow'), today.overflow)}
        {stat(tr('pbxWallAvgWait'), <span dir="ltr">{clock(today.avg_wait_s)}</span>)}
        {stat(tr('pbxWallServiceLevel').replace('{s}', String(serviceLevelS)), today.service_level_pct == null ? '—' : `${today.service_level_pct}%`)}
      </dl>
    </section>
  );
};

function callState(call: PbxLiveCall): string {
  if (call.waiting) return 'waiting';
  if (call.on_hold) return 'on_hold';
  return call.status;
}

const LiveCalls = ({ calls, now }: { calls: PbxLiveCall[]; now: number }) => {
  const tr = useTr();
  const { openLeadDetails } = useAppContext();
  if (!calls.length) {
    return <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">{tr('pbxWallNoLiveCalls')}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700" aria-label={tr('pbxWallLiveCalls')}>
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2 text-start">{tr('direction')}</th>
            <th className="px-3 py-2 text-start">{tr('from')}</th>
            <th className="px-3 py-2 text-start">{tr('to')}</th>
            <th className="px-3 py-2 text-start">{tr('lead')}</th>
            <th className="px-3 py-2 text-start">{tr('pbxColExtension')}</th>
            <th className="px-3 py-2 text-start">{tr('pbxQueues')}</th>
            <th className="px-3 py-2 text-start">{tr('status')}</th>
            <th className="px-3 py-2 text-start">{tr('pbxWallDuration')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {calls.map((c) => {
            const state = callState(c);
            // Waiting callers show how long they have waited; others the time since answer (or start).
            const elapsed = c.waiting ? since(c.queued_at, now) : since(c.answered_at || c.started_at, now);
            return (
              <tr key={c.id} className="text-gray-800 dark:text-gray-100" data-call={c.id} data-state={state}>
                <td className="whitespace-nowrap px-3 py-2">{c.direction ? tr(`pbxDirection_${c.direction}`) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2"><Party value={c.from_party} /></td>
                <td className="whitespace-nowrap px-3 py-2"><Party value={c.to_party} /></td>
                <td className="whitespace-nowrap px-3 py-2">
                  {c.crm_contact ? (
                    <button type="button" className="font-medium text-primary hover:underline dark:text-primary-300"
                      onClick={() => openLeadDetails({ id: c.crm_contact as number }, { callsTab: 'pbx' })}>
                      {c.crm_contact_name || `#${c.crm_contact}`}
                    </button>
                  ) : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2"><PhoneText>{c.answered_by_number || c.extension_number || ''}</PhoneText></td>
                <td className="whitespace-nowrap px-3 py-2">{c.queue_name || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    state === 'waiting' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      : state === 'in_progress' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                    {tr(`pbxWallState_${state}`)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums" dir="ltr">{clock(elapsed)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

function agentState(a: AgentPresence): 'on_call' | 'paused' | 'available' | 'offline' {
  if (a.on_call) return 'on_call';
  if (a.agent_status === 'paused') return 'paused';
  return a.registered ? 'available' : 'offline';
}

const AGENT_TONE = {
  on_call: 'bg-sky-500',
  paused: 'bg-amber-500',
  available: 'bg-emerald-500',
  offline: 'bg-gray-300 dark:bg-gray-600',
};

const Agents = ({ agents }: { agents: AgentPresence[] }) => {
  const tr = useTr();
  if (!agents.length) return null;
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label={tr('pbxWallAgents')}>
      {agents.map((a) => {
        const state = agentState(a);
        return (
          <li key={a.extension_id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800" data-agent={a.number} data-state={state}>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${AGENT_TONE[state]}`} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm">
              <PhoneText className="font-semibold">{a.number}</PhoneText>
              {a.user_name || a.display_name ? ` · ${a.user_name || a.display_name}` : ''}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{tr(`pbxWallAgent_${state}`)}</span>
          </li>
        );
      })}
    </ul>
  );
};

export const PbxWallboard: React.FC = () => {
  const tr = useTr();
  const now = useNow();
  const query = useQuery({ queryKey: WALLBOARD_KEY, queryFn: getPbxWallboardAPI, refetchInterval: FLOOR_MS });
  useInvalidateOnSliceChange('telephony', [WALLBOARD_KEY]);

  if (query.isLoading) return <p className="py-8 text-center text-sm text-gray-500">{tr('loading')}</p>;
  if (query.isError || !query.data) {
    return <p role="alert" className="py-8 text-center text-sm text-rose-600 dark:text-rose-400">{tr('pbxWallUnavailable')}</p>;
  }
  const board = query.data;
  const waiting = board.queues.reduce((n, q) => n + q.waiting, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={tr('pbxWallLiveCalls')} value={board.live_calls.length} />
        <Tile label={tr('pbxWallWaiting')} value={waiting} tone={waiting ? 'amber' : 'gray'} />
        <Tile label={tr('pbxWallAnsweredToday')} value={board.today.answered} tone="emerald" />
        <Tile label={tr('pbxWallMissedToday')} value={board.today.missed} tone={board.today.missed ? 'rose' : 'gray'} />
      </div>
      {board.queues.length ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{tr('pbxQueues')}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {board.queues.map((q) => <QueueCard key={q.id} queue={q} serviceLevelS={board.service_level_s} />)}
          </div>
        </div>
      ) : null}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{tr('pbxWallLiveCalls')}</h3>
        <LiveCalls calls={board.live_calls} now={now} />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{tr('pbxWallAgents')}</h3>
        <Agents agents={board.agents} />
      </div>
    </div>
  );
};

const VIEWS = ['live', 'history'] as const;

/** Calls page "Phone system" tab: the live board, or the call history. */
export const PbxPhoneSystemTab: React.FC = () => {
  const tr = useTr();
  const [view, setView] = usePersistedTab<(typeof VIEWS)[number]>('callsPbxView', VIEWS, 'live');
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label={tr('callsTabPbx')} className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {VIEWS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${
              view === id
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            {tr(id === 'live' ? 'pbxWallLive' : 'pbxWallHistory')}
          </button>
        ))}
      </div>
      {view === 'live' ? <PbxWallboard /> : <PbxCallsPanel />}
    </div>
  );
};
