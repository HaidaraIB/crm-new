import React, { useState } from 'react';

import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';
import { AutoDirTextarea, Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { Select } from '../../../components/Select';
import { TableHorizontalScroll } from '../../../components/TableHorizontalScroll';
import { DataTable, TableActions, TableBody, TableHead, TableMessageRow, TableRow, Td, Th } from '../../../components/DataTable';
import { CheckSquareIcon, EditIcon, PlusIcon, TrashIcon } from '../../../components/icons';
import type { PbxTrunkRow } from '../../../services/api';
import { GatewaysSection } from './GatewaysSection';
import { TrunkTestModal } from './TrunkTestModal';
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

const STATUS_TONE: Record<PbxTrunkRow['status'], 'green' | 'amber' | 'gray' | 'red'> = {
  ready: 'green',
  pending: 'amber',
  degraded: 'amber',
  down: 'red',
  disabled: 'gray',
};

const TrunkModal = ({ row, onClose }: { row: PbxTrunkRow | null; onClose: () => void }) => {
  const tr = useTr();
  const { create, update } = usePbxMutations<PbxTrunkRow>('trunks');
  const form = useCatalogForm('pbx_trunk.upsert');
  const [values, setValues] = useState({
    name: row?.name ?? '',
    kind: row?.kind ?? 'sip',
    host: row?.host ?? '',
    port: String(row?.port ?? 5060),
    transport: row?.transport ?? 'udp',
    auth_username: row?.auth_username ?? '',
    auth_secret: '',
    allowed_sources: (row?.allowed_sources ?? []).join('\n'),
  });
  const set = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    form.clear(field);
  };
  const payload = () => {
    const data: Record<string, unknown> = {
      name: values.name.trim(),
      kind: values.kind,
      host: values.host.trim(),
      port: Number(values.port),
      transport: values.transport,
      auth_username: values.auth_username.trim(),
      allowed_sources: values.allowed_sources.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean),
    };
    // Blank keeps the stored secret on edit; the API never returns it.
    if (values.auth_secret || !row) data.auth_secret = values.auth_secret;
    return data;
  };
  const saving = create.isPending || update.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = payload();
    if (!form.validate(data)) return;
    try {
      if (row) await update.mutateAsync({ id: row.id, data });
      else await create.mutateAsync(data);
      onClose();
    } catch (error) {
      form.fromServer(error, tr('pbxSaveFailed'));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={row ? tr('pbxEditTrunk') : tr('pbxAddTrunk')} maxWidth="lg">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="pbx-trunk-name" required>{tr('pbxTrunkName')}</FieldLabel>
            <Input id="pbx-trunk-name" value={values.name} invalid={Boolean(form.errors.name)}
              onChange={(e) => set('name', e.target.value)} onBlur={() => form.blur('name', payload())} />
            <FieldError message={form.errors.name} />
          </div>
          <div>
            <FieldLabel htmlFor="pbx-trunk-kind">{tr('pbxTrunkKind')}</FieldLabel>
            <Select id="pbx-trunk-kind" value={values.kind} onChange={(e) => set('kind', e.target.value)}>
              <option value="sip">{tr('pbxTrunkKind_sip')}</option>
              <option value="gsm_gateway">{tr('pbxTrunkKind_gsm_gateway')}</option>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr,7rem,7rem]">
          <div>
            <FieldLabel htmlFor="pbx-trunk-host" required>{tr('pbxTrunkHost')}</FieldLabel>
            <Input id="pbx-trunk-host" dir="ltr" value={values.host} invalid={Boolean(form.errors.host)}
              onChange={(e) => set('host', e.target.value)} onBlur={() => form.blur('host', payload())} />
            <FieldError message={form.errors.host} />
          </div>
          <div>
            <FieldLabel htmlFor="pbx-trunk-port">{tr('pbxTrunkPort')}</FieldLabel>
            <Input id="pbx-trunk-port" dir="ltr" inputMode="numeric" value={values.port} invalid={Boolean(form.errors.port)}
              onChange={(e) => set('port', e.target.value.replace(/[^0-9]/g, ''))} onBlur={() => form.blur('port', payload())} />
            <FieldError message={form.errors.port} />
          </div>
          <div>
            <FieldLabel htmlFor="pbx-trunk-transport">{tr('pbxTrunkTransport')}</FieldLabel>
            <Select id="pbx-trunk-transport" value={values.transport} onChange={(e) => set('transport', e.target.value)}>
              <option value="udp">UDP</option>
              <option value="tcp">TCP</option>
              <option value="tls">TLS</option>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="pbx-trunk-user">{tr('pbxTrunkAuthUsername')}</FieldLabel>
            <Input id="pbx-trunk-user" dir="ltr" value={values.auth_username} invalid={Boolean(form.errors.auth_username)}
              onChange={(e) => set('auth_username', e.target.value)} onBlur={() => form.blur('auth_username', payload())} />
            <FieldError message={form.errors.auth_username} />
          </div>
          <div>
            <FieldLabel htmlFor="pbx-trunk-secret">{tr('pbxTrunkAuthSecret')}</FieldLabel>
            <Input id="pbx-trunk-secret" type="password" dir="ltr" autoComplete="new-password" value={values.auth_secret}
              placeholder={row?.has_auth_secret ? tr('pbxSecretKept') : ''} invalid={Boolean(form.errors.auth_secret)}
              onChange={(e) => set('auth_secret', e.target.value)} onBlur={() => form.blur('auth_secret', payload())} />
            <FieldError message={form.errors.auth_secret} />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="pbx-trunk-sources">{tr('pbxTrunkAllowedSources')}</FieldLabel>
          <AutoDirTextarea
            id="pbx-trunk-sources"
            dir="ltr"
            rows={3}
            value={values.allowed_sources}
            onChange={(e) => set('allowed_sources', e.target.value)}
            onBlur={() => form.blur('allowed_sources', payload())}
            className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tr('pbxTrunkAllowedSourcesHint')}</p>
          <FieldError message={form.errors.allowed_sources} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{tr('cancel')}</Button>
          <Button type="submit" loading={saving} loadingText={tr('saving')}>{tr('save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export const TrunksSection = () => {
  const tr = useTr();
  const { data: rows = [], isLoading } = usePbxRows<PbxTrunkRow>('trunks');
  const { remove } = usePbxMutations<PbxTrunkRow>('trunks');
  const confirmDelete = useConfirmDelete();
  const [editing, setEditing] = useState<PbxTrunkRow | 'new' | null>(null);
  const [testing, setTesting] = useState<PbxTrunkRow | null>(null);

  return (
    <div>
      <SectionHeader
        title={tr('pbxTrunks')}
        hint={tr('pbxTrunksHint')}
        action={<Button onClick={() => setEditing('new')}><PlusIcon className="h-4 w-4" />{tr('pbxAddTrunk')}</Button>}
      />
      <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
        <DataTable>
          <TableHead>
            <Th>{tr('pbxTrunkName')}</Th>
            <Th>{tr('pbxTrunkKind')}</Th>
            <Th>{tr('pbxTrunkHost')}</Th>
            <Th>{tr('pbxTrunkStatus')}</Th>
            <Th className="w-24">{tr('actions')}</Th>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableMessageRow colSpan={5}>{isLoading ? tr('loading') : tr('pbxNoTrunks')}</TableMessageRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <Td className="font-medium">{row.name}</Td>
                <Td>{tr(`pbxTrunkKind_${row.kind}`)}</Td>
                <Td><span dir="ltr" className="font-mono text-xs">{row.host}:{row.port}/{row.transport}</span></Td>
                <Td><Badge tone={STATUS_TONE[row.status]}>{tr(`pbxTrunkStatus_${row.status}`)}</Badge></Td>
                <Td>
                  <TableActions>
                    <IconButton icon={<CheckSquareIcon className="h-4 w-4" />} label={tr('pbxTrunkTest')} onClick={() => setTesting(row)} />
                    {row.gateway ? (
                      // A GSM gateway's trunk: managed (and deleted) from the gateways list below.
                      <Badge tone="gray">{tr('pbxManagedByGateway')}</Badge>
                    ) : (
                      <>
                        <IconButton icon={<EditIcon className="h-4 w-4" />} label={tr('edit')} onClick={() => setEditing(row)} />
                        <IconButton icon={<TrashIcon className="h-4 w-4" />} label={tr('delete')} tone="danger"
                          onClick={() => confirmDelete(row.name, () => remove.mutateAsync(row.id))} />
                      </>
                    )}
                  </TableActions>
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      </TableHorizontalScroll>
      {editing ? <TrunkModal row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
      {testing ? <TrunkTestModal trunk={testing} onClose={() => setTesting(null)} /> : null}
      <GatewaysSection />
    </div>
  );
};
