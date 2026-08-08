import React, { useMemo } from 'react';
import { PhoneText } from '../PhoneText';
import { PhoneIcon, WhatsappIcon, XIcon } from '../icons';
import type { WhatsAppCallRecord } from '../../services/api';

type Props = {
  call: WhatsAppCallRecord;
  busy?: boolean;
  t: (key: any) => string;
  onAnswer: () => void;
  onOpenCalls: () => void;
  onDismiss: () => void;
};

function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

/**
 * Soft away toast for an inbound ringing call when the agent is not on Calls.
 * Dismiss hides this surface for the call id (session); badge + live list remain.
 */
export const WhatsAppLiveCallToast: React.FC<Props> = ({
  call,
  busy,
  t,
  onAnswer,
  onOpenCalls,
  onDismiss,
}) => {
  const title = call.client_name || call.peer_name || t('whatsappIncomingCall');
  const initials = useMemo(() => initialsFromTitle(title), [title]);

  return (
    <div
      className="fixed bottom-4 end-4 z-[76] w-[min(100%-2rem,22rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#111b21] text-white shadow-2xl shadow-black/40"
      role="status"
      aria-live="polite"
      aria-label={t('liveCallToastTitle')}
    >
      <div className="relative px-4 pb-4 pt-3">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,211,102,0.16),_transparent_55%)]" />

        <div className="relative flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#233138] text-sm font-semibold ring-2 ring-[#25D366]/35">
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#111b21]">
              <WhatsappIcon className="h-3 w-3 text-[#25D366]" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#25D366]">
              {t('liveCallToastTitle')}
            </p>
            <p className="truncate text-sm font-semibold text-white">{title}</p>
            <PhoneText className="text-xs text-white/60">{call.peer_phone}</PhoneText>
            <span className="mt-1.5 inline-flex rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/30">
              {t('whatsappCallRinging')}
            </span>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="relative -me-1 -mt-1 inline-flex size-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
            aria-label={t('dismissLiveCallToast')}
            title={t('dismissLiveCallToast')}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onAnswer}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1ebe57] disabled:opacity-50"
          >
            <PhoneIcon className="h-4 w-4" />
            {t('whatsappAcceptCall')}
          </button>
          <button
            type="button"
            onClick={onOpenCalls}
            className="inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white/90 ring-1 ring-white/15 hover:bg-white/15"
          >
            {t('openCalls')}
          </button>
        </div>
      </div>
    </div>
  );
};
