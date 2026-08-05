import React, { useMemo, useState } from 'react';
import { PhoneText } from '../PhoneText';
import { MicOffIcon, MicrophoneIcon, PhoneHangupIcon } from '../icons';
import { WhatsAppCallControlButton } from './WhatsAppCallControlButton';
import type { WhatsAppCallRecord } from '../../services/api';

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

type Props = {
  call: WhatsAppCallRecord;
  phase: string;
  elapsedSec: number;
  muted: boolean;
  notes: string;
  t: (key: string) => string;
  onNotesChange: (v: string) => void;
  onToggleMute: () => void;
  onEnd: () => void;
};

export const WhatsAppActiveCallPanel: React.FC<Props> = ({
  call,
  phase,
  elapsedSec,
  muted,
  notes,
  t,
  onNotesChange,
  onToggleMute,
  onEnd,
}) => {
  const [notesOpen, setNotesOpen] = useState(Boolean(notes));
  const title = call.client_name || call.peer_name || t('whatsappActiveCall');
  const initials = useMemo(() => initialsFromTitle(title), [title]);
  const statusLabel =
    phase === 'ringing'
      ? t('whatsappCallRinging')
      : phase === 'connecting'
        ? t('whatsappCallConnecting')
        : phase === 'ending'
          ? t('whatsappCallEnding')
          : t('whatsappCallInProgress');

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center p-3 sm:inset-auto sm:bottom-4 sm:end-4 sm:w-full sm:max-w-[22rem] sm:p-0">
      <div className="w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111b21] text-white shadow-2xl shadow-black/40">
        <div className="relative px-5 pb-5 pt-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,211,102,0.14),_transparent_60%)]" />

          <div className="relative flex flex-col items-center text-center">
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[#233138] text-2xl font-semibold ring-4 ring-[#25D366]/20">
              {initials}
            </div>
            <p className="max-w-full truncate text-lg font-semibold tracking-tight">{title}</p>
            <PhoneText className="mt-1 text-sm text-white/65">{call.peer_phone}</PhoneText>
            <p className="mt-2 text-sm font-medium text-[#25D366]">
              {statusLabel}
              {phase === 'active' || phase === 'ending' ? ` · ${formatElapsed(elapsedSec)}` : null}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#F15C6D]/90">
              {t('whatsappRecordingInProgress')}
            </p>
          </div>

          <div dir="ltr" className="relative mt-7 flex items-end justify-center gap-8">
            <WhatsAppCallControlButton
              label={muted ? t('unmute') : t('mute')}
              variant={muted ? 'muteActive' : 'mute'}
              size="md"
              onClick={onToggleMute}
            >
              {muted ? <MicOffIcon /> : <MicrophoneIcon />}
            </WhatsAppCallControlButton>
            <WhatsAppCallControlButton
              label={t('whatsappEndCall')}
              variant="end"
              onClick={onEnd}
            >
              <PhoneHangupIcon />
            </WhatsAppCallControlButton>
          </div>

          <div className="relative mt-5">
            <button
              type="button"
              onClick={() => setNotesOpen((v) => !v)}
              className="w-full rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/8"
            >
              {notesOpen ? t('whatsappHideCallNotes') : t('whatsappLiveCallNotes')}
            </button>
            {notesOpen ? (
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder={t('whatsappLiveCallNotes')}
                rows={3}
                className="mt-2 w-full rounded-xl border-0 bg-[#0b141a] px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none ring-1 ring-white/10 focus:ring-[#25D366]/40"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
