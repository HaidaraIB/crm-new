import React, { useEffect, useRef, useState } from 'react';
import {
  getWhatsAppCallAgentStatusAPI,
  setWhatsAppCallAgentStatusAPI,
  type WhatsAppAgentCallStatus,
} from '../../services/api';
import { notifyWhatsAppCallAgentStatusChanged } from '../../utils/whatsappCallAgentStatus';

type Props = {
  t: (key: any) => string;
  /** Fired after Ready/Away is saved so team panels can refresh immediately. */
  onStatusChange?: (status: WhatsAppAgentCallStatus) => void;
};

const DURATIONS = [15, 30, 60] as const;

function formatAwayRemaining(untilIso: string | null | undefined, t: (k: any) => string): string {
  if (!untilIso) return t('whatsappCallStatusAway');
  const end = new Date(untilIso).getTime();
  if (Number.isNaN(end)) return t('whatsappCallStatusAway');
  const mins = Math.max(1, Math.ceil((end - Date.now()) / 60000));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    return `${t('whatsappCallStatusAway')} · ${h}${t('whatsappCallAwayHourShort')}`;
  }
  return `${t('whatsappCallStatusAway')} · ${mins}${t('whatsappCallAwayMinShort')}`;
}

/**
 * Mujeb-style Ready / Set away for 15m · 30m · 1h control for WhatsApp calling.
 */
export const WhatsAppAgentStatusControl: React.FC<Props> = ({ t, onStatusChange }) => {
  const [status, setStatus] = useState<WhatsAppAgentCallStatus>({ status: 'ready' });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const applyStatus = (s: WhatsAppAgentCallStatus) => {
    setStatus(s);
    onStatusChange?.(s);
    notifyWhatsAppCallAgentStatusChanged(s);
  };

  const refresh = async () => {
    try {
      const s = await getWhatsAppCallAgentStatusAPI();
      setStatus(s);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const setReady = async () => {
    setBusy(true);
    try {
      const s = await setWhatsAppCallAgentStatusAPI({ status: 'ready' });
      applyStatus(s);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const setAway = async (minutes: number) => {
    setBusy(true);
    try {
      const s = await setWhatsAppCallAgentStatusAPI({
        status: 'away',
        duration_minutes: minutes,
      });
      applyStatus(s);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const isAway = status.status === 'away';

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span
          className={`inline-block size-2.5 rounded-full ${
            isAway ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
        />
        <span>
          {isAway
            ? formatAwayRemaining(status.away_until, t)
            : t('whatsappCallStatusReady')}
        </span>
        <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {isAway ? (
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => void setReady()}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              {t('whatsappCallSetReady')}
            </button>
          ) : (
            <>
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {t('whatsappCallSetAwayFor')}
              </p>
              {DURATIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => void setAway(m)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  <span className="size-2 rounded-full bg-amber-500" />
                  {m === 60
                    ? t('whatsappCallAway1Hour')
                    : t('whatsappCallAwayMinutes').replace('{n}', String(m))}
                </button>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};
