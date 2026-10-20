import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { PhoneText } from '../../../components/PhoneText';
import { Select } from '../../../components/Select';
import { TableHorizontalScroll } from '../../../components/TableHorizontalScroll';
import { EditIcon, PlusIcon, RefreshIcon, TrashIcon } from '../../../components/icons';
import { useUsers } from '../../../hooks/useQueries';
import {
  getAgentPresenceAPI,
  rotatePbxExtensionCredentialsAPI,
  type PbxExtensionRow,
  type PbxNumberRow,
} from '../../../services/api';
import {
  Badge,
  EmptyRow,
  FieldError,
  FieldLabel,
  SectionHeader,
  TD,
  TH,
  useCatalogForm,
  useConfirmDelete,
  usePbxMutations,
  usePbxRows,
  useTr,
} from './shared';

type UserOption = { id: number; name?: string; username?: string; first_name?: string; last_name?: string };

function userName(user: UserOption | undefined): string {
  if (!user) return '';
  return user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || '';
}

function useCompanyUsers(): UserOption[] {
  const { data } = useUsers(1, undefined, 200);
  return (Array.isArray(data) ? data : data?.results || []) as UserOption[];
}

const ExtensionModal = ({ row, numbers, onClose, onSecret }: {
  row: PbxExtensionRow | null;
  numbers: PbxNumberRow[];
  onClose: () => void;
  onSecret: (row: PbxExtensionRow) => void;
}) => {
  const tr = useTr();
  const users = useCompanyUsers();
  const { create, update } = usePbxMutations<PbxExtensionRow>('extensions');
  const form = useCatalogForm('pbx_extension.upsert');
  const verified = numbers.filter((n) => n.verified);
  const [values, setValues] = useState({
    number: row?.number ?? '',
    display_name: row?.display_name ?? '',
    device_type: row?.device_type ?? 'webrtc',
    user: row?.user ? String(row.user) : '',
    status: row?.status ?? 'active',
    outbound_number: row?.outbound_number ?? '',
  });
  const set = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    form.clear(field);
  };
  const saving = create.isPending || update.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.validate(values)) return;
    const data = {
      ...values,
      user: values.user ? Number(values.user) : null,
      outbound_number: values.outbound_number || null,
    };
    try {
      if (row) await update.mutateAsync({ id: row.id, data });
      else onSecret(await create.mutateAsync(data));
      onClose();
    } catch (error) {
      form.fromServer(error, tr('pbxSaveFailed'));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={row ? tr('pbxEditExtension') : tr('pbxAddExtension')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
        <div>
          <FieldLabel htmlFor="pbx-ext-number" required>{tr('pbxExtensionNumber')}</FieldLabel>
          <Input
            id="pbx-ext-number"
            dir="ltr"
            inputMode="numeric"
            value={values.number}
            invalid={Boolean(form.errors.number)}
            onChange={(e) => set('number', e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            onBlur={() => form.blur('number', values)}
          />
          <FieldError message={form.errors.number} />
        </div>
        <div>
          <FieldLabel htmlFor="pbx-ext-name">{tr('pbxDisplayName')}</FieldLabel>
          <Input
            id="pbx-ext-name"
            value={values.display_name}
            invalid={Boolean(form.errors.display_name)}
            onChange={(e) => set('display_name', e.target.value)}
            onBlur={() => form.blur('display_name', values)}
          />
          <FieldError message={form.errors.display_name} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="pbx-ext-device">{tr('pbxDeviceType')}</FieldLabel>
            <Select id="pbx-ext-device" value={values.device_type} onChange={(e) => set('device_type', e.target.value)}>
              <option value="webrtc">{tr('pbxDevice_webrtc')}</option>
              <option value="desk_phone">{tr('pbxDevice_desk_phone')}</option>
              <option value="softphone">{tr('pbxDevice_softphone')}</option>
            </Select>
            <FieldError message={form.errors.device_type} />
          </div>
          <div>
            <FieldLabel htmlFor="pbx-ext-status">{tr('pbxExtensionStatus')}</FieldLabel>
            <Select id="pbx-ext-status" value={values.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">{tr('pbxStatusActive')}</option>
              <option value="disabled">{tr('pbxStatusDisabled')}</option>
            </Select>
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="pbx-ext-sim">{tr('pbxOutboundSim')}</FieldLabel>
          <Select
            id="pbx-ext-sim"
            dir="ltr"
            value={values.outbound_number}
            invalid={Boolean(form.errors.outbound_number)}
            onChange={(e) => set('outbound_number', e.target.value)}
          >
            <option value="">{tr('pbxOutboundSimNone')}</option>
            {verified.map((n) => (
              <option key={n.id} value={n.id}>{n.e164}{n.label ? ` — ${n.label}` : ''}</option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tr('pbxOutboundSimHint')}</p>
          <FieldError message={form.errors.outbound_number} />
        </div>
        <div>
          <FieldLabel htmlFor="pbx-ext-user">{tr('pbxExtensionUser')}</FieldLabel>
          <Select id="pbx-ext-user" value={values.user} invalid={Boolean(form.errors.user)} onChange={(e) => set('user', e.target.value)}>
            <option value="">{tr('pbxNoUser')}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{userName(user)}</option>
            ))}
          </Select>
          <FieldError message={form.errors.user} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{tr('cancel')}</Button>
          <Button type="submit" loading={saving} loadingText={tr('saving')}>{tr('save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

/** The SIP password is shown once (create / rotate); desk phones need it, browsers never do. */
const SecretModal = ({ row, onClose }: { row: PbxExtensionRow; onClose: () => void }) => {
  const tr = useTr();
  return (
    <Modal isOpen onClose={onClose} title={tr('pbxSipCredentials')}>
      <div className="space-y-3">
        <Alert variant="warning">{tr('pbxSecretOnce')}</Alert>
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500 dark:text-gray-400">{tr('pbxSipUsername')}</dt>
          <dd dir="ltr" className="break-all font-mono">{row.sip_username}</dd>
          <dt className="text-gray-500 dark:text-gray-400">{tr('pbxSipPassword')}</dt>
          <dd dir="ltr" className="break-all font-mono">{row.sip_secret}</dd>
        </dl>
        <div className="flex justify-end">
          <Button onClick={onClose}>{tr('close')}</Button>
        </div>
      </div>
    </Modal>
  );
};

export const ExtensionsSection = () => {
  const tr = useTr();
  const { data: rows = [], isLoading } = usePbxRows<PbxExtensionRow>('extensions');
  const { data: numbers = [] } = usePbxRows<PbxNumberRow>('numbers');
  const users = useCompanyUsers();
  const { remove, invalidate } = usePbxMutations<PbxExtensionRow>('extensions');
  const confirmDelete = useConfirmDelete();
  const presence = useQuery({ queryKey: ['telephony', 'presence'], queryFn: getAgentPresenceAPI, staleTime: 30_000 });
  const byExtension = useMemo(
    () => new Map((presence.data?.agents || []).map((a) => [a.extension_id, a])),
    [presence.data],
  );
  const [editing, setEditing] = useState<PbxExtensionRow | 'new' | null>(null);
  const [secret, setSecret] = useState<PbxExtensionRow | null>(null);
  const [rotateError, setRotateError] = useState('');

  useEffect(() => setRotateError(''), [rows]);

  const rotate = async (row: PbxExtensionRow) => {
    try {
      setSecret(await rotatePbxExtensionCredentialsAPI(row.id));
      invalidate();
    } catch {
      setRotateError(tr('pbxSaveFailed'));
    }
  };

  return (
    <div>
      <SectionHeader
        title={tr('pbxExtensions')}
        hint={tr('pbxExtensionsHint')}
        action={<Button onClick={() => setEditing('new')}><PlusIcon className="h-4 w-4" />{tr('pbxAddExtension')}</Button>}
      />
      {rotateError ? <Alert variant="error">{rotateError}</Alert> : null}
      <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <tr>
              <TH>{tr('pbxExtensionNumber')}</TH>
              <TH>{tr('pbxDisplayName')}</TH>
              <TH>{tr('pbxExtensionUser')}</TH>
              <TH>{tr('pbxDeviceType')}</TH>
              <TH>{tr('pbxPresence')}</TH>
              <TH className="w-32">{tr('actions')}</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} text={isLoading ? tr('loading') : tr('pbxNoExtensions')} />
            ) : rows.map((row) => {
              const agent = byExtension.get(row.id);
              return (
                <tr key={row.id}>
                  <TD><PhoneText className="font-semibold">{row.number}</PhoneText></TD>
                  <TD>{row.display_name || '—'}</TD>
                  <TD>{userName(users.find((u) => u.id === row.user)) || '—'}</TD>
                  <TD>{tr(`pbxDevice_${row.device_type}`)}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {row.status === 'disabled' ? <Badge tone="gray">{tr('pbxStatusDisabled')}</Badge> : null}
                      {agent ? (
                        <>
                          <Badge tone={agent.registered ? 'green' : 'gray'}>
                            {agent.registered ? tr('pbxRegistered') : tr('pbxNotRegistered')}
                          </Badge>
                          {agent.agent_status === 'paused' ? <Badge tone="amber">{tr('agentStatusPaused')}</Badge> : null}
                          {agent.on_call ? <Badge tone="red">{tr('pbxOnCall')}</Badge> : null}
                        </>
                      ) : null}
                    </div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-1">
                      <IconButton icon={<EditIcon className="h-4 w-4" />} label={tr('edit')} onClick={() => setEditing(row)} />
                      <IconButton icon={<RefreshIcon className="h-4 w-4" />} label={tr('pbxRotateCredentials')} onClick={() => void rotate(row)} />
                      <IconButton
                        icon={<TrashIcon className="h-4 w-4" />}
                        label={tr('delete')}
                        tone="danger"
                        onClick={() => confirmDelete(row.number, () => remove.mutateAsync(row.id))}
                      />
                    </div>
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableHorizontalScroll>
      {editing ? (
        <ExtensionModal
          row={editing === 'new' ? null : editing}
          numbers={numbers}
          onClose={() => setEditing(null)}
          onSecret={(row) => row.sip_secret && setSecret(row)}
        />
      ) : null}
      {secret ? <SecretModal row={secret} onClose={() => setSecret(null)} /> : null}
    </div>
  );
};
