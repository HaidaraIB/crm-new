import React, { useState } from 'react';

import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { Select } from '../../../components/Select';
import { TableHorizontalScroll } from '../../../components/TableHorizontalScroll';
import { DataTable, TableActions, TableBody, TableHead, TableMessageRow, TableRow, Td, Th } from '../../../components/DataTable';
import { EditIcon, PlusIcon, TrashIcon } from '../../../components/icons';
import type { PbxDestinationType, PbxIvrMenuRow, PbxIvrOption, PbxQueueRow, PbxSoundRow } from '../../../services/api';
import {
  type Destination,
  DestinationPicker,
  FieldError,
  FieldLabel,
  FormSection,
  SectionHeader,
  readDestination,
  useCatalogForm,
  useConfirmDelete,
  useDestinationLabel,
  useDestinationTargets,
  usePbxMutations,
  usePbxRows,
  useTr,
  writeDestination,
} from './shared';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '#'];
const PROMPTS = ['loop/ivr-default', 'loop/ivr-welcome-ar', 'loop/ivr-welcome-en'];
const ALL: PbxDestinationType[] = ['extension', 'ivr', 'queue', 'hangup'];
// Shared by the key rows and their column header so the columns line up.
const KEY_ROW_GRID = 'grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] gap-3';

// ---- IVR menus ------------------------------------------------------------------------------

type OptionDraft = { digit: string; dest: Destination };

