import React, { useMemo, useState } from 'react';

import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { TableHorizontalScroll } from '../../../components/TableHorizontalScroll';
import { DataTable, TableActions, TableBody, TableHead, TableMessageRow, TableRow, Td, Th } from '../../../components/DataTable';
import { EditIcon, PlusIcon, TrashIcon, XIcon } from '../../../components/icons';
import { useAppContext } from '../../../context/AppContext';
import type { PbxBusinessHoursRow, PbxHoursRule } from '../../../services/api';
import {
  FieldError,
  FieldLabel,
  SectionHeader,
  useCatalogForm,
  useConfirmDelete,
  usePbxMutations,
  usePbxRows,
  useTr,
} from './shared';

const DAYS = [0, 1, 2, 3, 4, 5, 6]; // Monday .. Sunday, as the API stores them

/** Short weekday names in the UI language; 2024-01-01 was a Monday. */
function useWeekdayNames(): string[] {
  const { language } = useAppContext();
  return useMemo(() => {
    const fmt = new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', { weekday: 'short', timeZone: 'UTC' });
    return DAYS.map((d) => fmt.format(new Date(Date.UTC(2024, 0, 1 + d))));
  }, [language]);
}

function timezones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  return intl.supportedValuesOf ? intl.supportedValuesOf('timeZone') : ['Asia/Baghdad', 'UTC'];
}

export function describeRules(rules: PbxHoursRule[], names: string[]): string {
  return rules.map((r) => `${r.days.map((d) => names[d]).join(' ')} ${r.start}–${r.end}`).join(' · ');
}

