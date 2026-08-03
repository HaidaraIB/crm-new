import React from 'react';
import { PhoneText } from '../PhoneText';
import type { WhatsAppCallRecord } from '../../services/api';

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  const title = call.client_name || call.peer_name || t('whatsappActiveCall');
  const statusLabel =
    phase === 'ringing'
      ? t('whatsappCallRinging')
      : phase === 'connecting'
        ? t('whatsappCallConnecting')
        : phase === 'ending'
          ? t('whatsappCallEnding')
          : t('whatsappCallInProgress');

  return (
    <div className="fixed bottom-4 end-4 z-[70] w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </p>
          <PhoneText className="text-xs text-primary-600 dark:text-primary-400">
            {call.peer_phone}
          </PhoneText>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {statusLabel} · {formatElapsed(elapsedSec)}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
            {t('whatsappRecordingInProgress')}
          </p>
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder={t('whatsappLiveCallNotes')}
        rows={3}
        className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-primary-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {muted ? t('unmute') : t('mute')}
        </button>
        <button
          type="button"
          onClick={onEnd}
          className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          {t('whatsappEndCallSave')}
        </button>
      </div>
    </div>
  );
};
