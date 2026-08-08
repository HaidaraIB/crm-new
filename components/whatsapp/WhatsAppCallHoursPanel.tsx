import React, { useCallback, useEffect, useState } from 'react';
import { Button, RefreshButton } from '../index';
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

/** Matches shared `Input` / settings form fields. */
const fieldClass =
  'w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60';

const fieldClassSm =
  'px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60';

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
      <div className="rounded-xl border border-gray-200/90 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/80 dark:shadow-none">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {t('whatsappCallHoursTitle')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {error || (loading ? t('loading') : t('whatsappCallHoursLoadFailed'))}
            </p>
          </div>
          <RefreshButton
            iconOnly
            loading={refreshing || loading}
            onClick={() => void load({ silent: true })}
            className="shrink-0 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          />
        </div>
        {error ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('whatsappCallHoursConnectHint')}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/80 dark:shadow-none">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            {t('whatsappCallHoursTitle')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('whatsappCallHoursHint')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton
            iconOnly
            loading={refreshing}
            disabled={busy}
            onClick={() => void load({ silent: true })}
            className="shrink-0 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          />
          <label className="inline-flex cursor-pointer items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                config.enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
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

      <div className="mb-5 max-w-md">
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {t('timezone')}
        </label>
        <select
          disabled={!canManage || busy}
          value={config.timezone || 'UTC'}
          onChange={(e) => {
            setConfig((p) => (p ? { ...p, timezone: e.target.value } : p));
            setSaved(false);
          }}
          className={fieldClass}
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
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="hidden grid-cols-[minmax(7rem,1fr)_8rem_minmax(0,1fr)] gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-400 sm:grid">
          <span>{t('whatsappCallHoursDayColumn')}</span>
          <span>{t('status')}</span>
          <span>{t('whatsappCallHoursTimeColumn')}</span>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/80">
          {DAYS.map((day) => {
            const entry = config.weekly[day] || {
              closed: true,
              open: '09:00',
              close: '17:00',
            };
            return (
              <li
                key={day}
                className="flex flex-col gap-2 px-3 py-3 sm:grid sm:grid-cols-[minmax(7rem,1fr)_8rem_minmax(0,1fr)] sm:items-center sm:gap-3"
              >
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {dayLabel(day, t)}
                </span>
                <select
                  disabled={!canManage || busy}
                  value={entry.closed ? 'closed' : 'open'}
                  onChange={(e) => updateDay(day, { closed: e.target.value === 'closed' })}
                  className={`${fieldClassSm} w-full sm:w-auto`}
                >
                  <option value="closed">{t('whatsappCallHoursClosed')}</option>
                  <option value="open">{t('whatsappCallHoursOpen')}</option>
                </select>
                {!entry.closed ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      disabled={!canManage || busy}
                      value={entry.open}
                      onChange={(e) => updateDay(day, { open: e.target.value })}
                      className={fieldClassSm}
                    />
                    <span className="text-xs text-gray-400" aria-hidden>
                      –
                    </span>
                    <input
                      type="time"
                      disabled={!canManage || busy}
                      value={entry.close}
                      onChange={(e) => updateDay(day, { close: e.target.value })}
                      className={fieldClassSm}
                    />
                  </div>
                ) : (
                  <span className="hidden text-sm text-gray-400 sm:inline">—</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {t('whatsappOutOfHoursMessage')}
        </label>
        <textarea
          disabled={!canManage || busy}
          rows={3}
          value={config.out_of_hours_message}
          placeholder={config.default_out_of_hours_message}
          onChange={(e) => {
            setConfig((p) => (p ? { ...p, out_of_hours_message: e.target.value } : p));
            setSaved(false);
          }}
          className={`${fieldClass} min-h-[5.5rem] resize-y`}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {saved && !error ? (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{t('saved')}</p>
      ) : null}

      {canManage ? (
        <div className="mt-4 flex justify-end">
          <Button type="button" disabled={busy} loading={busy} onClick={() => void save()}>
            {t('save')}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          {t('whatsappCallHoursReadOnly')}
        </p>
      )}
    </div>
  );
};
