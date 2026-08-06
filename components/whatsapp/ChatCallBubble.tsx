import React from 'react';
import { PhoneHangupIcon, PhoneIcon } from '../icons';
import type { WhatsAppCallRecord } from '../../services/api';
import { translations } from '../../constants';

export type ChatThreadCall = Pick<
  WhatsAppCallRecord,
  'id' | 'direction' | 'status' | 'duration_sec' | 'answered_at' | 'started_at' | 'ended_at' | 'created_at'
>;

type Props = {
  call: ChatThreadCall;
  t: (key: keyof typeof translations.en) => string;
  timeLabel: string;
  onCallback?: () => void;
};

function formatDuration(sec: number | null | undefined, t: Props['t']): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return '';
  const s = Math.floor(sec);
  if (s < 60) {
    return (t('callDurationSeconds') || '{n}s').replace('{n}', String(s));
  }
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function describeWhatsAppThreadCall(
  call: ChatThreadCall,
  t: Props['t']
): { title: string; subtitle: string; missed: boolean } {
  const status = String(call.status || '').toLowerCase();
  const inbound = call.direction === 'inbound';
  const duration = formatDuration(call.duration_sec, t);
  const missed =
    status === 'missed' ||
    status === 'no_answer' ||
    (status === 'rejected' && inbound) ||
    (status === 'failed' && !call.answered_at);

  if (status === 'missed' || (inbound && status === 'rejected' && !call.answered_at)) {
    return {
      title: t('whatsappThreadMissedVoiceCall') || 'Missed voice call',
      subtitle: t('whatsappThreadTapToCallback') || 'Tap to call back',
      missed: true,
    };
  }
  if (status === 'no_answer') {
    return {
      title: t('whatsappThreadVoiceCall') || 'Voice call',
      subtitle: t('whatsappCallStatus_no_answer') || 'No answer',
      missed: true,
    };
  }
  if (status === 'rejected') {
    return {
      title: t('whatsappThreadVoiceCall') || 'Voice call',
      subtitle: t('whatsappCallStatus_rejected') || 'Rejected',
      missed: true,
    };
  }
  if (status === 'failed') {
    return {
      title: t('whatsappThreadVoiceCall') || 'Voice call',
      subtitle: t('whatsappCallStatus_failed') || 'Failed',
      missed: true,
    };
  }
  if (status === 'ringing') {
    return {
      title: t('whatsappThreadVoiceCall') || 'Voice call',
      subtitle: t('whatsappCallStatus_ringing') || 'Ringing',
      missed: false,
    };
  }
  // answered / ended
  return {
    title: t('whatsappThreadVoiceCall') || 'Voice call',
    subtitle: duration || (t('whatsappCallStatus_ended') || 'Ended'),
    missed: false,
  };
}

/**
 * WhatsApp-style call log row in the chat thread (missed / answered / no answer).
 */
export const ChatCallBubble: React.FC<Props> = ({ call, t, timeLabel, onCallback }) => {
  const { title, subtitle, missed } = describeWhatsAppThreadCall(call, t);
  const inbound = call.direction === 'inbound';
  const clickable = Boolean(onCallback && missed);

  const content = (
    <>
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
          missed
            ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        }`}
      >
        {missed ? (
          <PhoneHangupIcon className="size-4" />
        ) : (
          <PhoneIcon className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1 text-start">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
        <p
          className={`truncate text-xs ${
            missed ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {subtitle}
        </p>
      </div>
      <span className="shrink-0 self-end text-[10px] tabular-nums text-gray-500 dark:text-gray-400" dir="ltr">
        {timeLabel}
      </span>
    </>
  );

  const shellClass = `flex max-w-[85%] items-center gap-2.5 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10 ${
    inbound ? '' : ''
  }`;

  return (
    <div className={`flex w-full ${inbound ? 'justify-start' : 'justify-end'}`}>
      {clickable ? (
        <button
          type="button"
          className={`${shellClass} text-left transition hover:bg-gray-50 dark:hover:bg-gray-700`}
          onClick={onCallback}
        >
          {content}
        </button>
      ) : (
        <div className={shellClass}>{content}</div>
      )}
    </div>
  );
};
