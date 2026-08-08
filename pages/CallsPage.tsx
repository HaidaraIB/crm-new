import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import {
  Button,
  Card,
  FilterButton,
  Loader,
  PageWrapper,
  PhoneText,
  PhoneIcon,
  RefreshButton,
  hasActiveFilters,
} from '../components/index';
import {
  ClockIcon,
  MicrophoneIcon,
  PbxDialIcon,
  SearchIcon,
  XIcon,
} from '../components/icons';
import { getWhatsAppCallsAPI, type WhatsAppCallRecord } from '../services/api';
import { ChatVoicePlayer } from '../components/chat/ChatVoicePlayer';
import { useAuthBlobUrl } from '../hooks/useAuthBlobUrl';
import { useLead, useWhatsAppLiveCalls } from '../hooks/useQueries';
import { useWhatsAppCallingOptional } from '../components/whatsapp/WhatsAppCallListener';
import { WhatsAppLiveCallsPanel } from '../components/whatsapp/WhatsAppLiveCallsPanel';
import { WhatsAppAgentStatusControl } from '../components/whatsapp/WhatsAppAgentStatusControl';
import { WhatsAppCallHoursPanel } from '../components/whatsapp/WhatsAppCallHoursPanel';
import { WhatsAppTeamCallStatusPanel } from '../components/whatsapp/WhatsAppTeamCallStatusPanel';
import { normalizeRole } from '../utils/roles';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../utils/dateUtils';
import { getCompanyViewLeadRoute } from '../utils/routing';
import { PAGE_TAB_ACTIVE, PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';
import {
  DEFAULT_CALL_FILTERS,
  callFiltersFromSearchParams,
  callFiltersToApiParams,
  callFiltersToCountParams,
  replaceCallsUrlQuery,
} from '../utils/callFilters';

type CallsPageTab = 'history' | 'live' | 'team' | 'hours';

const STATUS_FILTERS = [
  { key: 'all' },
  { key: 'ringing' },
  { key: 'answered' },
  { key: 'missed' },
  { key: 'no_answer' },
  { key: 'rejected' },
] as const;

function formatDuration(sec?: number): string {
  if (sec == null || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'answered' || s === 'ended') {
    return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-800/60';
  }
  if (s === 'ringing') {
    return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/60';
  }
  if (s === 'missed') {
    return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200/80 dark:bg-rose-950/45 dark:text-rose-200 dark:ring-rose-800/60';
  }
  if (s === 'no_answer') {
    return 'bg-orange-100 text-orange-900 ring-1 ring-orange-200/80 dark:bg-orange-950/45 dark:text-orange-200 dark:ring-orange-800/60';
  }
  if (s === 'rejected') {
    return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/90 dark:bg-slate-800/80 dark:text-slate-200 dark:ring-slate-600/70';
  }
  if (s === 'failed') {
    return 'bg-red-100 text-red-800 ring-1 ring-red-200/80 dark:bg-red-950/45 dark:text-red-200 dark:ring-red-800/60';
  }
  return 'bg-gray-100 text-gray-700 ring-1 ring-gray-200/90 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600/70';
}

function directionIconWrapClass(direction: string): string {
  return direction === 'inbound'
    ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-800/50'
    : 'bg-violet-100 text-violet-800 ring-1 ring-violet-200/80 dark:bg-violet-950/45 dark:text-violet-200 dark:ring-violet-800/50';
}

function statusLabel(status: string, t: (k: any) => string): string {
  const key = `whatsappCallStatus_${status.toLowerCase()}`;
  const translated = t(key);
  return translated === key ? status.replace(/_/g, ' ') : translated;
}

function callTimestamp(call: WhatsAppCallRecord): string | null {
  return call.started_at || call.created_at || call.ended_at || null;
}

function formatCallWhen(
  iso: string | null | undefined,
  language: string,
  t: (k: any) => string
): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('justNow');
  if (diffMin < 60) return `${diffMin} ${t('minutesAgo')}`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ${t('hoursAgo')}`;

  const locale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  if (day.getTime() === today.getTime()) {
    return d.toLocaleTimeString(
      locale,
      withLatinDigits({ hour: '2-digit', minute: '2-digit' })
    );
  }
  return d.toLocaleString(
    locale,
    withLatinDigits({
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

function formatFullWhen(iso: string | null | undefined, language: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const locale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US';
  return d.toLocaleString(
    locale,
    withLatinDigits({
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

const CallRecordingPlayer: React.FC<{ url: string; t: (k: any) => string }> = ({
  url,
  t,
}) => {
  const blobUrl = useAuthBlobUrl(url);
  if (!blobUrl) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('loading')}…</p>
    );
  }
  return <ChatVoicePlayer blobUrl={blobUrl} mine={false} t={t} />;
};

const filterBtnBase =
  'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors';

function statusNavClass(active: boolean): string {
  return active
    ? `${filterBtnBase} bg-primary/10 font-semibold text-primary-800 ring-1 ring-primary/25 dark:bg-primary/20 dark:text-primary-100 dark:ring-primary/35`
    : `${filterBtnBase} text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/80`;
}

export const CallsPage: React.FC = () => {
  const {
    t,
    language,
    setCurrentPage,
    setSelectedLead,
    currentUser,
    callFilters,
    setCallFilters,
    setIsCallFilterDrawerOpen,
  } = useAppContext();
  const whatsappCalling = useWhatsAppCallingOptional();
  const [selected, setSelected] = useState<WhatsAppCallRecord | null>(null);
  const [searchDraft, setSearchDraft] = useState(callFilters.search);
  const [activeTab, setActiveTab] = useState<CallsPageTab>('history');

  const role = normalizeRole(currentUser?.role);
  const canSeeTeam = role === 'Owner' || role === 'Supervisor';
  const canManageHours = canSeeTeam;

  const { data: liveCalls = [], refetch: refetchLiveCalls, isFetching: isLiveFetching } =
    useWhatsAppLiveCalls({
      enabled: Boolean(currentUser),
      refetchInterval: 2_000,
      includeAnswered: true,
    });

  const liveCount = useMemo(() => {
    const now = Date.now();
    const localId = whatsappCalling?.activeCall?.id ?? null;
    const showLocal =
      Boolean(whatsappCalling?.activeCall) &&
      ['active', 'ringing', 'connecting', 'ending'].includes(
        whatsappCalling?.phase || ''
      );
    const others = liveCalls.filter((c) => {
      if (c.id === localId) return false;
      if (c.status === 'ringing') {
        const created = c.created_at ? new Date(c.created_at).getTime() : now;
        return !Number.isNaN(created) && now - created < 5 * 60 * 1000;
      }
      if (c.status === 'answered') {
        const answered = c.answered_at
          ? new Date(c.answered_at).getTime()
          : c.updated_at
            ? new Date(c.updated_at).getTime()
            : now;
        return !Number.isNaN(answered) && now - answered < 3 * 60 * 60 * 1000;
      }
      return false;
    });
    return others.length + (showLocal ? 1 : 0);
  }, [liveCalls, whatsappCalling?.activeCall, whatsappCalling?.phase]);

  useEffect(() => {
    if (activeTab === 'team' && !canSeeTeam) setActiveTab('history');
  }, [activeTab, canSeeTeam]);

  // Deep-link: /calls?client=123&status=missed&…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if ([...params.keys()].length === 0) return;
    setCallFilters((prev) => callFiltersFromSearchParams(params, prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once on mount
  }, []);

  useEffect(() => {
    setSearchDraft(callFilters.search);
  }, [callFilters.search]);

  useEffect(() => {
    replaceCallsUrlQuery(callFilters);
  }, [callFilters]);

  const apiParams = useMemo(() => callFiltersToApiParams(callFilters), [callFilters]);
  const countParams = useMemo(
    () => callFiltersToCountParams(callFilters),
    [callFilters]
  );

  const filteredClientId = callFilters.clientId ? Number(callFilters.clientId) : null;
  const { data: filteredLead } = useLead(filteredClientId, {
    enabled: Boolean(filteredClientId && filteredClientId > 0),
  });

  // List depends on status tab; counters do not — avoids flashing stale counts on tab switch.
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['whatsappCalls', 'list', apiParams],
    queryFn: () =>
      getWhatsAppCallsAPI({
        ...apiParams,
        limit: 100,
      }),
    refetchInterval: 8000,
  });

  const {
    data: countsData,
    isFetching: isCountsFetching,
    isPending: isCountsPending,
    refetch: refetchCounts,
  } = useQuery({
    queryKey: ['whatsappCalls', 'counts', countParams],
    queryFn: () =>
      getWhatsAppCallsAPI({
        ...countParams,
        limit: 1,
      }),
    refetchInterval: 8000,
  });

  const results = data?.results || [];
  const counts = countsData?.status_counts || {};
  const countsBusy = isCountsPending || (isCountsFetching && !countsData);

  const allCount = useMemo(
    () => Object.values(counts).reduce((a, b) => a + (b || 0), 0),
    [counts]
  );

  const drawerActive = hasActiveFilters(
    {
      direction: callFilters.direction,
      agent: callFilters.agent,
      clientId: callFilters.clientId,
      hasRecording: callFilters.hasRecording,
    },
    {
      direction: DEFAULT_CALL_FILTERS.direction,
      agent: DEFAULT_CALL_FILTERS.agent,
      clientId: DEFAULT_CALL_FILTERS.clientId,
      hasRecording: DEFAULT_CALL_FILTERS.hasRecording,
    }
  );

  const openLead = (call: WhatsAppCallRecord) => {
    if (!call.client) return;
    setSelectedLead({
      id: call.client,
      name: call.client_name || call.peer_name || '',
      phone: call.peer_phone,
    } as any);
    const route = getCompanyViewLeadRoute(
      currentUser?.company?.name,
      currentUser?.company?.domain,
      call.client
    );
    window.history.pushState({}, '', route);
    setCurrentPage('ViewLead');
  };

  const displayName = (call: WhatsAppCallRecord) =>
    call.client_name || call.peer_name || t('unknown');

  const commitSearch = () => {
    setCallFilters((prev) => ({ ...prev, search: searchDraft.trim() }));
  };

  const clearClientFilter = () => {
    setCallFilters((prev) => ({ ...prev, clientId: '' }));
  };

  return (
    <PageWrapper title={t('callsPageTitle')}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('callsPageDescription')}</p>
        <WhatsAppAgentStatusControl t={t} />
      </div>

      <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
        <nav
          className="-mb-px flex gap-4 overflow-x-auto rtl:space-x-reverse"
          aria-label="Tabs"
        >
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap py-3 px-1 text-sm transition-colors ${
              activeTab === 'history' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE
            }`}
          >
            {t('callsTabHistory')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`inline-flex items-center gap-2 whitespace-nowrap py-3 px-1 text-sm transition-colors ${
              activeTab === 'live' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE
            }`}
          >
            {t('callsTabLive')}
            {liveCount > 0 ? (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#25D366] px-1.5 py-0.5 text-[11px] font-bold text-white">
                {liveCount > 99 ? '99+' : liveCount}
              </span>
            ) : null}
          </button>
          {canSeeTeam ? (
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`whitespace-nowrap py-3 px-1 text-sm transition-colors ${
                activeTab === 'team' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE
              }`}
            >
              {t('callsTabTeam')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setActiveTab('hours')}
            className={`whitespace-nowrap py-3 px-1 text-sm transition-colors ${
              activeTab === 'hours' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE
            }`}
          >
            {t('callsTabHours')}
          </button>
        </nav>
      </div>

      {activeTab === 'live' ? (
        <WhatsAppLiveCallsPanel
          calls={liveCalls}
          busy={Boolean(whatsappCalling?.answeringBusy || whatsappCalling?.isStartingOutbound)}
          t={t}
          onAnswer={(call) => {
            void whatsappCalling?.acceptIncoming(call);
          }}
          onRefresh={() => {
            void refetchLiveCalls();
          }}
          refreshing={isLiveFetching}
          localActiveCall={whatsappCalling?.activeCall}
          localElapsedSec={whatsappCalling?.elapsedSec}
          localPhase={whatsappCalling?.phase}
        />
      ) : null}

      {activeTab === 'team' && canSeeTeam ? <WhatsAppTeamCallStatusPanel t={t} /> : null}

      {activeTab === 'hours' ? (
        <WhatsAppCallHoursPanel t={t} canManage={canManageHours} />
      ) : null}

      {activeTab === 'history' ? (
        <>
          {liveCount > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-2.5 text-start transition hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/45"
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-900 dark:text-emerald-100">
                <PhoneIcon className="h-4 w-4 shrink-0" />
                {t('callsLiveBanner').replace('{n}', String(liveCount))}
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {t('callsViewLive')}
              </span>
            </button>
          ) : null}

          <div className="flex min-h-[70vh] flex-col gap-4 lg:flex-row">
        <aside className="w-full shrink-0 rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/80 dark:shadow-none lg:w-56">
          <FilterSection label={t('status')}>
            {STATUS_FILTERS.map((f) => {
              const count =
                f.key === 'all'
                  ? allCount
                  : f.key === 'answered'
                    ? (counts.answered || 0) + (counts.ended || 0)
                    : counts[f.key] || 0;
              const active = callFilters.status === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() =>
                    setCallFilters((prev) => ({ ...prev, status: f.key }))
                  }
                  className={statusNavClass(active)}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="truncate">{t(`whatsappCallStatus_${f.key}`)}</span>
                  <span
                    className={`tabular-nums text-xs transition-opacity ${
                      countsBusy ? 'opacity-40' : ''
                    } ${
                      active
                        ? 'text-primary-700 dark:text-primary-200'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </FilterSection>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[200px] flex-1">
              <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitSearch();
                }}
                onBlur={commitSearch}
                placeholder={t('searchNumber')}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pe-3 ps-9 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary/50"
              />
            </label>
            <FilterButton
              onClick={() => setIsCallFilterDrawerOpen(true)}
              hasActiveFilters={drawerActive}
            />
            <RefreshButton
              onClick={() => {
                void refetch();
                void refetchCounts();
              }}
              loading={(isFetching || isCountsFetching) && !isLoading}
              className="h-10 rounded-xl"
            />
          </div>

          {(callFilters.clientId ||
            callFilters.direction !== 'All' ||
            callFilters.agent !== 'All' ||
            callFilters.hasRecording) && (
            <div className="flex flex-wrap items-center gap-2">
              {callFilters.clientId ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-800 dark:bg-primary/20 dark:text-primary-100">
                  <span className="truncate">
                    {t('lead')}:{' '}
                    {filteredLead?.name ||
                      filteredLead?.phone ||
                      `#${callFilters.clientId}`}
                  </span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-primary/20"
                    onClick={clearClientFilter}
                    aria-label={t('callsClearRefine')}
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ) : null}
              {callFilters.direction !== 'All' ? (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {callFilters.direction === 'inbound' ? t('incoming') : t('outgoing')}
                </span>
              ) : null}
              {callFilters.agent === 'me' ? (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {t('whatsappMyCalls')}
                </span>
              ) : callFilters.agent !== 'All' ? (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {t('agent')}: #{callFilters.agent}
                </span>
              ) : null}
              {callFilters.hasRecording ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <MicrophoneIcon className="size-3" />
                  {t('recording')}
                </span>
              ) : null}
            </div>
          )}

          <Card className="flex-1 overflow-hidden !p-0 shadow-sm dark:shadow-none">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader />
              </div>
            ) : results.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 px-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                  <PhoneIcon className="size-7" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('whatsappNoCalls')}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700/80">
                {results.map((call) => {
                  const active = selected?.id === call.id;
                  const when = callTimestamp(call);
                  const hasRec = call.recording_status === 'ready' && Boolean(call.recording_url);
                  return (
                    <li key={call.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelected(call)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelected(call);
                          }
                        }}
                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-start transition-colors ${
                          active
                            ? 'bg-primary/[0.07] dark:bg-primary/15'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/70'
                        }`}
                      >
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${directionIconWrapClass(call.direction)}`}
                          aria-hidden
                        >
                          {call.direction === 'outbound' ? (
                            <PbxDialIcon className="size-[18px]" />
                          ) : (
                            <PhoneIcon className="size-[18px]" />
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
                              {displayName(call)}
                            </p>
                            <span
                              className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(call.status)}`}
                            >
                              {statusLabel(call.status, t)}
                            </span>
                            {hasRec ? (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                title={t('recording')}
                              >
                                <MicrophoneIcon className="size-3" />
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                            <PhoneText className="text-xs text-gray-500 dark:text-gray-400">
                              {call.peer_phone}
                            </PhoneText>
                            <span className="text-gray-300 dark:text-gray-600" aria-hidden>
                              ·
                            </span>
                            <span>
                              {call.direction === 'inbound' ? t('incoming') : t('outgoing')}
                            </span>
                            {call.agent_username ? (
                              <>
                                <span className="text-gray-300 dark:text-gray-600" aria-hidden>
                                  ·
                                </span>
                                <span className="truncate">{call.agent_username}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                          <span className="font-mono text-sm tabular-nums text-gray-800 dark:text-gray-100">
                            {formatDuration(call.duration_sec)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                            <ClockIcon className="size-3 opacity-70" />
                            {formatCallWhen(when, language, t)}
                          </span>
                        </div>

                        {call.client ? (
                          <button
                            type="button"
                            className="shrink-0 text-xs font-semibold text-primary-700 hover:underline dark:text-primary-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLead(call);
                            }}
                          >
                            {t('viewLead')}
                          </button>
                        ) : (
                          <span className="w-16 shrink-0 sm:w-20" aria-hidden />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {selected ? (
            <Card className="border border-gray-200/80 shadow-sm dark:border-gray-700 dark:shadow-none">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl ${directionIconWrapClass(selected.direction)}`}
                  >
                    {selected.direction === 'outbound' ? (
                      <PbxDialIcon className="size-5" />
                    ) : (
                      <PhoneIcon className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-gray-900 dark:text-gray-50">
                      {displayName(selected)}
                    </p>
                    <PhoneText className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                      {selected.peer_phone}
                    </PhoneText>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(selected.status)}`}
                      >
                        {statusLabel(selected.status, t)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selected.direction === 'inbound' ? t('incoming') : t('outgoing')}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-gray-700 dark:text-gray-200">
                        {formatDuration(selected.duration_sec)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFullWhen(callTimestamp(selected), language)}
                      </span>
                      {selected.agent_username ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          · {selected.agent_username}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {selected.client ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 rounded-lg"
                      onClick={() => openLead(selected)}
                    >
                      {t('viewLead')}
                    </Button>
                  ) : null}
                  <button
                    type="button"
                    className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                    onClick={() => setSelected(null)}
                    title={t('close')}
                    aria-label={t('close')}
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
              </div>

              {selected.notes ? (
                <p className="mb-4 whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200">
                  {selected.notes}
                </p>
              ) : null}

              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('recording')}
                </p>
                {selected.recording_status === 'ready' && selected.recording_url ? (
                  <CallRecordingPlayer url={selected.recording_url} t={t} />
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('noRecording')}
                  </p>
                )}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
        </>
      ) : null}
    </PageWrapper>
  );
};

const FilterSection: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <div className="space-y-1">{children}</div>
  </div>
);
