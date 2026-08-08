import React, { useMemo } from 'react';
import { PhoneText } from '../PhoneText';
import { PhoneHangupIcon, PhoneIcon } from '../icons';
import { WhatsAppCallControlButton } from './WhatsAppCallControlButton';
import type { WhatsAppCallRecord } from '../../services/api';

type Props = {
  call: WhatsAppCallRecord;
  busy?: boolean;
  t: (key: any) => string;
  onReject: () => void;
  onEndAndAnswer: () => void;
};

function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export const WhatsAppCallWaitingBanner: React.FC<Props> = ({
  call,
  busy,
  t,
  onReject,
  onEndAndAnswer,
}) => {
  const title = call.client_name || call.peer_name || t('whatsappIncomingCall');
  const initials = useMemo(() => initialsFromTitle(title), [title]);

  return (
    <div
      className="fixed bottom-4 start-4 z-[75] w-[min(100%-2rem,22rem)] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#111b21] text-white shadow-2xl shadow-black/40"
      role="dialog"
      aria-label={t('whatsappCallWaiting')}
    >
      <div className="relative px-4 pb-4 pt-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.18),_transparent_55%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#233138] text-sm font-semibold ring-2 ring-amber-400/40">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
              {t('whatsappCallWaiting')}
            </p>
            <p className="truncate text-sm font-semibold text-white">{title}</p>
            <PhoneText className="text-xs text-white/60">{call.peer_phone}</PhoneText>
          </div>
        </div>

        <div dir="ltr" className="relative mt-4 flex items-end justify-center gap-8">
          <WhatsAppCallControlButton
            label={t('whatsappRejectCall')}
            variant="decline"
            size="md"
            disabled={busy}
            onClick={onReject}
          >
            <PhoneHangupIcon />
          </WhatsAppCallControlButton>
          <WhatsAppCallControlButton
            label={t('whatsappEndAndAnswer')}
            variant="accept"
            size="md"
            disabled={busy}
            onClick={onEndAndAnswer}
          >
            <PhoneIcon className="stroke-[2.25]" />
          </WhatsAppCallControlButton>
        </div>
      </div>
    </div>
  );
};
