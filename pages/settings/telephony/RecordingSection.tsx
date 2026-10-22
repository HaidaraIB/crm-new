/**
 * Call recording (contract section 7). Off by default. Turning it on needs the
 * admin's attestation that the company may record and informs callers; the API
 * stores who attested and when (accept_recording_terms), and audits every change.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { Select } from '../../../components/Select';
import { useAppContext } from '../../../context/AppContext';
import {
  getTelephonySettingsAPI,
  updateTelephonySettingsAPI,
  type TelephonySettings,
} from '../../../services/api';
import { Input } from '../../../components/Input';
import { FieldError, FieldLabel, SectionHeader, useCatalogForm, useTr } from './shared';

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

/** Stored recordings against the plan's storage. */
const StorageMeter = ({ used, limit }: { used: number; limit: number | null }) => {
  const tr = useTr();
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{tr('pbxRecordingStorage')}</span>
        <span dir="ltr" className="tabular-nums text-gray-600 dark:text-gray-400">
          {formatBytes(used)}{limit ? ` / ${formatBytes(limit)}` : ''}
        </span>
      </div>
      {limit ? (
        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" role="progressbar" aria-valuenow={pct}
          aria-valuemin={0} aria-valuemax={100} aria-label={tr('pbxRecordingStorage')}>
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
};

export const RecordingSection = () => {
  const tr = useTr();
  const { showToast, language } = useAppContext();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['telephony', 'settings', 'recording'], queryFn: getTelephonySettingsAPI });
  const form = useCatalogForm('pbx_settings.update');
  const [mode, setMode] = useState<TelephonySettings['recording_mode']>('off');
  const [notice, setNotice] = useState<TelephonySettings['recording_notice']>('ar_en');
  const [accept, setAccept] = useState(false);
  const [retention, setRetention] = useState('90');
  const [saving, setSaving] = useState(false);

  // Re-sync the fields only when the saved values change, so a background refetch
  // (the telephony sync slice) does not wipe what the user is typing.
  const synced = useRef('');
  useEffect(() => {
    if (!settings.data) return;
    const key = [settings.data.recording_mode, settings.data.recording_notice, settings.data.recording_retention_days].join('|');
    if (key === synced.current) return;
    synced.current = key;
    setMode(settings.data.recording_mode);
    setNotice(settings.data.recording_notice);
    setRetention(String(settings.data.recording_retention_days));
    setAccept(false);
  }, [settings.data]);

  const current = settings.data;
  // The platform's legal gate: until it opens, recording can only stay (or be turned) off.
  const unavailable = current?.recording_available === false;
  const turningOn = Boolean(current) && current?.recording_mode === 'off' && mode !== 'off';
  const dirty = Boolean(current) && (mode !== current?.recording_mode || notice !== current?.recording_notice
    || Number(retention) !== current?.recording_retention_days);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      recording_mode: mode, recording_notice: notice, accept_recording_terms: accept,
      recording_retention_days: Number(retention),
    };
    if (!form.validate(data)) return;
    if (turningOn && !accept) {
      form.setErrors({ accept_recording_terms: tr('pbxRecordingTermsRequired') });
      return;
    }
    setSaving(true);
    try {
      const saved = await updateTelephonySettingsAPI(data);
      queryClient.setQueryData(['telephony', 'settings', 'recording'], saved);
      void queryClient.invalidateQueries({ queryKey: ['telephony', 'status'] });
      void queryClient.invalidateQueries({ queryKey: ['telephony', 'me'] });
      showToast(tr('pbxRecordingSaved'), { variant: 'success' });
    } catch (error) {
      form.fromServer(error, tr('pbxSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-2xl space-y-4" noValidate>
      <SectionHeader title={tr('pbxRecording')} hint={tr('pbxRecordingHint')} />
      {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
      {current?.recording_paused_quota ? <Alert variant="warning">{tr('pbxRecordingPausedQuota')}</Alert> : null}
      {current?.recording_legal_hold ? <Alert variant="info">{tr('pbxRecordingLegalHold')}</Alert> : null}
      {unavailable ? <Alert variant="info">{tr('pbxRecordingGated')}</Alert> : null}
      <div>
        <FieldLabel htmlFor="pbx-rec-mode">{tr('pbxRecordingMode')}</FieldLabel>
        <Select id="pbx-rec-mode" value={mode} disabled={!current}
          onChange={(e) => { setMode(e.target.value as TelephonySettings['recording_mode']); form.setErrors({}); }}>
          <option value="off">{tr('pbxRecordingMode_off')}</option>
          <option value="external" disabled={unavailable}>{tr('pbxRecordingMode_external')}</option>
          <option value="all" disabled={unavailable}>{tr('pbxRecordingMode_all')}</option>
        </Select>
        <FieldError message={form.errors.recording_mode} />
      </div>
      <div>
        <FieldLabel htmlFor="pbx-rec-notice">{tr('pbxRecordingNotice')}</FieldLabel>
        <Select id="pbx-rec-notice" value={notice} disabled={!current || mode === 'off'}
          onChange={(e) => setNotice(e.target.value as TelephonySettings['recording_notice'])}>
          <option value="ar_en">{tr('pbxRecordingNotice_ar_en')}</option>
          <option value="ar">{tr('pbxRecordingNotice_ar')}</option>
          <option value="en">{tr('pbxRecordingNotice_en')}</option>
          <option value="none">{tr('pbxRecordingNotice_none')}</option>
        </Select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tr('pbxRecordingNoticeHint')}</p>
      </div>
      {turningOn ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
          <div className="flex items-start gap-2">
            <input
              id="pbx-rec-terms"
              type="checkbox"
              checked={accept}
              onChange={(e) => { setAccept(e.target.checked); form.clear('accept_recording_terms'); }}
              className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
            />
            <label htmlFor="pbx-rec-terms" className="text-sm text-amber-900 dark:text-amber-100">{tr('pbxRecordingTerms')}</label>
          </div>
          <FieldError message={form.errors.accept_recording_terms} />
        </div>
      ) : null}
      <div>
        <FieldLabel htmlFor="pbx-rec-retention">{tr('pbxRecordingRetention')}</FieldLabel>
        <Input id="pbx-rec-retention" dir="ltr" inputMode="numeric" className="!w-40" value={retention} disabled={!current}
          invalid={Boolean(form.errors.recording_retention_days)}
          onChange={(e) => { setRetention(e.target.value.replace(/[^0-9]/g, '')); form.clear('recording_retention_days'); }}
          onBlur={() => form.blur('recording_retention_days', { recording_retention_days: Number(retention) })} />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tr('pbxRecordingRetentionHint')}</p>
        <FieldError message={form.errors.recording_retention_days} />
      </div>
      {current ? <StorageMeter used={current.recording_bytes_used} limit={current.recording_bytes_limit} /> : null}
      {current?.recording_accepted_at ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {tr('pbxRecordingAcceptedAt')}{' '}
          {new Date(current.recording_accepted_at).toLocaleString(language === 'ar' ? 'ar' : 'en')}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" loading={saving} loadingText={tr('saving')} disabled={!dirty}>{tr('save')}</Button>
      </div>
    </form>
  );
};
