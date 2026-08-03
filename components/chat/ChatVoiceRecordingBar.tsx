import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../constants';
import { PauseIcon, PlayIcon, SquareFillIcon } from '../icons';

type Props = {
  elapsedLabel: string;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel?: () => void;
  t: (key: keyof typeof translations.en) => string;
  /** Compact styling for WhatsApp vs Team Chat shells */
  variant?: 'whatsapp' | 'team';
};

/**
 * In-composer controls while a voice note is being recorded (shared WA + Team Chat).
 * Follows UI language direction; timer digits stay LTR-isolated.
 */
export const ChatVoiceRecordingBar: React.FC<Props> = ({
  elapsedLabel,
  paused,
  onPause,
  onResume,
  onStop,
  onCancel,
  t,
  variant = 'team',
}) => {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  const btn =
    variant === 'whatsapp'
      ? 'flex size-9 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10'
      : 'flex size-10 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/80';

  return (
    <div
      className="flex min-h-10 min-w-0 flex-1 items-center gap-2 px-1"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <span
        className={`size-2.5 shrink-0 rounded-full bg-red-500 ${paused ? 'opacity-40' : 'animate-pulse'}`}
        aria-hidden
      />
      <span
        dir="ltr"
        className="min-w-[3rem] tabular-nums text-sm font-medium text-red-600 dark:text-red-400 [unicode-bidi:isolate]"
      >
        {elapsedLabel}
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-xs text-gray-500 dark:text-gray-400 ${
          isRtl ? 'text-right' : 'text-left'
        }`}
      >
        {paused ? t('teamChatRecordingPaused') : t('teamChatRecording')}
      </span>
      {onCancel ? (
        <button
          type="button"
          className={btn}
          onClick={onCancel}
          aria-label={t('teamChatCancelRecording')}
          title={t('teamChatCancelRecording')}
        >
          <span className="text-lg leading-none" aria-hidden>
            ×
          </span>
        </button>
      ) : null}
      <button
        type="button"
        className={btn}
        onClick={() => (paused ? onResume() : onPause())}
        aria-label={paused ? t('teamChatResumeRecording') : t('teamChatPauseRecording')}
        title={paused ? t('teamChatResumeRecording') : t('teamChatPauseRecording')}
      >
        {paused ? <PlayIcon className="size-[1.15rem]" /> : <PauseIcon className="size-[1.15rem]" />}
      </button>
      <button
        type="button"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        onClick={onStop}
        aria-label={t('teamChatStopRecording')}
        title={t('teamChatStopRecording')}
      >
        <SquareFillIcon className="size-[1.05rem]" />
      </button>
    </div>
  );
};
