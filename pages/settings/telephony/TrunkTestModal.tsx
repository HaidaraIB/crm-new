/**
 * Trunk test (POST /telephony/trunks/{id}/test/): the home node sends one SIP
 * OPTIONS to the trunk, and the CRM checks the trunk's numbers and routes. Each
 * check comes back as ok / warning / failed / skipped with data; the wording is here.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';
import { PhoneText } from '../../../components/PhoneText';
import { CheckIcon, XIcon } from '../../../components/icons';
import { testPbxTrunkAPI, type PbxTrunkCheck, type PbxTrunkRow } from '../../../services/api';
import { useTr } from './shared';

const TONE: Record<PbxTrunkCheck['status'], string> = {
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  failed: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  skipped: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const StatusIcon = ({ status }: { status: PbxTrunkCheck['status'] }) => (
  <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${TONE[status]}`} aria-hidden>
    {status === 'ok' ? <CheckIcon className="h-3.5 w-3.5" /> : status === 'failed' ? <XIcon className="h-3.5 w-3.5" /> : <span className="text-xs font-bold">{status === 'warning' ? '!' : '–'}</span>}
  </span>
);

/** A list of phone numbers inside a sentence, each LTR-safe. */
const Numbers = ({ items }: { items: string[] }) => (
  <>
    {items.map((n, i) => (
      <React.Fragment key={n}>
        {i ? ', ' : ''}
        <PhoneText>{n}</PhoneText>
      </React.Fragment>
    ))}
  </>
);

function CheckDetail({ check }: { check: PbxTrunkCheck }) {
  const tr = useTr();
  const d = check.data || {};
  const reason = typeof d.reason === 'string' ? d.reason : '';
  if (reason) {
    const key = `pbxTrunkTest_${check.id}_${reason}`;
    if (check.id === 'options' && reason === 'no_answer') {
      return <>{tr(key)} <span dir="ltr" className="font-mono text-xs">{String(d.contact ?? '')}</span></>;
    }
    if (check.id === 'outbound' && Array.isArray(d.unverified_caller_id) && d.unverified_caller_id.length) {
      return <>{tr(key)} {(d.unverified_caller_id as string[]).join(', ')}</>;
    }
    return <>{tr(key)}</>;
  }
  switch (check.id) {
    case 'config':
      return <>{tr('pbxTrunkTest_config_ok').replace('{version}', String(d.version ?? ''))}</>;
    case 'options':
      return (
        <>
          {tr('pbxTrunkTest_options_ok').replace('{ms}', String(d.rtt_ms ?? 0)).replace('{code}', String(d.status_code ?? ''))}{' '}
          <span dir="ltr" className="font-mono text-xs">{String(d.contact ?? '')} ({String(d.transport ?? '').toUpperCase()})</span>
        </>
      );
    case 'identify':
      return <>{tr('pbxTrunkTest_identify_ok').replace('{n}', String(d.sources ?? 0))}</>;
    case 'numbers': {
      const unverified = (d.unverified as string[]) || [];
      return (
        <>
          {tr('pbxTrunkTest_numbers_ok').replace('{n}', String(d.verified ?? 0))}
          {unverified.length ? <> {tr('pbxTrunkTest_numbers_unverified')} <Numbers items={unverified} /></> : null}
        </>
      );
    }
    case 'inbound': {
      const unrouted = (d.unrouted as string[]) || [];
      return unrouted.length ? <>{tr('pbxTrunkTest_inbound_unrouted')} <Numbers items={unrouted} /></> : <>{tr('pbxTrunkTest_inbound_ok')}</>;
    }
    case 'outbound': {
      const blocked = (d.unverified_caller_id as string[]) || [];
      return (
        <>
          {tr('pbxTrunkTest_outbound_ok')} {((d.routes as string[]) || []).join(', ')}
          {blocked.length ? <> · {tr('pbxTrunkTest_outbound_unverified_caller_id')} {blocked.join(', ')}</> : null}
        </>
      );
    }
    default:
      return null;
  }
}

export const TrunkTestModal = ({ trunk, onClose }: { trunk: PbxTrunkRow; onClose: () => void }) => {
  const tr = useTr();
  // A query, not a mutation started from an effect: StrictMode's mount/unmount/
  // remount detaches a useMutation observer from the request in flight, and the
  // result never arrives (seen in the real UI). One run per open (gcTime 0),
  // deduplicated, never retried (each run sends SIP from the node; throttled).
  const run = useQuery({
    queryKey: ['telephony', 'trunk-test', trunk.id],
    queryFn: () => testPbxTrunkAPI(trunk.id),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const report = run.isFetching ? undefined : run.data;
  const errorCode = (run.error as { code?: string } | null)?.code;

  return (
    <Modal isOpen onClose={onClose} title={`${tr('pbxTrunkTest')} · ${trunk.name}`} maxWidth="lg">
      <div className="space-y-4">
        {run.isFetching ? (
          <div role="status" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" aria-hidden />
            {tr('pbxTrunkTestRunning')}
          </div>
        ) : null}
        {run.isError && !run.isFetching ? (
          <Alert variant="error">{(errorCode && tr(`pbxErr_${errorCode}`)) || tr('pbxTrunkTestFailed')}</Alert>
        ) : null}
        {report ? (
          <>
            <Alert variant={report.ok ? 'success' : 'error'}>{tr(report.ok ? 'pbxTrunkTestOk' : 'pbxTrunkTestProblems')}</Alert>
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700" aria-label={tr('pbxTrunkTest')}>
              {report.checks.map((check) => (
                <li key={check.id} className="flex gap-3 px-4 py-3" data-check={check.id} data-status={check.status}>
                  <StatusIcon status={check.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{tr(`pbxTrunkCheck_${check.id}`)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400"><CheckDetail check={check} /></p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('close')}</Button>
          <Button type="button" onClick={() => void run.refetch()} loading={run.isFetching} loadingText={tr('pbxTrunkTestRunning')}>
            {tr('pbxTrunkTestAgain')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
