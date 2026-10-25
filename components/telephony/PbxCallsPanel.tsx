/**
 * Calls page "Phone system" tab: Loop Cloud PBX call history with recordings.
 *
 * GET /telephony/calls/ is already scoped server-side (admins see the company,
 * everyone else their own calls and their leads' calls). Recordings play through
 * POST /telephony/recordings/<id>/access/: a 5-minute, audit-logged URL fetched
 * when the user presses play, never embedded in the list.
 */
import React, { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { useAppContext } from '../../context/AppContext';
import {
  deletePbxRecordingAPI,
  getPbxCallAPI,
  getPbxCallsAPI,
  type PbxCallRecord,
  type PbxCallStatus,
} from '../../services/api';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { ClockIcon, MicrophoneIcon, PhoneIcon, TrashIcon } from '../icons';
import { PhoneText, isPhoneLike } from '../PhoneText';
import { Select } from '../Select';
import { DataTable, TableActions, TableBody, TableHead, TableRow, Td, Th } from '../DataTable';
import { PbxRecordingPlayer } from './PbxRecordingPlayer';
import { useSoftphoneOptional } from './SoftphoneProvider';

function talkTime(seconds: number | null): string {
  if (seconds == null) return '—';
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function callStartedAt(value: string | null, language: string): { compact: string; full: string } | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const locale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US';
  const compact = date.toLocaleString(
    locale,
    withLatinDigits({ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  );
  const full = date.toLocaleString(
    locale,
    withLatinDigits({ year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  );
  return { compact, full };
}

function cursorOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url, window.location.origin).searchParams.get('cursor');
  } catch {
    return null;
  }
}

const STATUS_TONE: Record<string, string> = {
  answered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  missed: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  busy: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  no_answer: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function Party({ value }: { value: string }) {
  if (!value) return <span>—</span>;
  return isPhoneLike(value) || /^\d{2,6}$/.test(value) ? <PhoneText>{value}</PhoneText> : <span>{value}</span>;
}

const FILTER_STATUSES: PbxCallStatus[] = [
  'queued',
  'ringing',
  'in_progress',
  'answered',
  'busy',
  'no_answer',
  'failed',
  'abandoned',
  'missed',
  'cancelled',
];

async function firstRecordingId(callId: string): Promise<string> {
  const recording = (await getPbxCallAPI(callId)).recordings?.[0];
  if (!recording) throw new Error('no recording');
  return recording.id;
}

function RecordingCell({ call }: { call: PbxCallRecord }) {
  const { t } = useAppContext();
  const tr = (key: string) => (t as (k: string) => string)(key);
  if (!call.has_recording) {
    return call.recorded ? (
      <span className="inline-flex h-8 items-center justify-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        <ClockIcon className="h-3.5 w-3.5" aria-hidden />
        {tr('pbxRecordingProcessing')}
      </span>
    ) : (
      <span className="inline-flex h-8 items-center justify-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
        <MicrophoneIcon className="h-3.5 w-3.5 opacity-70" aria-hidden />
        {tr('pbxRecordingNotRecorded')}
      </span>
    );
  }
  return <PbxRecordingPlayer recordingId={() => firstRecordingId(call.id)} compact />;
}

function CallActions({
  call,
  canCall,
  callDisabled,
  onCall,
}: {
  call: PbxCallRecord;
  canCall: boolean;
  callDisabled: boolean;
  onCall: () => void;
}) {
  const { t, canAccessPage, setConfirmDeleteConfig, setIsConfirmDeleteModalOpen } = useAppContext();
  const tr = (key: string) => (t as (k: string) => string)(key);
  const queryClient = useQueryClient();
  const canDelete = canAccessPage('Settings') && call.has_recording;
  const askDelete = () => {
    setConfirmDeleteConfig({
      title: tr('pbxDeleteRecordingTitle'),
      message: tr('pbxDeleteRecordingMessage'),
      onConfirm: async () => {
        await deletePbxRecordingAPI(await firstRecordingId(call.id));
        await queryClient.invalidateQueries({ queryKey: ['telephony'] });
      },
    });
    setIsConfirmDeleteModalOpen(true);
  };
  if (!canCall && !canDelete) return <span className="text-gray-400 dark:text-gray-500">—</span>;
  return (
    <TableActions>
      {canCall ? (
        <IconButton
          icon={<PhoneIcon className="h-4 w-4" />}
          label={tr('call')}
          tone="primary"
          disabled={callDisabled}
          onClick={onCall}
        />
      ) : null}
      {canDelete ? (
        <IconButton
          icon={<TrashIcon className="h-4 w-4" />}
          label={tr('pbxDeleteRecording')}
          tone="danger"
          onClick={askDelete}
          data-testid={`pbx-delete-recording-${call.id}`}
        />
      ) : null}
    </TableActions>
  );
}

export const PbxCallsPanel: React.FC = () => {
  const { t, language, openLeadDetails } = useAppContext();
  const tr = (key: string) => (t as (k: string) => string)(key);
  const softphone = useSoftphoneOptional();
  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['telephony', 'calls', { direction, status }],
    queryFn: ({ pageParam }) => getPbxCallsAPI({ direction, status, cursor: pageParam, limit: 50 }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => cursorOf(last.next),
    // A live call's row changes; refresh while the tab is open and something is live.
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) => p.results.some((c) => ['queued', 'ringing', 'in_progress'].includes(c.status)))
        ? 5000
        : false,
  });
  const rows = query.data?.pages.flatMap((p) => p.results) ?? [];
  const hasFilters = Boolean(direction || status);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-end gap-3 border-b border-gray-200 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-800">
        <label className="min-w-40 flex-1 sm:w-48 sm:flex-none">
          <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{tr('direction')}</span>
          <Select value={direction} onChange={(event) => setDirection(event.target.value)}>
            <option value="">{tr('all')}</option>
            {['inbound', 'outbound', 'internal'].map((value) => <option key={value} value={value}>{tr(`pbxDirection_${value}`)}</option>)}
          </Select>
        </label>
        <label className="min-w-40 flex-1 sm:w-48 sm:flex-none">
          <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{tr('status')}</span>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{tr('all')}</option>
            {FILTER_STATUSES.map((value) => <option key={value} value={value}>{tr(`pbxStatus_${value}`)}</option>)}
          </Select>
        </label>
        {hasFilters ? (
          <Button size="sm" variant="ghost" onClick={() => { setDirection(''); setStatus(''); }}>
            {tr('clearFilters')}
          </Button>
        ) : null}
      </div>
      {query.isLoading ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{tr('loading')}</p>
      ) : query.isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">{tr('somethingWentWrong')}</p>
          <Button size="sm" variant="secondary" onClick={() => void query.refetch()}>{tr('tryAgain')}</Button>
        </div>
      ) : !rows.length ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{tr(hasFilters ? 'pbxCallsNoResults' : 'pbxCallsEmpty')}</p>
          {hasFilters ? <Button size="sm" variant="ghost" onClick={() => { setDirection(''); setStatus(''); }}>{tr('clearFilters')}</Button> : null}
        </div>
      ) : (
      // Fits a laptop screen beside the sidebar (about 66rem); narrower screens scroll. Not
      // TableHorizontalScroll: its w-max wrapper collapses a table-fixed table's flexible column.
      <div className="overflow-x-auto">
      <DataTable className="min-w-[62rem] table-fixed">
        <TableHead>
          <Th className="w-36">{tr('pbxColStarted')}</Th>
          <Th>{tr('call')}</Th>
          <Th className="w-36">{tr('lead')}</Th>
          <Th className="w-40">{tr('status')}</Th>
          <Th className="w-60">{tr('recording')}</Th>
          <Th className="w-28">{tr('actions')}</Th>
        </TableHead>
        <TableBody>
          {rows.map((c) => {
            const remote = c.direction === 'inbound' ? c.from_party : c.to_party;
            const started = callStartedAt(c.started_at, language);
            const extension = c.answered_by_number || c.extension_number || '';
            return (
              <TableRow key={c.id}>
                <Td className="text-xs text-gray-600 dark:text-gray-300">
                  {started ? <time dateTime={c.started_at ?? undefined} title={started.full} className="whitespace-nowrap tabular-nums">{started.compact}</time> : '—'}
                </Td>
                <Td>
                  <div className="mx-auto w-fit max-w-full min-w-0">
                    <div className="flex min-w-0 items-center justify-center gap-2">
                      <span className="inline-flex shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {c.direction ? tr(`pbxDirection_${c.direction}`) : '—'}
                      </span>
                      <div className="min-w-0 truncate font-semibold text-gray-900 dark:text-gray-100" title={remote}>
                        <Party value={remote} />
                      </div>
                    </div>
                    <div className="mt-1 grid min-w-0 grid-cols-[auto,minmax(0,1fr)] gap-x-1 text-xs leading-4 text-gray-500 dark:text-gray-400">
                      <span>{tr('from')}</span>
                      <span className="truncate" title={c.from_party}><Party value={c.from_party} /></span>
                      <span>{tr('to')}</span>
                      <span className="truncate" title={c.to_party}><Party value={c.to_party} /></span>
                      {extension ? (
                        <>
                          <span>{tr('pbxColExtension')}</span>
                          <span className="truncate"><PhoneText>{extension}</PhoneText></span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </Td>
                <Td>
                  {c.crm_contact ? (
                    <button
                      type="button"
                      className="mx-auto block max-w-full truncate rounded-sm font-semibold text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-primary-300 dark:focus-visible:ring-offset-gray-900"
                      title={c.crm_contact_name || `#${c.crm_contact}`}
                      onClick={() => openLeadDetails({ id: c.crm_contact as number }, { callsTab: 'pbx' })}
                    >
                      {c.crm_contact_name || `#${c.crm_contact}`}
                    </button>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[c.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                    {tr(`pbxStatus_${c.status}`)}
                  </span>
                  {c.billsec_s != null ? (
                    <span
                      // relative: keeps the sr-only label inside the scroll container (else it widens the page in RTL)
                      className="relative mt-1 flex items-center justify-center gap-1 text-xs tabular-nums text-gray-500 dark:text-gray-400"
                      title={tr('pbxColTalkTime')}
                    >
                      <ClockIcon className="h-3 w-3" aria-hidden />
                      <span className="sr-only">{tr('pbxColTalkTime')}</span>
                      {talkTime(c.billsec_s)}
                    </span>
                  ) : null}
                </Td>
                <Td><RecordingCell call={c} /></Td>
                <Td>
                  <CallActions
                    call={c}
                    canCall={Boolean(softphone?.canClickToCall && remote && isPhoneLike(remote))}
                    callDisabled={Boolean(softphone?.busy)}
                    onCall={() => void softphone?.placeCall(remote, null)}
                  />
                </Td>
              </TableRow>
            );
          })}
        </TableBody>
      </DataTable>
      </div>
      )}
      {query.hasNextPage ? (
        <div className="border-t border-gray-100 p-3 text-center dark:border-gray-700">
          <Button size="sm" variant="ghost" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            {tr('pbxLoadMore')}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
