import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { translations } from '../../constants';

const VOICE_RATES = [0.5, 1, 1.5, 2] as const;

function formatChatAudioClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function voiceWavePercents(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 33) + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  let x = h || 1;
  for (let i = 0; i < count; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out.push(32 + (x % 68));
  }
  return out;
}

function readFiniteDuration(audio: HTMLAudioElement): number {
  const d = audio.duration;
  return Number.isFinite(d) && d > 0 ? d : 0;
}

/**
 * Resolve duration for blob/WebM recordings. Chromium often reports Infinity until a
 * forced seek past the end; after that duration becomes finite.
 */
function resolveAudioDuration(audio: HTMLAudioElement): Promise<number> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const tryDirect = () => {
      const d = readFiniteDuration(audio);
      if (d > 0) {
        finish(d);
        return true;
      }
      return false;
    };

    const forceWebmDuration = () => {
      if (settled) return;
      const onTime = () => {
        audio.removeEventListener('timeupdate', onTime);
        const d = readFiniteDuration(audio);
        const restore = () => {
          finish(d);
        };
        try {
          audio.currentTime = 0;
        } catch {
          restore();
          return;
        }
        // Wait one tick so currentTime reset settles before UI reads position.
        window.setTimeout(restore, 0);
      };
      audio.addEventListener('timeupdate', onTime);
      try {
        // Seek far ahead; browser clamps to end and then exposes real duration.
        audio.currentTime = 1e101;
      } catch {
        audio.removeEventListener('timeupdate', onTime);
        finish(0);
      }
      // Safety if timeupdate never fires
      window.setTimeout(() => {
        audio.removeEventListener('timeupdate', onTime);
        finish(readFiniteDuration(audio));
      }, 1500);
    };

    const onReady = () => {
      if (tryDirect()) return;
      // Infinity / 0 common for MediaRecorder webm/ogg until seek probe.
      if (!Number.isFinite(audio.duration) || audio.duration === Infinity || audio.duration === 0) {
        forceWebmDuration();
      }
    };

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onReady);
      audio.removeEventListener('durationchange', onReady);
      audio.removeEventListener('loadeddata', onReady);
      audio.removeEventListener('canplay', onReady);
    };

    audio.addEventListener('loadedmetadata', onReady);
    audio.addEventListener('durationchange', onReady);
    audio.addEventListener('loadeddata', onReady);
    audio.addEventListener('canplay', onReady);

    if (audio.readyState >= 1) onReady();
    else {
      try {
        audio.load();
      } catch {
        //
      }
    }

    window.setTimeout(() => {
      if (!settled) {
        if (!tryDirect()) forceWebmDuration();
      }
    }, 800);
  });
}

export type ChatVoicePlayerProps = {
  blobUrl: string;
  mine: boolean;
  t: (key: keyof typeof translations.en) => string;
  onIntrinsicLayout?: () => void;
};

