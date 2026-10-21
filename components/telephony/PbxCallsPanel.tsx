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
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
        <thead className="bg-gray-50 text-start text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2 text-start">{tr('pbxColStarted')}</th>
            <th className="px-3 py-2 text-start">{tr('direction')}</th>
            <th className="px-3 py-2 text-start">{tr('from')}</th>
            <th className="px-3 py-2 text-start">{tr('to')}</th>
            <th className="px-3 py-2 text-start">{tr('lead')}</th>
            <th className="px-3 py-2 text-start">{tr('pbxColExtension')}</th>
            <th className="px-3 py-2 text-start">{tr('status')}</th>
            <th className="px-3 py-2 text-start">{tr('pbxColTalkTime')}</th>
            <th className="px-3 py-2 text-start">{tr('recording')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {rows.map((c) => {
            const remote = c.direction === 'inbound' ? c.from_party : c.to_party;
            return (
              <tr key={c.id} className="text-gray-800 dark:text-gray-100">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                  {c.started_at ? new Date(c.started_at).toLocaleString() : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{c.direction ? tr(`pbxDirection_${c.direction}`) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2"><Party value={c.from_party} /></td>
                <td className="whitespace-nowrap px-3 py-2"><Party value={c.to_party} /></td>
                <td className="whitespace-nowrap px-3 py-2">
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
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <PhoneText>{c.answered_by_number || c.extension_number || ''}</PhoneText>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[c.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                    {tr(`pbxStatus_${c.status}`)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{talkTime(c.billsec_s)}</td>
                <td className="px-3 py-2"><RecordingCell call={c} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
