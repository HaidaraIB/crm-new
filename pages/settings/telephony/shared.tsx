/**
 * Building blocks for Settings > Phone System (Loop Cloud PBX).
 *
 * - Data: one query per resource under ['telephony', 'settings', <resource>];
 *   every change invalidates them all (a route, menu or queue can point at any
 *   other row) plus the provisioning status, since each change recompiles.
 * - Forms: the catalog is the only rule source (forms-validation rule):
 *   useCatalogForm runs catalogFieldErrors on submit and on blur and maps server
 *   field codes with serverFieldErrors.
 * - Destinations are typed (extension / IVR menu / queue / hang up), mirroring
 *   telephony.models.DestinationType.
 */
import React, { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppContext } from '../../../context/AppContext';
import { catalogFieldErrors, serverFieldErrors } from '../../../forms';
import { Select } from '../../../components/Select';
import {
  createPbxResourceAPI,
  deletePbxResourceAPI,
  listPbxResourceAPI,
  updatePbxResourceAPI,
  type PbxDestinationType,
  type PbxExtensionRow,
  type PbxIvrMenuRow,
  type PbxQueueRow,
  type PbxResource,
} from '../../../services/api';

export const TELEPHONY_SETTINGS_KEY = ['telephony', 'settings'] as const;

export function useTr() {
  const { t } = useAppContext();
  return useCallback((key: string) => (t as (k: string) => string)(key), [t]);
}

export function usePbxRows<T>(resource: PbxResource, enabled = true, refetchInterval?: (rows: T[] | undefined) => number | false) {
  return useQuery({
    queryKey: [...TELEPHONY_SETTINGS_KEY, resource],
    queryFn: () => listPbxResourceAPI<T>(resource),
    enabled,
    refetchInterval: refetchInterval ? (query) => refetchInterval(query.state.data as T[] | undefined) : undefined,
  });
}

export function usePbxMutations<T>(resource: PbxResource) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: TELEPHONY_SETTINGS_KEY });
    void queryClient.invalidateQueries({ queryKey: ['telephony', 'status'] });
  };
  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => createPbxResourceAPI<T>(resource, data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updatePbxResourceAPI<T>(resource, id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deletePbxResourceAPI(resource, id),
    onSuccess: invalidate,
  });
  return { create, update, remove, invalidate };
}