export const ChatVoicePlayer: React.FC<ChatVoicePlayerProps> = ({
  blobUrl,
  mine,
  t,
  onIntrinsicLayout,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wavePercents = useMemo(() => voiceWavePercents(blobUrl, 34), [blobUrl]);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<(typeof VOICE_RATES)[number]>(1);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const scrubbingRef = useRef(false);
  const resolvingRef = useRef(false);

  useEffect(() => {
    setDuration(0);
    setPosition(0);
    setPlaying(false);
    setScrubValue(null);
    scrubbingRef.current = false;
    resolvingRef.current = false;
  }, [blobUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    let cancelled = false;

    const applyDuration = (d: number) => {
      if (cancelled || d <= 0) return;
      setDuration((prev) => (d > prev ? d : prev));
      onIntrinsicLayout?.();
    };

    const probe = async () => {
      if (resolvingRef.current) return;
      resolvingRef.current = true;
      try {
        const d = await resolveAudioDuration(a);
        applyDuration(d);
      } finally {
        resolvingRef.current = false;
      }
    };

    const onMeta = () => {
      const d = readFiniteDuration(a);
      if (d > 0) applyDuration(d);
      else void probe();
    };
    const onTime = () => {
      if (!scrubbingRef.current) setPosition(a.currentTime);
      // Some browsers only expose duration after playback starts — capture once.
      const d = readFiniteDuration(a);
      if (d > 0) applyDuration(d);
    };
    const syncPlaying = () => setPlaying(!a.paused);
    const onEnded = () => {
      setPlaying(false);
      const d = readFiniteDuration(a);
      if (d > 0) {
        applyDuration(d);
        setPosition(d);
      } else {
        setPosition(0);
      }
    };

    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    a.addEventListener('loadeddata', onMeta);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('play', syncPlaying);
    a.addEventListener('pause', syncPlaying);
    a.addEventListener('ended', onEnded);

    void probe();

    return () => {
      cancelled = true;
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onMeta);
      a.removeEventListener('loadeddata', onMeta);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('play', syncPlaying);
      a.removeEventListener('pause', syncPlaying);
      a.removeEventListener('ended', onEnded);
    };
  }, [blobUrl, onIntrinsicLayout]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = rate;
  }, [rate]);

  const dur = duration > 0 && Number.isFinite(duration) ? duration : 0;
  const pos = scrubValue ?? position;
  const progress = dur > 0 ? Math.min(1, Math.max(0, pos / dur)) : 0;
  const filledBars = Math.min(wavePercents.length, Math.ceil(wavePercents.length * progress));

  const timeFromClientX = useCallback(
    (target: HTMLElement, clientX: number) => {
      if (dur <= 0) return 0;
      const r = target.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - r.left) / Math.max(1, r.width)));
      return frac * dur;
    },
    [dur]
  );

  const shellClass = mine
    ? 'bg-black/25 ring-1 ring-white/20 shadow-inner shadow-black/10'
    : 'bg-gray-950/[0.06] ring-1 ring-gray-900/10 shadow-inner shadow-black/5 dark:bg-black/30 dark:ring-white/10 dark:shadow-black/20';

  const playBtnClass = mine
    ? 'bg-white text-primary shadow-sm shadow-black/10 hover:bg-white/95'
    : 'bg-primary text-white shadow-sm shadow-primary/25 hover:opacity-95 dark:bg-primary-500';

  const waveActiveClass = mine ? 'bg-white' : 'bg-primary dark:bg-primary-300';
  const waveMutedClass = mine ? 'bg-white/30' : 'bg-gray-400/55 dark:bg-gray-500/55';

  const rateLabel = rate === 1 ? '1×' : rate === 0.5 ? '0.5×' : rate === 1.5 ? '1.5×' : '2×';

  const cycleRate = () => {
    const i = VOICE_RATES.indexOf(rate);
    setRate(VOICE_RATES[(i + 1) % VOICE_RATES.length]);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
  };

  return (
    <div
      dir="ltr"
      className={`mt-1 flex w-full min-w-0 items-center gap-2.5 rounded-2xl px-2.5 py-2 ${shellClass}`}
    >
      <audio ref={audioRef} src={blobUrl} preload="auto" className="hidden" />
      <button
        type="button"
        onClick={togglePlay}
        className={`flex size-9 shrink-0 items-center justify-center rounded-full outline-none ring-primary/40 transition-[transform,opacity] hover:scale-[1.03] focus-visible:ring-2 active:scale-[0.98] ${playBtnClass}`}
        aria-label={playing ? t('teamChatVoicePauseAria') : t('teamChatVoicePlayAria')}
      >
        {playing ? (
          <svg className="size-3.5" viewBox="0 0 24 24" aria-hidden>
            <path fill="currentColor" d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
          </svg>
        ) : (
          <svg className="ms-0.5 size-4" viewBox="0 0 24 24" aria-hidden>
            <path fill="currentColor" d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          role="slider"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={Math.round(dur * 1000)}
          aria-valuenow={Math.round(pos * 1000)}
          aria-label={t('teamChatVoiceSeekAria')}
          className={`flex h-7 cursor-pointer touch-none items-end justify-center gap-px rounded-md px-0.5 outline-none ring-primary/40 focus-visible:ring-2 ${
            mine ? 'ring-offset-2 ring-offset-transparent' : ''
          }`}
          onKeyDown={(e) => {
            const a = audioRef.current;
            if (!a || dur <= 0) return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              const step = Math.min(5, dur / 10);
              const delta = e.key === 'ArrowLeft' ? -step : step;
              a.currentTime = Math.min(dur, Math.max(0, a.currentTime + delta));
              setPosition(a.currentTime);
            }
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              togglePlay();
            }
          }}
          onPointerDown={(e) => {
            if (e.button !== 0 || dur <= 0) return;
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            scrubbingRef.current = true;
            setScrubValue(timeFromClientX(e.currentTarget, e.clientX));
          }}
          onPointerMove={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            if (!el.hasPointerCapture(e.pointerId)) return;
            setScrubValue(timeFromClientX(el, e.clientX));
          }}
          onPointerUp={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            if (!el.hasPointerCapture(e.pointerId)) return;
            el.releasePointerCapture(e.pointerId);
            const tSeek = timeFromClientX(el, e.clientX);
            const a = audioRef.current;
            if (a && dur > 0) {
              a.currentTime = tSeek;
              setPosition(tSeek);
            }
            setScrubValue(null);
            scrubbingRef.current = false;
          }}
          onPointerCancel={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
            setScrubValue(null);
            scrubbingRef.current = false;
          }}
        >
          {wavePercents.map((pct, i) => (
            <div
              key={i}
              className={`min-h-[3px] flex-1 rounded-full transition-[height,background-color] ${
                i < filledBars ? waveActiveClass : waveMutedClass
              }`}
              style={{ height: `${pct}%`, maxWidth: 4 }}
            />
          ))}
        </div>
        <div
          className={`flex items-center justify-between gap-2 text-[10px] font-medium tabular-nums leading-none ${
            mine ? 'text-white/85' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <span>
            {formatChatAudioClock(pos)}
            <span className={mine ? 'text-white/45' : 'text-gray-400 dark:text-gray-500'}>
              {' '}
              / {dur > 0 ? formatChatAudioClock(dur) : '–:––'}
            </span>
          </span>
          <button
            type="button"
            onClick={cycleRate}
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold outline-none ring-primary/40 transition-colors hover:bg-black/10 focus-visible:ring-2 dark:hover:bg-white/10 ${
              mine ? 'text-white/90 hover:bg-white/10' : 'text-primary dark:text-primary-300'
            }`}
            aria-label={t('teamChatVoicePlaybackSpeedAria')}
          >
            {rateLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
