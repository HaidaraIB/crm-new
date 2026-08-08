import React, { useCallback, useEffect, useState } from 'react';
import { RefreshButton } from '../index';
import {
  getWhatsAppCallAgentStatusTeamAPI,
  resolveLocalizedApiError,
  type WhatsAppTeamAgentCallStatus,
} from '../../services/api';
import { WHATSAPP_CALL_AGENT_STATUS_EVENT } from '../../utils/whatsappCallAgentStatus';

type Props = {
  t: (key: any) => string;
};

/**
 * Owner/supervisor: see which teammates are Ready vs Away for WhatsApp calls.
 */
export const WhatsAppTeamCallStatusPanel: React.FC<Props> = ({ t }) => {
  const [rows, setRows] = useState<WhatsAppTeamAgentCallStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await getWhatsAppCallAgentStatusTeamAPI();
        setRows(data.results || []);
        setError(null);
      } catch (e: any) {
        setRows([]);
        setError(
          resolveLocalizedApiError(e, t, t('whatsappTeamCallStatusLoadFailed'))
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
    const id = window.setInterval(() => void load({ silent: true }), 15_000);
    const onStatus = () => {
      void load({ silent: true });
    };
    window.addEventListener(WHATSAPP_CALL_AGENT_STATUS_EVENT, onStatus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(WHATSAPP_CALL_AGENT_STATUS_EVENT, onStatus);
    };
  }, [load]);

  const labelFor = (row: WhatsAppTeamAgentCallStatus) => {
    const name = `${row.first_name || ''} ${row.last_name || ''}`.trim();
    return name || row.username;
  };

  const readyCount = rows.filter((r) => r.status !== 'away').length;
  const awayCount = rows.length - readyCount;

  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/80 dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            {t('whatsappTeamCallStatusTitle')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('whatsappTeamCallStatusHint')}
          </p>
          {!loading && rows.length > 0 ? (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-emerald-700 dark:text-emerald-300">
                {readyCount} {t('whatsappCallStatusReady')}
              </span>
              <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
              <span className="font-medium text-amber-700 dark:text-amber-300">
                {awayCount} {t('whatsappCallStatusAway')}
              </span>
            </p>
          ) : null}
        </div>
        <RefreshButton
          iconOnly
          loading={refreshing}
          disabled={loading && !refreshing}
          onClick={() => void load({ silent: true })}
          className="shrink-0 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : loading && rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">{t('loading')}</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">{t('whatsappTeamCallStatusEmpty')}</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 dark:divide-gray-700/80 dark:border-gray-700">
          {rows.map((row) => {
            const away = row.status === 'away';
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 bg-white px-3 py-2.5 dark:bg-gray-900/40"
              >
                <span
                  className={`inline-block size-2.5 shrink-0 rounded-full ${
                    away ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-gray-100">
                  {labelFor(row)}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    away
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                      : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                  }`}
                >
                  {away ? t('whatsappCallStatusAway') : t('whatsappCallStatusReady')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
