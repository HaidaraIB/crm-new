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
import { ToggleSwitch } from '../../../components/ToggleSwitch';
import { EditIcon, PlusIcon, TrashIcon } from '../../../components/icons';
import type {
  PbxBusinessHoursRow,
  PbxInboundRouteRow,
  PbxNumberRow,
  PbxOutboundRouteRow,
  PbxTrunkRow,
} from '../../../services/api';
import {
  Badge,
  DestinationPicker,
  FieldError,
  FieldLabel,
  SectionHeader,
  readDestination,
  useCatalogForm,
  useConfirmDelete,
  useDestinationLabel,
  usePbxMutations,
  usePbxRows,
  useTr,
  writeDestination,
} from './shared';

// ---- inbound -----------------------------------------------------------------------------

const InboundModal = ({ row, numbers, hours, onClose }: {
  row: PbxInboundRouteRow | null;
  numbers: PbxNumberRow[];
  hours: PbxBusinessHoursRow[];
  onClose: () => void;
}) => {
  const tr = useTr();
  const { create, update } = usePbxMutations<PbxInboundRouteRow>('inbound-routes');
  const form = useCatalogForm('pbx_inbound_route.upsert');
  const [number, setNumber] = useState(row?.number ?? '');
  const [dest, setDest] = useState(readDestination(row, '', 'extension'));
  const [hoursId, setHoursId] = useState(row?.business_hours ?? '');
  const [closed, setClosed] = useState(readDestination(row, 'closed', 'hangup'));
  const payload = () => ({
    number,
    ...writeDestination(dest, ''),
    business_hours: hoursId || null,
    ...(hoursId ? writeDestination(closed, 'closed') : { closed_type: 'hangup' }),
  });
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
  const destError = form.errors.extension || form.errors.ivr || form.errors.queue || form.errors.destination_type;
  const closedError = form.errors.closed_extension || form.errors.closed_ivr || form.errors.closed_queue || form.errors.closed_type;

  return (
    <Modal isOpen onClose={onClose} title={row ? tr('pbxEditInboundRoute') : tr('pbxAddInboundRoute')} maxWidth="lg">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
        <div>
          <FieldLabel htmlFor="pbx-in-number" required>{tr('pbxRouteNumber')}</FieldLabel>
          <Select id="pbx-in-number" value={number} invalid={Boolean(form.errors.number)} disabled={Boolean(row)}
            onChange={(e) => { setNumber(e.target.value); form.clear('number'); }}>
            <option value="">{tr('pbxChoose')}</option>
            {numbers.map((n) => (
              <option key={n.id} value={n.id}>{`⁦${n.e164}⁩${n.label ? ` · ${n.label}` : ''}`}</option>
            ))}
          </Select>
          <FieldError message={form.errors.number} />
        </div>
        <div>
          <FieldLabel htmlFor="pbx-in-dest" required>{tr('pbxDestination')}</FieldLabel>
          <DestinationPicker id="pbx-in-dest" value={dest} types={['extension', 'ivr', 'queue']} error={destError}
            onChange={(next) => { setDest(next); form.setErrors({}); }} />
        </div>
        <div>
          <FieldLabel htmlFor="pbx-in-hours">{tr('pbxBusinessHours')}</FieldLabel>
          <Select id="pbx-in-hours" value={hoursId} onChange={(e) => setHoursId(e.target.value)}>
            <option value="">{tr('pbxAlwaysOpen')}</option>
            {hours.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </Select>
        </div>
        {hoursId ? (
          <div>
            <FieldLabel htmlFor="pbx-in-closed">{tr('pbxClosedDestination')}</FieldLabel>
            <DestinationPicker id="pbx-in-closed" value={closed} types={['extension', 'ivr', 'queue', 'hangup']} error={closedError}
              onChange={(next) => { setClosed(next); form.setErrors({}); }} />
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{tr('cancel')}</Button>
          <Button type="submit" loading={saving} loadingText={tr('saving')}>{tr('save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export const InboundRoutesSection = () => {
  const tr = useTr();
  const { data: rows = [], isLoading } = usePbxRows<PbxInboundRouteRow>('inbound-routes');
  const { data: numbers = [] } = usePbxRows<PbxNumberRow>('numbers');
  const { data: hours = [] } = usePbxRows<PbxBusinessHoursRow>('business-hours');
  const { remove } = usePbxMutations<PbxInboundRouteRow>('inbound-routes');
  const confirmDelete = useConfirmDelete();
  const label = useDestinationLabel();
  const [editing, setEditing] = useState<PbxInboundRouteRow | 'new' | null>(null);
  const routed = new Set(rows.map((r) => r.number));
  const unrouted = numbers.filter((n) => !routed.has(n.id));

  return (
    <div>
      <SectionHeader
        title={tr('pbxInboundRoutes')}
        hint={tr('pbxInboundRoutesHint')}
        action={
          <Button onClick={() => setEditing('new')} disabled={unrouted.length === 0}>
            <PlusIcon className="h-4 w-4" />
            {tr('pbxAddInboundRoute')}
          </Button>
        }
      />
      <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
        <DataTable>
          <TableHead>
            <Th>{tr('pbxRouteNumber')}</Th>
            <Th>{tr('pbxDestination')}</Th>
            <Th>{tr('pbxBusinessHours')}</Th>
            <Th>{tr('pbxClosedDestination')}</Th>
            <Th className="w-24">{tr('actions')}</Th>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableMessageRow colSpan={5}>{isLoading ? tr('loading') : tr('pbxNoInboundRoutes')}</TableMessageRow>
            ) : rows.map((row) => {
              const number = numbers.find((n) => n.id === row.number);
              return (
                <TableRow key={row.id}>
                  <Td>
                    {number ? <PhoneText className="font-medium">{number.e164}</PhoneText> : '—'}
                    {number && !number.verified ? <span className="ms-2"><Badge tone="amber">{tr('pbxPendingVerification')}</Badge></span> : null}
                  </Td>
                  <Td>{label(readDestination(row, '', 'extension'))}</Td>
                  <Td>{hours.find((h) => h.id === row.business_hours)?.name ?? tr('pbxAlwaysOpen')}</Td>
                  <Td>{row.business_hours ? label(readDestination(row, 'closed', 'hangup')) : '—'}</Td>
                  <Td>
                    <TableActions>
                      <IconButton icon={<EditIcon className="h-4 w-4" />} label={tr('edit')} onClick={() => setEditing(row)} />
                      <IconButton icon={<TrashIcon className="h-4 w-4" />} label={tr('delete')} tone="danger"
                        onClick={() => confirmDelete(number?.e164 ?? '', () => remove.mutateAsync(row.id))} />
                    </TableActions>
                  </Td>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      </TableHorizontalScroll>
      {editing ? (
        <InboundModal
          row={editing === 'new' ? null : editing}
          numbers={editing === 'new' ? unrouted : numbers}
          hours={hours}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
};

// ---- outbound ----------------------------------------------------------------------------

type PatternDraft = { prefix: string; digits: string };

const OutboundModal = ({ row, trunks, numbers, onClose }: {
  row: PbxOutboundRouteRow | null;
  trunks: PbxTrunkRow[];
  numbers: PbxNumberRow[];
  onClose: () => void;
}) => {
  const tr = useTr();
  const { create, update } = usePbxMutations<PbxOutboundRouteRow>('outbound-routes');
  const form = useCatalogForm('pbx_outbound_route.upsert');
  const verified = numbers.filter((n) => n.verified);
  const [values, setValues] = useState({
    name: row?.name ?? '',
    priority: String(row?.priority ?? 100),
    trunk: row?.trunk ?? trunks[0]?.id ?? '',
    caller_id: row?.caller_id ?? verified[0]?.id ?? '',
    enabled: row?.enabled ?? true,
  });
  const [patterns, setPatterns] = useState<PatternDraft[]>(
    (row?.patterns ?? [{ prefix: '+9647', digits: 9 }]).map((p) => ({ prefix: p.prefix, digits: String(p.digits) })),
  );
  const payload = () => ({
    name: values.name.trim(),
    priority: Number(values.priority),
    trunk: values.trunk,
    caller_id: values.caller_id,
    enabled: values.enabled,
    patterns: patterns.map((p) => ({ prefix: p.prefix.trim(), digits: Number(p.digits) })),
  });
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
  const setPattern = (i: number, patch: Partial<PatternDraft>) => {
    setPatterns((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
    form.clear('patterns');
  };

  return (
    <Modal isOpen onClose={onClose} title={row ? tr('pbxEditOutboundRoute') : tr('pbxAddOutboundRoute')} maxWidth="lg">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-[1fr,8rem]">
          <div>
            <FieldLabel htmlFor="pbx-out-name" required>{tr('pbxRouteName')}</FieldLabel>
            <Input id="pbx-out-name" value={values.name} invalid={Boolean(form.errors.name)}
              onChange={(e) => { setValues((p) => ({ ...p, name: e.target.value })); form.clear('name'); }}
              onBlur={() => form.blur('name', payload())} />
            <FieldError message={form.errors.name} />
          </div>
          <div>
            <FieldLabel htmlFor="pbx-out-priority">{tr('pbxRoutePriority')}</FieldLabel>
            <Input id="pbx-out-priority" dir="ltr" inputMode="numeric" value={values.priority} invalid={Boolean(form.errors.priority)}
              onChange={(e) => { setValues((p) => ({ ...p, priority: e.target.value.replace(/[^0-9]/g, '') })); form.clear('priority'); }}
              onBlur={() => form.blur('priority', payload())} />
            <FieldError message={form.errors.priority} />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="pbx-out-pattern-0" required>{tr('pbxRoutePatterns')}</FieldLabel>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{tr('pbxRoutePatternsHint')}</p>
          <div className="space-y-2">
            {patterns.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input id={`pbx-out-pattern-${i}`} dir="ltr" className="font-mono" value={p.prefix} aria-label={tr('pbxPatternPrefix')}
                  onChange={(e) => setPattern(i, { prefix: e.target.value.replace(/[^0-9+]/g, '') })} />
                <span className="shrink-0 text-sm text-gray-500">+</span>
                <Input dir="ltr" inputMode="numeric" className="w-24" value={p.digits} aria-label={tr('pbxPatternDigits')}
                  onChange={(e) => setPattern(i, { digits: e.target.value.replace(/[^0-9]/g, '').slice(0, 2) })} />
                <span className="shrink-0 text-sm text-gray-500">{tr('pbxPatternDigits')}</span>
                <IconButton icon={<TrashIcon className="h-4 w-4" />} label={tr('delete')} tone="danger" disabled={patterns.length === 1}
                  onClick={() => setPatterns((prev) => prev.filter((_, idx) => idx !== i))} />
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2" disabled={patterns.length >= 50}
            onClick={() => setPatterns((prev) => [...prev, { prefix: '+', digits: '9' }])}>
            <PlusIcon className="h-4 w-4" />
            {tr('pbxAddPattern')}
          </Button>
          <FieldError message={form.errors.patterns} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="pbx-out-trunk" required>{tr('pbxNumberTrunk')}</FieldLabel>
            <Select id="pbx-out-trunk" value={values.trunk} invalid={Boolean(form.errors.trunk)}
              onChange={(e) => { setValues((p) => ({ ...p, trunk: e.target.value })); form.clear('trunk'); }}>
              <option value="">{tr('pbxChoose')}</option>
              {trunks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <FieldError message={form.errors.trunk} />
          </div>
          <div>
            <FieldLabel htmlFor="pbx-out-cid" required>{tr('pbxRouteCallerId')}</FieldLabel>
            <Select id="pbx-out-cid" value={values.caller_id} invalid={Boolean(form.errors.caller_id)}
              onChange={(e) => { setValues((p) => ({ ...p, caller_id: e.target.value })); form.clear('caller_id'); }}>
              <option value="">{tr('pbxChoose')}</option>
              {verified.map((n) => <option key={n.id} value={n.id}>{`⁦${n.e164}⁩`}</option>)}
            </Select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tr('pbxCallerIdHint')}</p>
            <FieldError message={form.errors.caller_id} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ToggleSwitch enabled={values.enabled} setEnabled={(enabled) => setValues((p) => ({ ...p, enabled }))} />
          <span className="text-sm text-gray-700 dark:text-gray-300">{tr('pbxRouteEnabled')}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{tr('cancel')}</Button>
          <Button type="submit" loading={saving} loadingText={tr('saving')}>{tr('save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export const OutboundRoutesSection = () => {
  const tr = useTr();
  const { data: rows = [], isLoading } = usePbxRows<PbxOutboundRouteRow>('outbound-routes');
  const { data: trunks = [] } = usePbxRows<PbxTrunkRow>('trunks');
  const { data: numbers = [] } = usePbxRows<PbxNumberRow>('numbers');
  const { remove } = usePbxMutations<PbxOutboundRouteRow>('outbound-routes');
  const confirmDelete = useConfirmDelete();
  const [editing, setEditing] = useState<PbxOutboundRouteRow | 'new' | null>(null);
  const canAdd = trunks.length > 0 && numbers.some((n) => n.verified);

  return (
    <div>
      <SectionHeader
        title={tr('pbxOutboundRoutes')}
        hint={tr('pbxOutboundRoutesHint')}
        action={
          <Button onClick={() => setEditing('new')} disabled={!canAdd} title={canAdd ? undefined : tr('pbxNeedVerifiedNumber')}>
            <PlusIcon className="h-4 w-4" />
            {tr('pbxAddOutboundRoute')}
          </Button>
        }
      />
      <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
        <DataTable>
          <TableHead>
            <Th>{tr('pbxRouteName')}</Th>
            <Th>{tr('pbxRoutePatterns')}</Th>
            <Th>{tr('pbxNumberTrunk')}</Th>
            <Th>{tr('pbxRouteCallerId')}</Th>
            <Th>{tr('pbxRouteEnabled')}</Th>
            <Th className="w-24">{tr('actions')}</Th>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableMessageRow colSpan={6}>{isLoading ? tr('loading') : tr('pbxNoOutboundRoutes')}</TableMessageRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <Td className="font-medium">{row.name}</Td>
                <Td>
                  <span dir="ltr" className="font-mono text-xs">
                    {row.patterns.map((p) => `${p.prefix}${'X'.repeat(p.digits)}`).join(', ')}
                  </span>
                </Td>
                <Td>{trunks.find((t) => t.id === row.trunk)?.name ?? '—'}</Td>
                <Td>{(() => { const n = numbers.find((x) => x.id === row.caller_id); return n ? <PhoneText>{n.e164}</PhoneText> : '—'; })()}</Td>
                <Td>{row.enabled ? <Badge tone="green">{tr('pbxStatusActive')}</Badge> : <Badge tone="gray">{tr('pbxStatusDisabled')}</Badge>}</Td>
                <Td>
                  <TableActions>
                    <IconButton icon={<EditIcon className="h-4 w-4" />} label={tr('edit')} onClick={() => setEditing(row)} />
                    <IconButton icon={<TrashIcon className="h-4 w-4" />} label={tr('delete')} tone="danger"
                      onClick={() => confirmDelete(row.name, () => remove.mutateAsync(row.id))} />
                  </TableActions>
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      </TableHorizontalScroll>
      {editing ? (
        <OutboundModal row={editing === 'new' ? null : editing} trunks={trunks} numbers={numbers} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
};
