import React, { useCallback, useEffect, useState } from 'react';
import { RefreshButton } from '../index';
import {
  getWhatsAppCallHoursAPI,
  updateWhatsAppCallHoursAPI,
  resolveLocalizedApiError,
  type WhatsAppCallHoursConfig,
  type WhatsAppCallHoursDay,
} from '../../services/api';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

type Props = {
  t: (key: any) => string;
  canManage: boolean;
};

const COMMON_TIMEZONES = [
  'Asia/Baghdad',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Africa/Cairo',
  'Europe/Istanbul',
  'UTC',
];

function dayLabel(day: string, t: (k: any) => string): string {
  const key = `weekday_${day}`;
  const translated = t(key);
  return translated === key ? day.charAt(0).toUpperCase() + day.slice(1) : translated;
}

/**
 * Weekly WhatsApp call hours + out-of-hours customer message.
 */
export const WhatsAppCallHoursPanel: React.FC<Props> = ({ t, canManage }) => {
  const [config, setConfig] = useState<WhatsAppCallHoursConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await getWhatsAppCallHoursAPI();
        setConfig(data);
      } catch (e: any) {
        setConfig(null);
        setError(
          resolveLocalizedApiError(e, t, t('whatsappCallHoursLoadFailed'))
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const updateDay = (day: string, patch: Partial<WhatsAppCallHoursDay>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const cur = prev.weekly[day] || { closed: true, open: '09:00', close: '17:00' };
      return {
        ...prev,
        weekly: { ...prev.weekly, [day]: { ...cur, ...patch } },
      };
    });
    setSaved(false);
  };

  const save = async () => {
    if (!config || !canManage) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateWhatsAppCallHoursAPI({
        enabled: config.enabled,
        timezone: config.timezone,
        weekly: config.weekly,
        out_of_hours_message: config.out_of_hours_message,
        sync_meta: true,
        whatsapp_account_id: config.whatsapp_account_id,
      });
      setConfig(updated);
      setSaved(true);
      if (updated.meta_sync_error) {
        setError(
          resolveLocalizedApiError(
            { message: updated.meta_sync_error, code: updated.meta_sync_error },
            t,
            updated.meta_sync_error
          )
        );
      }
    } catch (e: any) {
      setError(resolveLocalizedApiError(e, t, t('whatsappCallHoursSaveFailed')));
    } finally {
      setBusy(false);
    }
  };

  if (!config) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/80">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {t('whatsappCallHoursTitle')}
          </h2>
          <RefreshButton
            iconOnly
            loading={refreshing || loading}
            onClick={() => void load({ silent: true })}
            className="shrink-0 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error || (loading ? t('loading') : t('whatsappCallHoursLoadFailed'))}
        </p>
        {error ? (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {t('whatsappCallHoursConnectHint')}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/80">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {t('whatsappCallHoursTitle')}
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('whatsappCallHoursHint')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton
            iconOnly
            loading={refreshing}
            disabled={busy}
            onClick={() => void load({ silent: true })}
            className="shrink-0 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          />
          <label className="inline-flex cursor-pointer items-center gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {config.enabled ? t('enabled') : t('disabled')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={config.enabled}
              disabled={!canManage || busy}
              onClick={() => {
                setConfig((p) => (p ? { ...p, enabled: !p.enabled } : p));
                setSaved(false);
              }}
              className={`relative h-6 w-11 rounded-full transition ${
                config.enabled ? 'bg-sky-500' : 'bg-gray-300 dark:bg-gray-600'
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${
                  config.enabled ? 'start-5' : 'start-0.5'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <label className="mb-3 block text-xs font-medium text-gray-600 dark:text-gray-300">
        {t('timezone')}
        <select
          disabled={!canManage || busy}
          value={config.timezone || 'UTC'}
          onChange={(e) => {
            setConfig((p) => (p ? { ...p, timezone: e.target.value } : p));
            setSaved(false);
          }}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
        >
          {!COMMON_TIMEZONES.includes(config.timezone) && config.timezone ? (
            <option value={config.timezone}>{config.timezone}</option>
          ) : null}
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </label>

      <ul className="space-y-2">
        {DAYS.map((day) => {
          const entry = config.weekly[day] || {
            closed: true,
            open: '09:00',
            close: '17:00',
          };
          return (
            <li
              key={day}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 px-2 py-2 dark:border-gray-800"
            >
              <span className="w-24 shrink-0 text-sm font-medium text-gray-800 dark:text-gray-100">
                {dayLabel(day, t)}
              </span>
              <select
                disabled={!canManage || busy}
                value={entry.closed ? 'closed' : 'open'}
                onChange={(e) => updateDay(day, { closed: e.target.value === 'closed' })}
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="closed">{t('whatsappCallHoursClosed')}</option>
                <option value="open">{t('whatsappCallHoursOpen')}</option>
              </select>
              {!entry.closed ? (
                <>
                  <input
                    type="time"
                    disabled={!canManage || busy}
                    value={entry.open}
                    onChange={(e) => updateDay(day, { open: e.target.value })}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                  />
                  <span className="text-xs text-gray-400">–</span>
                  <input
                    type="time"
                    disabled={!canManage || busy}
                    value={entry.close}
                    onChange={(e) => updateDay(day, { close: e.target.value })}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                  />
                </>
              ) : null}
            </li>
          );
        })}
      </ul>

      <label className="mt-4 block text-xs font-medium text-gray-600 dark:text-gray-300">
        {t('whatsappOutOfHoursMessage')}
        <textarea
          disabled={!canManage || busy}
          rows={3}
          value={config.out_of_hours_message}
          placeholder={config.default_out_of_hours_message}
          onChange={(e) => {
            setConfig((p) => (p ? { ...p, out_of_hours_message: e.target.value } : p));
            setSaved(false);
          }}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
        />
      </label>

      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {saved && !error ? (
        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{t('saved')}</p>
      ) : null}

      {canManage ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {busy ? t('saving') : t('save')}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-500">{t('whatsappCallHoursReadOnly')}</p>
      )}
    </section>
  );
};
