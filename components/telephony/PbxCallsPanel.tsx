/**
 * Calls page "Phone system" tab: Loop Cloud PBX call history with recordings.
 *
 * GET /telephony/calls/ is already scoped server-side (admins see the company,
 * everyone else their own calls and their leads' calls). Recordings play through
 * POST /telephony/recordings/<id>/access/: a 5-minute, audit-logged URL fetched
 * when the user presses play, never embedded in the list.
 */
import React from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { useAppContext } from '../../context/AppContext';
import { deletePbxRecordingAPI, getPbxCallAPI, getPbxCallsAPI, type PbxCallRecord } from '../../services/api';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { TrashIcon } from '../icons';
import { PhoneText, isPhoneLike } from '../PhoneText';
import { DataTable, TableBody, TableHead, TableRow, Td, Th } from '../DataTable';
import { PbxRecordingPlayer } from './PbxRecordingPlayer';
import { useSoftphoneOptional } from './SoftphoneProvider';

function talkTime(seconds: number | null): string {
  if (!seconds) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
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

function RecordingCell({ call }: { call: PbxCallRecord }) {
  const { t, canAccessPage, setConfirmDeleteConfig, setIsConfirmDeleteModalOpen } = useAppContext();
  const tr = (key: string) => (t as (k: string) => string)(key);
  const queryClient = useQueryClient();
  if (!call.has_recording) {
    return call.recorded ? <span className="text-xs text-gray-500">{tr('pbxRecordingProcessing')}</span> : <span>—</span>;
  }
  // The list row has no recording id; the call detail does.
  const firstRecording = async () => {
    const rec = (await getPbxCallAPI(call.id)).recordings?.[0];
    if (!rec) throw new Error('no recording');
    return rec.id;
  };
  // Same people the API lets delete (company admins; supervisors who manage settings).
  const canDelete = canAccessPage('Settings');
  const askDelete = () => {
    setConfirmDeleteConfig({
      title: tr('pbxDeleteRecordingTitle'),
      message: tr('pbxDeleteRecordingMessage'),
      onConfirm: async () => {
        await deletePbxRecordingAPI(await firstRecording());
        await queryClient.invalidateQueries({ queryKey: ['telephony'] });
      },
    });
    setIsConfirmDeleteModalOpen(true);
  };
  return (
    <span className="inline-flex items-center gap-1">
      <PbxRecordingPlayer recordingId={firstRecording} />
      {canDelete ? (
        <IconButton
          icon={<TrashIcon className="h-4 w-4" />}
          label={tr('pbxDeleteRecording')}
          tone="danger"
          onClick={askDelete}
          data-testid={`pbx-delete-recording-${call.id}`}
        />
      ) : null}
    </span>
  );
}

export const PbxCallsPanel: React.FC = () => {
  const { t, openLeadDetails } = useAppContext();
  const tr = (key: string) => (t as (k: string) => string)(key);
  const softphone = useSoftphoneOptional();

  const query = useInfiniteQuery({
    queryKey: ['telephony', 'calls'],
    queryFn: ({ pageParam }) => getPbxCallsAPI({ cursor: pageParam, limit: 50 }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => cursorOf(last.next),
    // A live call's row changes; refresh while the tab is open and something is live.
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) => p.results.some((c) => ['queued', 'ringing', 'in_progress'].includes(c.status)))
        ? 5000
        : false,
  });
  const rows = query.data?.pages.flatMap((p) => p.results) ?? [];

  if (query.isLoading) {
    return <p className="py-8 text-center text-sm text-gray-500">{tr('loading')}</p>;
  }
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{tr('pbxCallsEmpty')}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <DataTable className="min-w-full">
        <TableHead>
          <Th>{tr('pbxColStarted')}</Th>
          <Th>{tr('direction')}</Th>
          <Th>{tr('from')}</Th>
          <Th>{tr('to')}</Th>
          <Th>{tr('lead')}</Th>
          <Th>{tr('pbxColExtension')}</Th>
          <Th>{tr('status')}</Th>
          <Th>{tr('pbxColTalkTime')}</Th>
          <Th>{tr('recording')}</Th>
        </TableHead>
        <TableBody>
          {rows.map((c) => {
            const remote = c.direction === 'inbound' ? c.from_party : c.to_party;
            return (
              <TableRow key={c.id}>
                <Td className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                  {c.started_at ? new Date(c.started_at).toLocaleString() : '—'}
                </Td>
                <Td className="whitespace-nowrap">{c.direction ? tr(`pbxDirection_${c.direction}`) : '—'}</Td>
                <Td className="whitespace-nowrap"><Party value={c.from_party} /></Td>
                <Td className="whitespace-nowrap"><Party value={c.to_party} /></Td>
                <Td className="whitespace-nowrap">
                  {c.crm_contact ? (
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline dark:text-primary-300"
                      onClick={() => openLeadDetails({ id: c.crm_contact as number }, { callsTab: 'pbx' })}
                    >
                      {c.crm_contact_name || `#${c.crm_contact}`}
                    </button>
                  ) : softphone?.canClickToCall && remote && isPhoneLike(remote) ? (
                    <button
                      type="button"
                      disabled={softphone.busy}
                      className="text-xs font-medium text-primary hover:underline disabled:opacity-40 dark:text-primary-300"
                      onClick={() => void softphone.placeCall(remote, null)}
                    >
                      {tr('call')}
                    </button>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  <PhoneText>{c.answered_by_number || c.extension_number || ''}</PhoneText>
                </Td>
                <Td className="whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[c.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                    {tr(`pbxStatus_${c.status}`)}
                  </span>
                </Td>
                <Td className="whitespace-nowrap tabular-nums">{talkTime(c.billsec_s)}</Td>
                <Td><RecordingCell call={c} /></Td>
              </TableRow>
            );
          })}
        </TableBody>
      </DataTable>
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