const IvrModal = ({ row, onClose }: { row: PbxIvrMenuRow | null; onClose: () => void }) => {
  const tr = useTr();
  const { create, update } = usePbxMutations<PbxIvrMenuRow>('ivr-menus');
  const { data: greetings = [] } = usePbxRows<PbxSoundRow>('sounds');
  const form = useCatalogForm('pbx_ivr.upsert');
  const [values, setValues] = useState({
    name: row?.name ?? '',
    prompt: row?.prompt ?? PROMPTS[0],
    // One picker for both: a platform prompt, or the company's own greeting.
    greeting: row?.greeting ?? '',
    timeout_s: String(row?.timeout_s ?? 5),
    max_retries: String(row?.max_retries ?? 2),
  });
  const [timeout, setTimeoutDest] = useState(readDestination(row, 'timeout', 'hangup'));
  const [options, setOptions] = useState<OptionDraft[]>(
    (row?.options ?? []).map((o) => ({ digit: o.digit, dest: readDestination(o as unknown as Record<string, unknown>, '', 'extension') })),
  );
  const payload = () => ({
    name: values.name.trim(),
    prompt: values.prompt,
    greeting: values.greeting || null,
    timeout_s: Number(values.timeout_s),
    max_retries: Number(values.max_retries),
    ...writeDestination(timeout, 'timeout'),
    options: options.map((o) => ({ digit: o.digit, ...writeDestination(o.dest, '') })) as unknown as PbxIvrOption[],
  });
  const saving = create.isPending || update.isPending;
  const set = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    form.clear(field);
  };

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
  const used = new Set(options.map((o) => o.digit));
  const nextKey = KEYS.find((k) => !used.has(k));
  const timeoutError = form.errors.timeout_extension || form.errors.timeout_ivr || form.errors.timeout_queue;

  return (
    <Modal isOpen onClose={onClose} title={row ? tr('pbxEditIvr') : tr('pbxAddIvr')} maxWidth="2xl">
      <form onSubmit={submit} className="space-y-5" noValidate>
        {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
        <FormSection title={tr('pbxIvrSectionGreeting')} first>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pbx-ivr-name" required>{tr('pbxIvrName')}</FieldLabel>
              <Input id="pbx-ivr-name" value={values.name} invalid={Boolean(form.errors.name)}
                onChange={(e) => set('name', e.target.value)} onBlur={() => form.blur('name', payload())} />
              <FieldError message={form.errors.name} />
            </div>
            <div>
              <FieldLabel htmlFor="pbx-ivr-prompt">{tr('pbxIvrPrompt')}</FieldLabel>
              <Select
                id="pbx-ivr-prompt"
                value={values.greeting ? `sound:${values.greeting}` : `prompt:${values.prompt}`}
                onChange={(e) => {
                  const choice = e.target.value;
                  const kind = choice.slice(0, choice.indexOf(':'));
                  const value = choice.slice(choice.indexOf(':') + 1);
                  setValues((prev) => (kind === 'sound' ? { ...prev, greeting: value } : { ...prev, greeting: '', prompt: value }));
                  form.clear('greeting');
                }}
              >
                <optgroup label={tr('pbxGreetingPlatform')}>
                  {PROMPTS.map((p) => <option key={p} value={`prompt:${p}`}>{tr(`pbxPrompt_${p.split('/')[1].replace(/-/g, '_')}`)}</option>)}
                </optgroup>
                {greetings.length ? (
                  <optgroup label={tr('pbxGreetingCustom')}>
                    {greetings.map((g) => <option key={g.id} value={`sound:${g.id}`}>{g.name}</option>)}
                  </optgroup>
                ) : null}
              </Select>
              <FieldError message={form.errors.greeting} />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pbx-ivr-timeout">{tr('pbxIvrTimeout')}</FieldLabel>
              <Input id="pbx-ivr-timeout" dir="ltr" inputMode="numeric" value={values.timeout_s} invalid={Boolean(form.errors.timeout_s)}
                onChange={(e) => set('timeout_s', e.target.value.replace(/[^0-9]/g, ''))} onBlur={() => form.blur('timeout_s', payload())} />
              <FieldError message={form.errors.timeout_s} />
            </div>
            <div>
              <FieldLabel htmlFor="pbx-ivr-retries">{tr('pbxIvrRetries')}</FieldLabel>
              <Input id="pbx-ivr-retries" dir="ltr" inputMode="numeric" value={values.max_retries} invalid={Boolean(form.errors.max_retries)}
                onChange={(e) => set('max_retries', e.target.value.replace(/[^0-9]/g, ''))} onBlur={() => form.blur('max_retries', payload())} />
              <FieldError message={form.errors.max_retries} />
            </div>
          </div>
        </FormSection>

        <FormSection title={tr('pbxIvrOptions')} titleId="pbx-ivr-keys-title" hint={tr('pbxIvrKeysHint')}>
          {options.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
              {tr('pbxIvrNoKeys')}
            </p>
          ) : (
            <>
              <div aria-hidden="true" className={`mb-1.5 hidden px-3 text-xs font-medium text-gray-500 sm:grid dark:text-gray-400 ${KEY_ROW_GRID}`}>
                <span className="text-center">{tr('pbxIvrKey')}</span>
                <div className="grid grid-cols-2 gap-2">
                  <span>{tr('pbxIvrGoesTo')}</span>
                  <span>{tr('pbxDestTarget')}</span>
                </div>
                <span />
              </div>
              <ul aria-labelledby="pbx-ivr-keys-title" className="space-y-2">
                {options.map((option, i) => (
                  <li key={i} className={`grid items-start rounded-lg border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-900/30 ${KEY_ROW_GRID}`}>
                    <Select
                      id={`pbx-ivr-option-${i}`}
                      className="text-center text-base font-semibold tabular-nums"
                      aria-label={tr('pbxIvrKey')}
                      value={option.digit}
                      onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, digit: e.target.value } : o)))}
                    >
                      {KEYS.filter((k) => k === option.digit || !used.has(k)).map((k) => <option key={k} value={k}>{k}</option>)}
                    </Select>
                    <DestinationPicker id={`pbx-ivr-option-${i}-dest`} value={option.dest} types={ALL} excludeIvr={row?.id}
                      className="grid min-w-0 gap-2 sm:grid-cols-2" showEmptyTarget
                      onChange={(dest) => { setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, dest } : o))); form.clear('options'); }} />
                    <IconButton icon={<TrashIcon className="h-4 w-4" />} label={`${tr('delete')} ${option.digit}`} tone="danger" size="md"
                      onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))} />
                  </li>
                ))}
              </ul>
            </>
          )}
          <Button type="button" variant="ghost" size="sm" className="mt-2" disabled={!nextKey}
            onClick={() => nextKey && setOptions((prev) => [...prev, { digit: nextKey, dest: { type: 'extension', extension: null, ivr: null, queue: null } }])}>
            <PlusIcon className="h-4 w-4" />
            {tr('pbxAddIvrOption')}
          </Button>
          <FieldError message={form.errors.options} />
        </FormSection>

        <FormSection title={tr('pbxIvrTimeoutDestination')} titleFor="pbx-ivr-timeout-dest" hint={tr('pbxIvrTimeoutHint')}>
          <DestinationPicker id="pbx-ivr-timeout-dest" value={timeout} types={ALL} excludeIvr={row?.id} error={timeoutError}
            onChange={(next) => { setTimeoutDest(next); form.setErrors({}); }} />
        </FormSection>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{tr('cancel')}</Button>
          <Button type="submit" loading={saving} loadingText={tr('saving')}>{tr('save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export const IvrMenusSection = () => {
  const tr = useTr();
  const { data: rows = [], isLoading } = usePbxRows<PbxIvrMenuRow>('ivr-menus');
  const { remove } = usePbxMutations<PbxIvrMenuRow>('ivr-menus');
  const confirmDelete = useConfirmDelete();
  const label = useDestinationLabel();
  const [editing, setEditing] = useState<PbxIvrMenuRow | 'new' | null>(null);

  return (
    <div>
      <SectionHeader
        title={tr('pbxIvrMenus')}
        hint={tr('pbxIvrMenusHint')}
        action={<Button onClick={() => setEditing('new')}><PlusIcon className="h-4 w-4" />{tr('pbxAddIvr')}</Button>}
      />
      <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
        <DataTable>
          <TableHead>
            <Th>{tr('pbxIvrName')}</Th>
            <Th>{tr('pbxIvrOptions')}</Th>
            <Th>{tr('pbxIvrTimeoutDestination')}</Th>
            <Th className="w-24">{tr('actions')}</Th>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableMessageRow colSpan={4}>{isLoading ? tr('loading') : tr('pbxNoIvrs')}</TableMessageRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <Td className="font-medium">{row.name}</Td>
                <Td>
                  <ul className="space-y-0.5">
                    {row.options.map((o) => (
                      <li key={o.digit}>
                        <span className="me-2 inline-flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-xs font-bold dark:bg-gray-800">{o.digit}</span>
                        {label(readDestination(o as unknown as Record<string, unknown>, '', 'extension'))}
                      </li>
                    ))}
                  </ul>
                </Td>
                <Td>{label(readDestination(row as unknown as Record<string, unknown>, 'timeout', 'hangup'))}</Td>
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
      {editing ? <IvrModal row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
};

// ---- queues ---------------------------------------------------------------------------------

const STRATEGIES: PbxQueueRow['strategy'][] = ['ringall', 'rrmemory', 'leastrecent', 'fewestcalls', 'random'];

const QueueModal = ({ row, onClose }: { row: PbxQueueRow | null; onClose: () => void }) => {
  const tr = useTr();
  const { extensions } = useDestinationTargets();
  const { create, update } = usePbxMutations<PbxQueueRow>('queues');
  const form = useCatalogForm('pbx_queue.upsert');
  const [values, setValues] = useState({
    name: row?.name ?? '',
    strategy: row?.strategy ?? 'ringall',
    member_timeout_s: String(row?.member_timeout_s ?? 20),
    max_wait_s: String(row?.max_wait_s ?? 300),
    wrapup_s: String(row?.wrapup_s ?? 0),
  });
  const [overflow, setOverflow] = useState(readDestination(row as unknown as Record<string, unknown>, 'overflow', 'hangup'));
  const [members, setMembers] = useState<{ extension: string; penalty: number }[]>(
    (row?.members ?? []).map((m) => ({ extension: m.extension, penalty: m.penalty })),
  );
  const payload = () => ({
    name: values.name.trim(),
    strategy: values.strategy,
    member_timeout_s: Number(values.member_timeout_s),
    max_wait_s: Number(values.max_wait_s),
    wrapup_s: Number(values.wrapup_s),
    ...writeDestination(overflow, 'overflow', false),
    members,
  });
  const saving = create.isPending || update.isPending;
  const set = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    form.clear(field);
  };
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
  const isMember = (id: string) => members.some((m) => m.extension === id);
  const toggleMember = (id: string) => {
    setMembers((prev) => (isMember(id) ? prev.filter((m) => m.extension !== id) : [...prev, { extension: id, penalty: 0 }]));
    form.clear('members');
  };
  const overflowError = form.errors.overflow_extension || form.errors.overflow_ivr || form.errors.overflow_type;
  const numberField = (field: 'member_timeout_s' | 'max_wait_s' | 'wrapup_s', label: string) => (
    <div className="flex flex-col">
      {/* Labels of different lengths still leave the three inputs on one line. */}
      <div className="flex flex-1 items-end"><FieldLabel htmlFor={`pbx-queue-${field}`}>{label}</FieldLabel></div>
      <Input id={`pbx-queue-${field}`} dir="ltr" inputMode="numeric" value={values[field]} invalid={Boolean(form.errors[field])}
        onChange={(e) => set(field, e.target.value.replace(/[^0-9]/g, ''))} onBlur={() => form.blur(field, payload())} />
      <FieldError message={form.errors[field]} />
    </div>
  );

  return (
    <Modal isOpen onClose={onClose} title={row ? tr('pbxEditQueue') : tr('pbxAddQueue')} maxWidth="2xl">
      <form onSubmit={submit} className="space-y-5" noValidate>
        {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="pbx-queue-name" required>{tr('pbxQueueName')}</FieldLabel>
            <Input id="pbx-queue-name" value={values.name} invalid={Boolean(form.errors.name)}
              onChange={(e) => set('name', e.target.value)} onBlur={() => form.blur('name', payload())} />
            <FieldError message={form.errors.name} />
          </div>
          <div>
            <FieldLabel htmlFor="pbx-queue-strategy">{tr('pbxQueueStrategy')}</FieldLabel>
            <Select id="pbx-queue-strategy" value={values.strategy} onChange={(e) => set('strategy', e.target.value)}>
              {STRATEGIES.map((s) => <option key={s} value={s}>{tr(`pbxStrategy_${s}`)}</option>)}
            </Select>
          </div>
        </div>

        <FormSection title={tr('pbxQueueSectionRinging')}>
          <div className="grid gap-4 sm:grid-cols-3">
            {numberField('member_timeout_s', tr('pbxQueueMemberTimeout'))}
            {numberField('max_wait_s', tr('pbxQueueMaxWait'))}
            {numberField('wrapup_s', tr('pbxQueueWrapup'))}
          </div>
        </FormSection>

        {/* The legend is visually hidden: a styled legend would sit on the fieldset's top border. */}
        <fieldset className="min-w-0 border-t border-gray-200 pt-5 dark:border-gray-700" aria-describedby="pbx-queue-members-hint">
          <legend className="sr-only">{tr('pbxQueueMembers')}</legend>
          <div className="mb-3">
            <p aria-hidden="true" className="text-base font-semibold text-gray-900 dark:text-gray-100">{tr('pbxQueueMembers')}</p>
            <p id="pbx-queue-members-hint" className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{tr('pbxQueueMembersHint')}</p>
          </div>
          {extensions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
              {tr('pbxNoExtensions')}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <div aria-hidden="true" className="flex items-center justify-between gap-3 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                <span>{tr('pbxQueueAgent')}</span>
                <span className="w-36 text-center">{tr('pbxQueuePenalty')}</span>
              </div>
              <ul className="max-h-72 divide-y divide-gray-200 overflow-y-auto dark:divide-gray-700">
                {extensions.map((ext) => {
                  const member = members.find((m) => m.extension === ext.id);
                  return (
                    <li key={ext.id} className={`flex min-h-[3.5rem] items-center gap-3 px-3 py-2 transition-colors ${member ? 'bg-primary/5' : ''}`}>
                      <input
                        id={`pbx-queue-member-${ext.id}`}
                        type="checkbox"
                        checked={Boolean(member)}
                        onChange={() => toggleMember(ext.id)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
                      />
                      <label htmlFor={`pbx-queue-member-${ext.id}`} className="flex min-w-0 flex-1 cursor-pointer items-baseline gap-2 text-sm">
                        <span dir="ltr" className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{ext.number}</span>
                        {ext.display_name ? <span dir="auto" className="truncate text-gray-600 dark:text-gray-300">{ext.display_name}</span> : null}
                      </label>
                      {member ? (
                        <Select
                          className="!w-36 shrink-0"
                          aria-label={`${tr('pbxQueuePenalty')} ${ext.number}`}
                          value={String(member.penalty)}
                          onChange={(e) => setMembers((prev) => prev.map((m) => (m.extension === ext.id ? { ...m, penalty: Number(e.target.value) } : m)))}
                        >
                          {Array.from({ length: 11 }, (_, n) => (
                            <option key={n} value={n}>
                              {n === 0 ? `0 · ${tr('pbxQueuePenaltyFirst')}` : n === 10 ? `10 · ${tr('pbxQueuePenaltyLast')}` : n}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span aria-hidden="true" className="w-36 shrink-0 text-center text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <FieldError message={form.errors.members} />
        </fieldset>

        <FormSection title={tr('pbxQueueOverflow')} titleFor="pbx-queue-overflow" hint={tr('pbxQueueOverflowHint')}>
          <DestinationPicker id="pbx-queue-overflow" value={overflow} types={['extension', 'ivr', 'hangup']} error={overflowError}
            onChange={(next) => { setOverflow(next); form.setErrors({}); }} />
        </FormSection>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{tr('cancel')}</Button>
          <Button type="submit" loading={saving} loadingText={tr('saving')}>{tr('save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export const QueuesSection = () => {
  const tr = useTr();
  const { data: rows = [], isLoading } = usePbxRows<PbxQueueRow>('queues');
  const { remove } = usePbxMutations<PbxQueueRow>('queues');
  const confirmDelete = useConfirmDelete();
  const label = useDestinationLabel();
  const [editing, setEditing] = useState<PbxQueueRow | 'new' | null>(null);

  return (
    <div>
      <SectionHeader
        title={tr('pbxQueues')}
        hint={tr('pbxQueuesHint')}
        action={<Button onClick={() => setEditing('new')}><PlusIcon className="h-4 w-4" />{tr('pbxAddQueue')}</Button>}
      />
      <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
        <DataTable>
          <TableHead>
            <Th>{tr('pbxQueueName')}</Th>
            <Th>{tr('pbxQueueStrategy')}</Th>
            <Th>{tr('pbxQueueMembers')}</Th>
            <Th>{tr('pbxQueueOverflow')}</Th>
            <Th className="w-24">{tr('actions')}</Th>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableMessageRow colSpan={5}>{isLoading ? tr('loading') : tr('pbxNoQueues')}</TableMessageRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <Td className="font-medium">{row.name}</Td>
                <Td>{tr(`pbxStrategy_${row.strategy}`)}</Td>
                <Td><span dir="ltr">{row.members.map((m) => m.number).join(', ') || '—'}</span></Td>
                <Td>{label(readDestination(row as unknown as Record<string, unknown>, 'overflow', 'hangup'))}</Td>
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
      {editing ? <QueueModal row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
};
