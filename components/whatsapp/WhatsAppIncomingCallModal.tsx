import React, { useMemo } from 'react';
import { PhoneText } from '../PhoneText';
import { PhoneHangupIcon, PhoneIcon, WhatsappIcon } from '../icons';
import { WhatsAppCallControlButton } from './WhatsAppCallControlButton';
import type { WhatsAppCallRecord } from '../../services/api';

type Props = {
  call: WhatsAppCallRecord;
  busy?: boolean;
  t: (key: any) => string;
  onAccept: () => void;
  onReject: () => void;
};

function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export const WhatsAppIncomingCallModal: React.FC<Props> = ({
  call,
  busy,
  t,
  onAccept,
  onReject,
}) => {
  const title = call.client_name || call.peer_name || t('whatsappIncomingCall');
  const initials = useMemo(() => initialsFromTitle(title), [title]);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-gradient-to-b from-[#0b141a] via-[#111b21] to-[#0b141a] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={t('whatsappIncomingCall')}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,211,102,0.12),_transparent_55%)]" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-10 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-[#25D366] ring-1 ring-white/10">
          <WhatsappIcon className="h-4 w-4" />
          {t('whatsappIncomingCallVia')}
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/20" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#233138] text-3xl font-semibold tracking-wide text-white shadow-2xl ring-4 ring-[#25D366]/25">
            {initials}
          </div>
        </div>

        <h2 className="max-w-md text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        <PhoneText className="mt-2 text-base text-white/70">{call.peer_phone}</PhoneText>
        {call.client_stage ? (
          <p className="mt-3 rounded-full bg-white/5 px-3 py-1 text-xs text-white/60 ring-1 ring-white/10">
            {t('stage')}: {call.client_stage}
          </p>
        ) : null}
        <p className="mt-6 text-sm font-medium text-white/55">{t('whatsappCallRinging')}</p>
      </div>

      <div className="relative z-10 px-8 pb-10 pt-4 sm:pb-14">
        <div dir="ltr" className="mx-auto flex max-w-sm items-end justify-around gap-10">
          <WhatsAppCallControlButton
            label={t('whatsappRejectCall')}
            variant="decline"
            disabled={busy}
            onClick={onReject}
          >
            <PhoneHangupIcon className="rotate-0" />
          </WhatsAppCallControlButton>
          <WhatsAppCallControlButton
            label={t('whatsappAcceptCall')}
            variant="accept"
            disabled={busy}
            onClick={onAccept}
          >
            <PhoneIcon className="stroke-[2.25]" />
          </WhatsAppCallControlButton>
        </div>
        <p className="mt-5 text-center text-[11px] text-white/40">
          {t('whatsappAcceptAndRecord')}
        </p>
      </div>
    </div>
  );
};
