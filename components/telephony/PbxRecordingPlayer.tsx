/**
 * Plays one Loop Cloud PBX recording. The URL is requested only when the user
 * presses play (POST /telephony/recordings/<id>/access/: visibility re-checked,
 * audit-logged, valid 5 minutes) and loaded by a plain <audio> element: it is a
 * presigned object-storage URL, so it must not carry the CRM's Authorization header.
 */
import React, { useRef, useState } from 'react';

import { useAppContext } from '../../context/AppContext';
import { getPbxRecordingAccessAPI } from '../../services/api';
import { Button } from '../Button';
import { PauseIcon, PlayIcon, RefreshIcon, VolumeIcon, VolumeOffIcon } from '../icons';
import { Loader } from '../Loader';

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
};

const CompactAudioPlayer: React.FC<{
  src: string;
  tr: (key: string) => string;
  onError: () => void;
}> = ({ src, tr, onError }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const progress = safeDuration ? Math.min(currentTime / safeDuration, 1) : 0;

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
    }
  };

  const seekTo = (nextTime: number) => {
    const audio = audioRef.current;
    if (!audio || !safeDuration) return;
    const boundedTime = Math.min(Math.max(nextTime, 0), safeDuration);
    audio.currentTime = boundedTime;
    setCurrentTime(boundedTime);
  };

  const seekFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!safeDuration) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    seekTo(((event.clientX - bounds.left) / bounds.width) * safeDuration);
  };

  const handleSeekKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!safeDuration || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') seekTo(0);
    else if (event.key === 'End') seekTo(safeDuration);
    else seekTo(currentTime + (event.key === 'ArrowRight' ? 5 : -5));
  };

  const toggleMuted = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  return (
    <div
      className="mx-auto flex h-8 w-52 items-center gap-1.5 rounded-md bg-gray-100 px-1.5 text-gray-700 ring-1 ring-inset ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700"
      dir="ltr"
    >
      <audio
        ref={audioRef}
        src={src}
        autoPlay
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={onError}
      />
      <button
        type="button"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-primary transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-primary-300 dark:hover:bg-primary-400/15"
        aria-label={playing ? tr('pbxPauseRecording') : tr('pbxResumeRecording')}
        title={playing ? tr('pbxPauseRecording') : tr('pbxResumeRecording')}
        onClick={() => void togglePlayback()}
      >
        {playing ? <PauseIcon className="h-3 w-3" aria-hidden /> : <PlayIcon className="ms-0.5 h-3 w-3" aria-hidden />}
      </button>
      <div
        className={`group relative h-6 min-w-0 flex-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${safeDuration ? 'cursor-pointer' : 'cursor-default'}`}
        role="slider"
        tabIndex={safeDuration ? 0 : -1}
        aria-label={tr('pbxRecordingSeek')}
        aria-valuemin={0}
        aria-valuemax={Math.round(safeDuration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} / ${formatTime(safeDuration)}`}
        aria-disabled={!safeDuration}
        onPointerDown={seekFromPointer}
        onKeyDown={handleSeekKey}
      >
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden>
          <span className="block h-full rounded-full bg-primary dark:bg-primary-400" style={{ width: `${progress * 100}%` }} />
        </span>
        {safeDuration ? (
          <span
            className="pointer-events-none absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-primary-300"
            style={{ left: `${progress * 100}%` }}
            aria-hidden
          />
        ) : null}
      </div>
      <span className="w-[4.8rem] shrink-0 text-center text-[10px] font-medium tabular-nums text-gray-600 dark:text-gray-300">
        {formatTime(currentTime)} / {formatTime(safeDuration)}
      </span>
      <button
        type="button"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        aria-label={muted ? tr('unmute') : tr('mute')}
        title={muted ? tr('unmute') : tr('mute')}
        onClick={toggleMuted}
      >
        {muted ? <VolumeOffIcon className="h-3.5 w-3.5" aria-hidden /> : <VolumeIcon className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </div>
  );
};

export const PbxRecordingPlayer: React.FC<{ recordingId: string | (() => Promise<string>); compact?: boolean }> = ({
  recordingId,
  compact = false,
}) => {
  const { t } = useAppContext();
  const tr = (key: string) => (t as (k: string) => string)(key);
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  if (url && compact) {
    return <CompactAudioPlayer src={url} tr={tr} onError={() => { setUrl(null); setState('error'); }} />;
  }
  if (url) {
    return (
      <div className="mt-2" dir="ltr">
        <audio controls autoPlay src={url} className="h-8 w-56 max-w-full" />
      </div>
    );
  }
  const play = async () => {
    setState('loading');
    try {
      const id = typeof recordingId === 'function' ? await recordingId() : recordingId;
      const access = await getPbxRecordingAccessAPI(id);
      setUrl(access.url);
      setState('idle');
    } catch {
      setState('error');
    }
  };
  return compact ? (
    <span className="inline-flex h-8 w-52 items-center justify-center gap-2">
      {state === 'error' ? (
        <>
          <span
            className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
            title={tr('pbxRecordingUnavailable')}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
            {tr('pbxRecordingUnavailableShort')}
          </span>
          <button
            type="button"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold text-gray-700 underline-offset-2 hover:bg-gray-100 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white dark:focus-visible:ring-offset-gray-900"
            onClick={() => void play()}
          >
            <RefreshIcon className="h-3.5 w-3.5" aria-hidden />
            {tr('tryAgain')}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="inline-flex h-8 min-w-36 items-center justify-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait dark:border-primary-400/30 dark:bg-primary-400/10 dark:text-primary-200 dark:hover:border-primary-300/50 dark:hover:bg-primary-400/15 dark:focus-visible:ring-offset-gray-900"
          disabled={state === 'loading'}
          aria-busy={state === 'loading' || undefined}
          onClick={() => void play()}
        >
          {state === 'loading' ? (
            <>
              <Loader size="sm" variant="primary" presentational />
              {tr('loading')}
            </>
          ) : (
            <>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm dark:bg-primary-400 dark:text-gray-950" aria-hidden>
                <PlayIcon className="ms-0.5 h-2.5 w-2.5" />
              </span>
              {tr('pbxPlayRecording')}
            </>
          )}
        </button>
      )}
    </span>
  ) : (
    <span className="mt-2 inline-flex items-center gap-2">
      <Button size="sm" variant="secondary" loading={state === 'loading'} onClick={() => void play()}>
        {tr('pbxPlayRecording')}
      </Button>
      {state === 'error' ? <span className="text-xs text-rose-600 dark:text-rose-400">{tr('pbxRecordingUnavailable')}</span> : null}
    </span>
  );
};
