import React, { useState } from 'react';

import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { PhoneText } from '../../../components/PhoneText';
import { Select } from '../../../components/Select';
import { TableHorizontalScroll } from '../../../components/TableHorizontalScroll';
import { DataTable, TableActions, TableBody, TableHead, TableMessageRow, TableRow, Td, Th } from '../../../components/DataTable';
import { EditIcon, PlusIcon, TrashIcon } from '../../../components/icons';
import type { PbxNumberRow, PbxTrunkRow } from '../../../services/api';
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

const NumberModal = ({ row, trunks, onClose }: { row: PbxNumberRow | null; trunks: PbxTrunkRow[]; onClose: () => void }) => {
  const tr = useTr();
  const { create, update } = usePbxMutations<PbxNumberRow>('numbers');
  const form = useCatalogForm('pbx_number.upsert');
  const [values, setValues] = useState({ e164: row?.e164 ?? '', label: row?.label ?? '', trunk: row?.trunk ?? trunks[0]?.id ?? '' });
  const set = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    form.clear(field);
  };
  const payload = () => ({ ...values, e164: values.e164.replace(/[\s-]/g, '') });
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
    <Modal isOpen onClose={onClose} title={row ? tr('pbxEditNumber') : tr('pbxAddNumber')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
        {row?.verified ? <Alert variant="warning">{tr('pbxNumberReverify')}</Alert> : null}
        <div>
          <FieldLabel htmlFor="pbx-number-e164" required>{tr('pbxNumberE164')}</FieldLabel>
          <Input id="pbx-number-e164" dir="ltr" inputMode="tel" placeholder="+9647700000000" value={values.e164}
            invalid={Boolean(form.errors.e164)} onChange={(e) => set('e164', e.target.value)}
            onBlur={() => form.blur('e164', payload())} />
          <FieldError message={form.errors.e164} />
        </div>
        <div>
          <FieldLabel htmlFor="pbx-number-label">{tr('pbxNumberLabel')}</FieldLabel>
          <Input id="pbx-number-label" value={values.label} invalid={Boolean(form.errors.label)}
            onChange={(e) => set('label', e.target.value)} onBlur={() => form.blur('label', payload())} />
          <FieldError message={form.errors.label} />
        </div>
        <div>
          <FieldLabel htmlFor="pbx-number-trunk" required>{tr('pbxNumberTrunk')}</FieldLabel>
          <Select id="pbx-number-trunk" value={values.trunk} invalid={Boolean(form.errors.trunk)}
            onChange={(e) => set('trunk', e.target.value)}>
            <option value="">{tr('pbxChoose')}</option>
            {trunks.map((trunk) => <option key={trunk.id} value={trunk.id}>{trunk.name}</option>)}
          </Select>
          <FieldError message={form.errors.trunk} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{tr('cancel')}</Button>
          <Button type="submit" loading={saving} loadingText={tr('saving')}>{tr('save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export const NumbersSection = () => {
  const tr = useTr();
  const { data: rows = [], isLoading } = usePbxRows<PbxNumberRow>('numbers');
  const { data: trunks = [] } = usePbxRows<PbxTrunkRow>('trunks');
  const { remove } = usePbxMutations<PbxNumberRow>('numbers');
  const confirmDelete = useConfirmDelete();
  const [editing, setEditing] = useState<PbxNumberRow | 'new' | null>(null);

  return (
    <div>
      <SectionHeader
        title={tr('pbxNumbers')}
        hint={tr('pbxNumbersHint')}
        action={
          <Button onClick={() => setEditing('new')} disabled={trunks.length === 0} title={trunks.length ? undefined : tr('pbxNeedTrunkFirst')}>
            <PlusIcon className="h-4 w-4" />
            {tr('pbxAddNumber')}
          </Button>
        }
      />
      <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
        <DataTable>
          <TableHead>
            <Th>{tr('pbxNumberE164')}</Th>
            <Th>{tr('pbxNumberLabel')}</Th>
            <Th>{tr('pbxNumberTrunk')}</Th>
            <Th>{tr('pbxNumberVerification')}</Th>
            <Th className="w-24">{tr('actions')}</Th>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableMessageRow colSpan={5}>{isLoading ? tr('loading') : tr('pbxNoNumbers')}</TableMessageRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <Td><PhoneText className="font-medium">{row.e164}</PhoneText></Td>
                <Td>{row.label || '—'}</Td>
                <Td>{trunks.find((t) => t.id === row.trunk)?.name ?? '—'}</Td>
                <Td>
                  {row.verified ? <Badge tone="green">{tr('pbxVerified')}</Badge> : <Badge tone="amber">{tr('pbxPendingVerification')}</Badge>}
                </Td>
                <Td>
                  <TableActions>
                    <IconButton icon={<EditIcon className="h-4 w-4" />} label={tr('edit')} onClick={() => setEditing(row)} />
                    <IconButton icon={<TrashIcon className="h-4 w-4" />} label={tr('delete')} tone="danger"
                      onClick={() => confirmDelete(row.e164, () => remove.mutateAsync(row.id))} />
                  </TableActions>
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      </TableHorizontalScroll>
      {editing ? <NumberModal row={editing === 'new' ? null : editing} trunks={trunks} onClose={() => setEditing(null)} /> : null}
    </div>
  );
};
