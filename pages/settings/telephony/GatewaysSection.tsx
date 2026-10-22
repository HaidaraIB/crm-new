/**
 * GSM gateways (spec section 5, gateway onboarding). Adding one pins a tunnel
 * address and issues a one-time enrollment code for the installer; the gateway is
 * marked ready only after the phone system has reached it over the tunnel.
 */
import React, { useState } from 'react';

import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { TableHorizontalScroll } from '../../../components/TableHorizontalScroll';
import { DataTable, TableActions, TableBody, TableHead, TableMessageRow, TableRow, Td, Th } from '../../../components/DataTable';
import { PlusIcon, RefreshIcon, TrashIcon } from '../../../components/icons';
import { useAppContext } from '../../../context/AppContext';
import { getLocalizedApiErrorMessage } from '../../../utils/apiErrorMessage';
import {
  resetPbxGatewayEnrollmentAPI,
  verifyPbxGatewayAPI,
  type PbxGatewayRow,
} from '../../../services/api';
import {
  Badge,
  FieldError,
  FieldLabel,
  SectionHeader,
  useCatalogForm,
  useConfirmDelete,
  usePbxMutations,
  usePbxRows,
  useTr,
} from './shared';

const STATUS_TONE: Record<PbxGatewayRow['status'], 'green' | 'amber' | 'gray'> = {
  awaiting_enrollment: 'amber',
  enrolled: 'gray',
  verified: 'green',
};

/** The one-time code and what the installer does with it. */
const EnrollmentModal = ({ gateway, onClose }: { gateway: PbxGatewayRow; onClose: () => void }) => {
  const tr = useTr();
  const { language } = useAppContext();
  const example = `curl -X POST ${gateway.enrollment_url} \\\n  -H "Content-Type: application/json" \\\n  -d '{"token": "${gateway.enrollment_token}", "public_key": "<gateway WireGuard public key>"}'`;
  return (
    <Modal isOpen onClose={onClose} title={tr('pbxGatewayEnrollment')} maxWidth="lg">
      <div className="space-y-3 text-sm">
        <Alert variant="warning">{tr('pbxGatewayCodeOnce')}</Alert>
        <div>
          <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">{tr('pbxGatewayCode')}</p>
          <p dir="ltr" className="break-all rounded-md bg-gray-100 p-2 font-mono text-xs dark:bg-gray-800">{gateway.enrollment_token}</p>
          {gateway.token_expires_at ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {tr('pbxGatewayCodeExpires')} {new Date(gateway.token_expires_at).toLocaleString(language === 'ar' ? 'ar' : 'en')}
            </p>
          ) : null}
        </div>
        <ol className="list-decimal space-y-1 ps-5 text-gray-700 dark:text-gray-300">
          <li>{tr('pbxGatewayStep1')}</li>
          <li>{tr('pbxGatewayStep2')}</li>
          <li>{tr('pbxGatewayStep3')}</li>
        </ol>
        <pre dir="ltr" className="overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">{example}</pre>
        <div className="flex justify-end">
          <Button onClick={onClose}>{tr('close')}</Button>
        </div>
      </div>
    </Modal>
  );
};

const AddGatewayModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: (gw: PbxGatewayRow) => void }) => {
  const tr = useTr();
  const { create } = usePbxMutations<PbxGatewayRow>('gateways');
  const form = useCatalogForm('pbx_gateway.create');
  const [name, setName] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: name.trim() };
    if (!form.validate(data)) return;
    try {
      onCreated(await create.mutateAsync(data));
    } catch (error) {
      form.fromServer(error, tr('pbxSaveFailed'));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={tr('pbxAddGateway')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
        <p className="text-sm text-gray-600 dark:text-gray-400">{tr('pbxAddGatewayHint')}</p>
        <div>
          <FieldLabel htmlFor="pbx-gw-name" required>{tr('pbxGatewayName')}</FieldLabel>
          <Input id="pbx-gw-name" value={name} invalid={Boolean(form.errors.name)}
            onChange={(e) => { setName(e.target.value); form.clear('name'); }} onBlur={() => form.blur('name', { name })} />
          <FieldError message={form.errors.name} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={create.isPending}>{tr('cancel')}</Button>
          <Button type="submit" loading={create.isPending} loadingText={tr('saving')}>{tr('pbxAddGateway')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export const GatewaysSection = () => {
  const tr = useTr();
  const { t } = useAppContext();
  // Enrollment happens on site, outside this page: watch for it until every gateway is ready.
  const { data: rows = [], isLoading } = usePbxRows<PbxGatewayRow>(
    'gateways', true, (data) => (data?.some((gw) => gw.status !== 'verified') ? 5000 : false),
  );
  const { remove, invalidate } = usePbxMutations<PbxGatewayRow>('gateways');
  const confirmDelete = useConfirmDelete();
  const [adding, setAdding] = useState(false);
  const [enrollment, setEnrollment] = useState<PbxGatewayRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  const run = async (id: string, action: () => Promise<PbxGatewayRow>, onDone: (gw: PbxGatewayRow) => void) => {
    setBusy(id);
    setMessage(null);
    try {
      onDone(await action());
      invalidate();
    } catch (error) {
      setMessage({ tone: 'error', text: getLocalizedApiErrorMessage(error, t, 'pbxSaveFailed') });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-8">
      <SectionHeader
        title={tr('pbxGateways')}
        hint={tr('pbxGatewaysHint')}
        action={<Button onClick={() => setAdding(true)}><PlusIcon className="h-4 w-4" />{tr('pbxAddGateway')}</Button>}
      />
      {message ? <div className="mb-3"><Alert variant={message.tone}>{message.text}</Alert></div> : null}
      <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
        <DataTable>
          <TableHead>
            <Th>{tr('pbxGatewayName')}</Th>
            <Th>{tr('pbxGatewayTunnel')}</Th>
            <Th>{tr('pbxGatewayStatus')}</Th>
            <Th>{tr('pbxGatewayReachability')}</Th>
            <Th className="w-48">{tr('actions')}</Th>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableMessageRow colSpan={5}>{isLoading ? tr('loading') : tr('pbxNoGateways')}</TableMessageRow>
            ) : rows.map((gw) => (
              <TableRow key={gw.id}>
                <Td className="font-medium">{gw.name}</Td>
                <Td><span dir="ltr" className="font-mono text-xs">{gw.tunnel_ip}</span></Td>
                <Td><Badge tone={STATUS_TONE[gw.status]}>{tr(`pbxGatewayStatus_${gw.status}`)}</Badge></Td>
                <Td>
                  {gw.health === 'ready' ? <Badge tone="green">{tr('pbxReachable')}</Badge>
                    : gw.health === 'down' ? <Badge tone="red">{tr('pbxUnreachable')}</Badge>
                    : gw.health === 'degraded' ? <Badge tone="amber">{tr('pbxTrunkStatus_degraded')}</Badge>
                    : <span className="text-gray-400">—</span>}
                </Td>
                <Td>
                  <TableActions>
                    {gw.status !== 'awaiting_enrollment' ? (
                      <Button size="sm" variant="secondary" loading={busy === gw.id} disabled={busy !== null}
                        onClick={() => void run(gw.id, () => verifyPbxGatewayAPI(gw.id),
                          () => setMessage({ tone: 'success', text: tr('pbxGatewayVerified') }))}>
                        {tr('pbxVerifyGateway')}
                      </Button>
                    ) : null}
                    <IconButton icon={<RefreshIcon className="h-4 w-4" />} label={tr('pbxNewEnrollmentCode')} disabled={busy !== null}
                      onClick={() => void run(gw.id, () => resetPbxGatewayEnrollmentAPI(gw.id), setEnrollment)} />
                    <IconButton icon={<TrashIcon className="h-4 w-4" />} label={tr('delete')} tone="danger"
                      onClick={() => confirmDelete(gw.name, () => remove.mutateAsync(gw.id))} />
                  </TableActions>
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      </TableHorizontalScroll>
      {adding ? (
        <AddGatewayModal onClose={() => setAdding(false)} onCreated={(gw) => { setAdding(false); setEnrollment(gw); }} />
      ) : null}
      {enrollment ? <EnrollmentModal gateway={enrollment} onClose={() => setEnrollment(null)} /> : null}
    </div>
  );
};