/** Inline field errors from the validation catalog (client) and from the API (server). */
export function useCatalogForm(formId: string) {
  const { t } = useAppContext();
  const translate = useCallback(
    (key: string) => {
      const value = (t as (k: string) => string)(key);
      return value && value !== key ? value : undefined;
    },
    [t],
  ) as (key: string) => string;
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (values: Record<string, unknown>): boolean => {
    const next = catalogFieldErrors(formId, values, translate);
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const blur = (field: string, values: Record<string, unknown>) => {
    const next = catalogFieldErrors(formId, values, translate);
    setErrors((prev) => {
      const updated = { ...prev };
      if (next[field]) updated[field] = next[field];
      else delete updated[field];
      return updated;
    });
  };
  const clear = (field: string) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  /** Map an API error onto fields; returns false when nothing field-level came back. */
  const fromServer = (error: unknown, fallback: string): void => {
    const mapped = serverFieldErrors(error, formId, translate);
    // Nested serializer errors (options.digit, members.extension) belong to their list.
    const flattened: Record<string, string> = {};
    for (const [key, message] of Object.entries(mapped)) flattened[key.split('.')[0]] = message;
    if (Object.keys(flattened).length) {
      setErrors((prev) => ({ ...prev, ...flattened }));
      return;
    }
    // A coded refusal (e.g. too_many_sounds) has a localized message; else the server's.
    const code = (error as { code?: string })?.code;
    const localized = code ? translate(`pbxErr_${code}`) : undefined;
    setErrors({ _general: localized || (error as { message?: string })?.message || fallback });
  };
  return { errors, setErrors, validate, blur, clear, fromServer };
}

export const FieldLabel = ({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) => (
  <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
    {children}
    {required ? <span className="text-red-500"> *</span> : null}
  </label>
);

export const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  ) : null;

export const SectionHeader = ({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) => (
  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {hint ? <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{hint}</p> : null}
    </div>
    {action}
  </div>
);

export const TH = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
  <th className={`px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 ${className}`}>
    {children}
  </th>
);

export const TD = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 text-sm text-gray-800 dark:text-gray-200 ${className}`}>{children}</td>
);

export const EmptyRow = ({ colSpan, text }: { colSpan: number; text: string }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      {text}
    </td>
  </tr>
);

export const Badge = ({ tone, children }: { tone: 'green' | 'amber' | 'gray' | 'red'; children: React.ReactNode }) => {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    red: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
};

// ---- destinations -----------------------------------------------------------------------

export type Destination = { type: PbxDestinationType; extension: string | null; ivr: string | null; queue: string | null };

/** Read a destination from a row: prefix "" uses destination_type/extension/ivr/queue. */
export function readDestination(row: Record<string, unknown> | null | undefined, prefix: string, fallback: PbxDestinationType): Destination {
  const key = (k: string) => (prefix ? `${prefix}_${k}` : k);
  const type = (row?.[prefix ? `${prefix}_type` : 'destination_type'] as PbxDestinationType) || fallback;
  return {
    type,
    extension: (row?.[key('extension')] as string | null) ?? null,
    ivr: (row?.[key('ivr')] as string | null) ?? null,
    queue: (row?.[key('queue')] as string | null) ?? null,
  };
}

/** The API shape for a destination: only the target the type needs. */
export function writeDestination(dest: Destination, prefix: string, withQueue = true): Record<string, unknown> {
  const key = (k: string) => (prefix ? `${prefix}_${k}` : k);
  const out: Record<string, unknown> = {
    [prefix ? `${prefix}_type` : 'destination_type']: dest.type,
    [key('extension')]: dest.type === 'extension' ? dest.extension : null,
    [key('ivr')]: dest.type === 'ivr' ? dest.ivr : null,
  };
  if (withQueue) out[key('queue')] = dest.type === 'queue' ? dest.queue : null;
  return out;
}

export function useDestinationTargets(enabled = true) {
  const extensions = usePbxRows<PbxExtensionRow>('extensions', enabled);
  const ivrs = usePbxRows<PbxIvrMenuRow>('ivr-menus', enabled);
  const queues = usePbxRows<PbxQueueRow>('queues', enabled);
  return { extensions: extensions.data || [], ivrs: ivrs.data || [], queues: queues.data || [] };
}

export function useDestinationLabel() {
  const tr = useTr();
  const { extensions, ivrs, queues } = useDestinationTargets();
  return (dest: Destination): string => {
    if (dest.type === 'hangup') return tr('pbxDestHangup');
    if (dest.type === 'extension') {
      const ext = extensions.find((e) => e.id === dest.extension);
      return ext ? `${tr('pbxDestExtension')} ${ext.number}${ext.display_name ? ` · ${ext.display_name}` : ''}` : '—';
    }
    if (dest.type === 'ivr') return `${tr('pbxDestIvr')} · ${ivrs.find((m) => m.id === dest.ivr)?.name ?? '—'}`;
    return `${tr('pbxDestQueue')} · ${queues.find((q) => q.id === dest.queue)?.name ?? '—'}`;
  };
}

export const DestinationPicker = ({
  id,
  value,
  onChange,
  types,
  error,
  excludeIvr,
}: {
  id: string;
  value: Destination;
  onChange: (next: Destination) => void;
  types: PbxDestinationType[];
  error?: string;
  /** A menu never offers itself as a target. */
  excludeIvr?: string;
}) => {
  const tr = useTr();
  const { extensions, ivrs, queues } = useDestinationTargets();
  const labels: Record<PbxDestinationType, string> = {
    extension: tr('pbxDestExtension'),
    ivr: tr('pbxDestIvr'),
    queue: tr('pbxDestQueue'),
    hangup: tr('pbxDestHangup'),
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Select
        id={id}
        value={value.type}
        aria-label={tr('pbxDestination')}
        onChange={(e) => onChange({ ...value, type: e.target.value as PbxDestinationType })}
      >
        {types.map((type) => (
          <option key={type} value={type}>
            {labels[type]}
          </option>
        ))}
      </Select>
      {value.type === 'extension' ? (
        <Select
          id={`${id}-target`}
          aria-label={tr('pbxDestExtension')}
          invalid={Boolean(error)}
          value={value.extension ?? ''}
          onChange={(e) => onChange({ ...value, extension: e.target.value || null })}
        >
          <option value="">{tr('pbxChoose')}</option>
          {extensions.map((ext) => (
            <option key={ext.id} value={ext.id}>
              {ext.number}
              {ext.display_name ? ` · ${ext.display_name}` : ''}
            </option>
          ))}
        </Select>
      ) : null}
      {value.type === 'ivr' ? (
        <Select
          id={`${id}-target`}
          aria-label={tr('pbxDestIvr')}
          invalid={Boolean(error)}
          value={value.ivr ?? ''}
          onChange={(e) => onChange({ ...value, ivr: e.target.value || null })}
        >
          <option value="">{tr('pbxChoose')}</option>
          {ivrs.filter((m) => m.id !== excludeIvr).map((menu) => (
            <option key={menu.id} value={menu.id}>
              {menu.name}
            </option>
          ))}
        </Select>
      ) : null}
      {value.type === 'queue' ? (
        <Select
          id={`${id}-target`}
          aria-label={tr('pbxDestQueue')}
          invalid={Boolean(error)}
          value={value.queue ?? ''}
          onChange={(e) => onChange({ ...value, queue: e.target.value || null })}
        >
          <option value="">{tr('pbxChoose')}</option>
          {queues.map((queue) => (
            <option key={queue.id} value={queue.id}>
              {queue.name}
            </option>
          ))}
        </Select>
      ) : null}
      <div className="sm:col-span-2">
        <FieldError message={error} />
      </div>
    </div>
  );
};

/** Ask before deleting through the shared ConfirmDeleteModal; a 409 in_use shows its message there. */
export function useConfirmDelete() {
  const { setConfirmDeleteConfig, setIsConfirmDeleteModalOpen } = useAppContext();
  const tr = useTr();
  return (itemName: string, onConfirm: () => Promise<void>) => {
    setConfirmDeleteConfig({
      title: tr('pbxDeleteTitle'),
      message: tr('pbxDeleteMessage'),
      itemName,
      onConfirm,
    });
    setIsConfirmDeleteModalOpen(true);
  };
}
