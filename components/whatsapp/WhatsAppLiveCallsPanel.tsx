import React, { useEffect, useMemo, useState } from 'react';
import { PhoneText } from '../PhoneText';
import { RefreshButton } from '../index';
import { PhoneIcon, WhatsappIcon } from '../icons';
import type { WhatsAppCallRecord } from '../../services/api';

/** Cap display so a zombie answered_at cannot show multi-day timers. */
const MAX_LIVE_ELAPSED_SEC = 3 * 60 * 60;

function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function formatElapsed(sec: number): string {
  const clamped = Math.min(Math.max(0, sec), MAX_LIVE_ELAPSED_SEC);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function elapsedFromAnswered(call: WhatsAppCallRecord, nowMs: number): number {
  if (!call.answered_at) return call.duration_sec || 0;
  const t = new Date(call.answered_at).getTime();
  if (Number.isNaN(t)) return call.duration_sec || 0;
  return Math.max(0, Math.floor((nowMs - t) / 1000));
}

/** Drop zombie rows the API may still return briefly. */
function isFreshLiveCall(call: WhatsAppCallRecord, nowMs: number): boolean {
  if (call.status === 'ringing') {
    const created = call.created_at ? new Date(call.created_at).getTime() : nowMs;
    if (Number.isNaN(created)) return true;
    return nowMs - created < 5 * 60 * 1000;
  }
  if (call.status === 'answered') {
    const answered = call.answered_at
      ? new Date(call.answered_at).getTime()
      : call.updated_at
        ? new Date(call.updated_at).getTime()
        : nowMs;
    if (Number.isNaN(answered)) return false;
    return nowMs - answered < MAX_LIVE_ELAPSED_SEC * 1000;
  }
  return false;
}

type LiveCardProps = {
  call: WhatsAppCallRecord;
  busy?: boolean;
  t: (key: any) => string;
  onAnswer: (call: WhatsAppCallRecord) => void;
  activeElapsedSec?: number | null;
  isLocalActive?: boolean;
  nowMs: number;
};

const LiveCallCard: React.FC<LiveCardProps> = ({
  call,
  busy,
  t,
  onAnswer,
  activeElapsedSec,
  isLocalActive,
  nowMs,
}) => {
  const title = call.client_name || call.peer_name || t('whatsappIncomingCall');
  const initials = useMemo(() => initialsFromTitle(title), [title]);
  const showAnswer = call.status === 'ringing' && call.direction === 'inbound' && !isLocalActive;
  const isAnswered = call.status === 'answered' || isLocalActive;

  return (
    <li className="rounded-xl border border-gray-200/90 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/80">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -end-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-white dark:bg-gray-900 dark:ring-gray-900">
            <WhatsappIcon className="h-3.5 w-3.5 text-[#25D366]" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</p>
              <PhoneText className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {call.peer_phone}
              </PhoneText>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {call.agent_username ? (
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/50">
                    {call.agent_username}
                  </span>
                ) : null}
              </div>
            </div>
            {isAnswered ? (
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatElapsed(
                  isLocalActive && activeElapsedSec != null
                    ? activeElapsedSec
                    : elapsedFromAnswered(call, nowMs)
                )}
              </span>
            ) : (
              <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/60">
                {t('whatsappCallRinging')}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {showAnswer ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAnswer(call)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe57] disabled:opacity-50"
              >
                <PhoneIcon className="h-4 w-4" />
                {t('whatsappAcceptCall')}
              </button>
            ) : null}
            {isLocalActive ? (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {t('whatsappCallInProgress')}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
};

type Props = {
  calls: WhatsAppCallRecord[];
  busy?: boolean;
  t: (key: any) => string;
  onAnswer: (call: WhatsAppCallRecord) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  localActiveCall?: WhatsAppCallRecord | null;
  localElapsedSec?: number;
  localPhase?: string;
};

export const WhatsAppLiveCallsPanel: React.FC<Props> = ({
  calls,
  busy,
  t,
  onAnswer,
  onRefresh,
  refreshing,
  localActiveCall,
  localElapsedSec = 0,
  localPhase,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const localId = localActiveCall?.id ?? null;
  const showLocal =
    Boolean(localActiveCall) &&
    (localPhase === 'active' ||
      localPhase === 'ringing' ||
      localPhase === 'connecting' ||
      localPhase === 'ending');

  const others = calls.filter(
    (c) => c.id !== localId && isFreshLiveCall(c, nowMs)
  );
  const count = others.length + (showLocal ? 1 : 0);

  return (
    <section
      className="rounded-xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/80 to-white p-4 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-gray-900/60"
      aria-label={t('liveCallsTitle')}
    >
      <div className="mb-3 flex items-center gap-2">
        <PhoneIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
          {t('liveCallsTitle')}
        </h2>
        {count > 0 ? (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#25D366] px-1.5 py-0.5 text-[11px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
        {onRefresh ? (
          <div className="ms-auto">
            <RefreshButton
              iconOnly
              loading={Boolean(refreshing)}
              onClick={onRefresh}
              className="text-gray-500 hover:bg-emerald-100/80 dark:text-gray-300 dark:hover:bg-emerald-950/40"
            />
          </div>
        ) : null}
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center sm:py-8">
          <PhoneIcon className="h-8 w-8 text-gray-300 dark:text-gray-600 sm:h-10 sm:w-10" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('waitingForIncomingCalls')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {showLocal && localActiveCall ? (
            <LiveCallCard
              key={`local-${localActiveCall.id}`}
              call={localActiveCall}
              busy={busy}
              t={t}
              onAnswer={onAnswer}
              isLocalActive
              activeElapsedSec={localElapsedSec}
              nowMs={nowMs}
            />
          ) : null}
          {others.map((call) => (
            <LiveCallCard
              key={call.id}
              call={call}
              busy={busy}
              t={t}
              onAnswer={onAnswer}
              nowMs={nowMs}
            />
          ))}
        </ul>
      )}
    </section>
  );
};