const HoursModal = ({ row, onClose }: { row: PbxBusinessHoursRow | null; onClose: () => void }) => {
  const tr = useTr();
  const names = useWeekdayNames();
  const { create, update } = usePbxMutations<PbxBusinessHoursRow>('business-hours');
  const form = useCatalogForm('pbx_business_hours.upsert');
  const [name, setName] = useState(row?.name ?? '');
  const [timezone, setTimezone] = useState(row?.timezone ?? 'Asia/Baghdad');
  const [rules, setRules] = useState<PbxHoursRule[]>(row?.rules ?? [{ days: [6, 0, 1, 2, 3], start: '09:00', end: '17:00' }]);
  const [closedDates, setClosedDates] = useState<string[]>(row?.closed_dates ?? []);
  const [newDate, setNewDate] = useState('');
  const zones = useMemo(timezones, []);
  const payload = () => ({ name: name.trim(), timezone: timezone.trim(), rules, closed_dates: closedDates });
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
  const setRule = (i: number, patch: Partial<PbxHoursRule>) => {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    form.clear('rules');
  };
  const toggleDay = (i: number, day: number) => {
    const days = rules[i].days.includes(day) ? rules[i].days.filter((d) => d !== day) : [...rules[i].days, day].sort();
    setRule(i, { days });
  };

  return (
    <Modal isOpen onClose={onClose} title={row ? tr('pbxEditHours') : tr('pbxAddHours')} maxWidth="2xl">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="pbx-hours-name" required>{tr('pbxHoursName')}</FieldLabel>
            <Input id="pbx-hours-name" value={name} invalid={Boolean(form.errors.name)}
              onChange={(e) => { setName(e.target.value); form.clear('name'); }} onBlur={() => form.blur('name', payload())} />
            <FieldError message={form.errors.name} />
          </div>
          <div>
            <FieldLabel htmlFor="pbx-hours-tz" required>{tr('pbxTimezone')}</FieldLabel>
            <Input id="pbx-hours-tz" dir="ltr" list="pbx-timezones" value={timezone} invalid={Boolean(form.errors.timezone)}
              onChange={(e) => { setTimezone(e.target.value); form.clear('timezone'); }} onBlur={() => form.blur('timezone', payload())} />
            <datalist id="pbx-timezones">
              {zones.map((z) => <option key={z} value={z} />)}
            </datalist>
            <FieldError message={form.errors.timezone} />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="pbx-hours-rule-0" required>{tr('pbxHoursRules')}</FieldLabel>
          <div className="space-y-3">
            {rules.map((rule, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                <div className="flex flex-wrap gap-1" role="group" aria-label={tr('pbxHoursDays')}>
                  {DAYS.map((day) => {
                    const on = rule.days.includes(day);
                    return (
                      <button
                        key={day}
                        id={day === 0 ? `pbx-hours-rule-${i}` : undefined}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleDay(i, day)}
                        className={`h-8 min-w-[2.75rem] rounded-md px-2 text-xs font-semibold transition-colors ${
                          on ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {names[day]}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1" dir="ltr">
                  <Input type="time" className="w-28" aria-label={tr('pbxHoursStart')} value={rule.start}
                    onChange={(e) => setRule(i, { start: e.target.value })} />
                  <span className="text-gray-500">–</span>
                  <Input type="time" className="w-28" aria-label={tr('pbxHoursEnd')} value={rule.end}
                    onChange={(e) => setRule(i, { end: e.target.value })} />
                </div>
                <IconButton icon={<TrashIcon className="h-4 w-4" />} label={tr('delete')} tone="danger" disabled={rules.length === 1}
                  onClick={() => setRules((prev) => prev.filter((_, idx) => idx !== i))} />
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2" disabled={rules.length >= 14}
            onClick={() => setRules((prev) => [...prev, { days: [4], start: '10:00', end: '14:00' }])}>
            <PlusIcon className="h-4 w-4" />
            {tr('pbxAddOpeningPeriod')}
          </Button>
          <FieldError message={form.errors.rules} />
        </div>
        <div>
          <FieldLabel htmlFor="pbx-hours-closed">{tr('pbxClosedDates')}</FieldLabel>
          <div className="flex gap-2">
            <Input id="pbx-hours-closed" type="date" dir="ltr" className="w-44" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <Button type="button" variant="secondary" disabled={!newDate || closedDates.includes(newDate)}
              onClick={() => { setClosedDates((prev) => [...prev, newDate].sort()); setNewDate(''); form.clear('closed_dates'); }}>
              {tr('pbxAddClosedDate')}
            </Button>
          </div>
          {closedDates.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {closedDates.map((d) => (
                <li key={d} className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-0.5 ps-3 pe-1 text-xs dark:bg-gray-800">
                  <span dir="ltr">{d}</span>
                  <IconButton icon={<XIcon className="h-3.5 w-3.5" />} label={tr('delete')} className="!h-6 !w-6"
                    onClick={() => setClosedDates((prev) => prev.filter((x) => x !== d))} />
                </li>
              ))}
            </ul>
          ) : null}
          <FieldError message={form.errors.closed_dates} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{tr('cancel')}</Button>
          <Button type="submit" loading={saving} loadingText={tr('saving')}>{tr('save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export const BusinessHoursSection = () => {
  const tr = useTr();
  const names = useWeekdayNames();
  const { data: rows = [], isLoading } = usePbxRows<PbxBusinessHoursRow>('business-hours');
  const { remove } = usePbxMutations<PbxBusinessHoursRow>('business-hours');
  const confirmDelete = useConfirmDelete();
  const [editing, setEditing] = useState<PbxBusinessHoursRow | 'new' | null>(null);

  return (
    <div>
      <SectionHeader
        title={tr('pbxBusinessHours')}
        hint={tr('pbxBusinessHoursHint')}
        action={<Button onClick={() => setEditing('new')}><PlusIcon className="h-4 w-4" />{tr('pbxAddHours')}</Button>}
      />
      <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
        <DataTable>
          <TableHead>
            <Th>{tr('pbxHoursName')}</Th>
            <Th>{tr('pbxHoursRules')}</Th>
            <Th>{tr('pbxTimezone')}</Th>
            <Th>{tr('pbxClosedDates')}</Th>
            <Th className="w-24">{tr('actions')}</Th>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableMessageRow colSpan={5}>{isLoading ? tr('loading') : tr('pbxNoHours')}</TableMessageRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <Td className="font-medium">{row.name}</Td>
                <Td>{describeRules(row.rules, names)}</Td>
                <Td><span dir="ltr">{row.timezone}</span></Td>
                <Td>{row.closed_dates.length || '—'}</Td>
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
      {editing ? <HoursModal row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
};
