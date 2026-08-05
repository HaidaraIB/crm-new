import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownToLineIcon,
  ArrowLeftIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  XIcon,
} from '../icons';
import type { ChatMediaAlbumItem } from './chatMediaAlbum';
import { ChatMediaThumb } from './ChatMediaThumb';
import { translations } from '../../constants';
import {
  chatMediaBinaryUrlIdentity,
  chatMediaBlobCachePut,
  chatMediaBlobCacheTake,
  chatMediaBlobCacheTouch,
  fetchChatMediaBlob,
} from '../../utils/chatMediaAuthBlob';

type Props = {
  items: ChatMediaAlbumItem[];
  initialIndex: number;
  onClose: () => void;
  t: (key: keyof typeof translations.en) => string;
};

function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function useViewerBlobUrl(url: string): { blobUrl: string | null; failed: boolean; loading: boolean } {
  const urlIdentity = useMemo(() => chatMediaBinaryUrlIdentity(url), [url]);
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    return chatMediaBlobCacheTake(urlIdentity);
  });
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      setBlobUrl(url);
      setLoading(false);
      return;
    }
    const cached = chatMediaBlobCacheTake(urlIdentity);
    if (cached) {
      chatMediaBlobCacheTouch(urlIdentity, cached);
      setBlobUrl(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setBlobUrl(null);
    setLoading(true);
    void (async () => {
      try {
        const blob = await fetchChatMediaBlob(url);
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        chatMediaBlobCachePut(urlIdentity, objectUrl);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, urlIdentity]);

  return { blobUrl, failed, loading };
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

export const ChatMediaViewer: React.FC<Props> = ({ items, initialIndex, onClose, t }) => {
  const safeInitial = Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1));
  const [index, setIndex] = useState(safeInitial);
  const item = items[index] ?? null;

  const { blobUrl, failed, loading } = useViewerBlobUrl(item?.url ?? '');

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);

  const filmstripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIndex(safeInitial);
  }, [safeInitial]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSeeking(false);
  }, [index, item?.id]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIndex((i) => Math.min(items.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, onClose]);

  useEffect(() => {
    const el = filmstripRef.current;
    if (!el) return;
    const thumb = el.querySelector<HTMLElement>(`[data-album-index="${index}"]`);
    thumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [index]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(items.length - 1, i + 1)), [items.length]);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const zoomIn = useCallback(() => {
    setZoom((z) => clampZoom(z + ZOOM_STEP));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = clampZoom(z - ZOOM_STEP);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const onImageWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => {
      const next = clampZoom(z + delta);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const onImageDoubleClick = useCallback(() => {
    setZoom((z) => {
      if (z > 1) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return 2;
    });
  }, []);

  const onPanPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (zoom <= 1 || item?.kind !== 'image') return;
      e.currentTarget.setPointerCapture(e.pointerId);
      panDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: pan.x,
        originY: pan.y,
      };
    },
    [zoom, pan.x, pan.y, item?.kind]
  );

  const onPanPointerMove = useCallback((e: React.PointerEvent) => {
    const d = panDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setPan({
      x: d.originX + (e.clientX - d.startX),
      y: d.originY + (e.clientY - d.startY),
    });
  }, []);

  const onPanPointerUp = useCallback((e: React.PointerEvent) => {
    const d = panDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    panDragRef.current = null;
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
    } else {
      v.pause();
    }
  }, []);

  const onDownload = useCallback(async () => {
    if (!item) return;
    try {
      let href = blobUrl;
      if (!href) {
        if (item.url.startsWith('blob:') || item.url.startsWith('data:')) {
          href = item.url;
        } else {
          const blob = await fetchChatMediaBlob(item.url);
          href = URL.createObjectURL(blob);
        }
      }
      const a = document.createElement('a');
      a.href = href;
      a.download =
        item.filename ||
        (item.kind === 'video' ? t('chatMediaDefaultVideoName') : t('chatMediaDefaultImageName'));
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      /* ignore */
    }
  }, [item, blobUrl, t]);

  if (!item || items.length === 0) return null;

  const counterLabel = t('chatMediaCounter')
    .replace('{current}', String(index + 1))
    .replace('{total}', String(items.length));
  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex flex-col text-white"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={t('chatMediaViewerTitle')}
    >
      <div className="relative z-30 flex shrink-0 items-center gap-2 border-b border-white/10 bg-black/50 px-3 py-2.5 sm:px-4">
        <p className="min-w-0 flex-1 truncate text-sm font-medium tabular-nums text-white">
          {counterLabel}
          {item.filename ? (
            <span className="ms-2 font-normal text-white/70">· {item.filename}</span>
          ) : null}
        </p>
        {item.kind === 'image' ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-40"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label={t('chatMediaZoomOut')}
            >
              <span className="text-lg leading-none" aria-hidden>
                −
              </span>
            </button>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-40"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label={t('chatMediaZoomIn')}
            >
              <PlusIcon className="size-5" aria-hidden />
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          onClick={() => void onDownload()}
          aria-label={t('chatMediaDownload')}
        >
          <ArrowDownToLineIcon className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          onClick={onClose}
          aria-label={t('chatMediaClose')}
        >
          <XIcon className="size-5" aria-hidden />
        </button>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center">
        {canPrev ? (
          <button
            type="button"
            className="absolute start-2 z-20 flex size-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 sm:start-4"
            onClick={goPrev}
            aria-label={t('chatMediaPrevious')}
          >
            <ArrowLeftIcon className="size-5" aria-hidden />
          </button>
        ) : null}
        {canNext ? (
          <button
            type="button"
            className="absolute end-2 z-20 flex size-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 sm:end-4"
            onClick={goNext}
            aria-label={t('chatMediaNext')}
          >
            <ArrowLeftIcon className="size-5 rotate-180" aria-hidden />
          </button>
        ) : null}

        <div
          className="absolute inset-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          aria-hidden
        />

        <div className="relative z-10 flex h-full w-full max-w-5xl flex-col items-center justify-center px-12 py-2 sm:px-16">
          {loading ? (
            <span className="size-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : failed || !blobUrl ? (
            <p className="text-sm text-white/70">{t('chatMediaCouldNotLoad')}</p>
          ) : item.kind === 'image' ? (
            <div
              className="flex h-full w-full touch-none items-center justify-center overflow-hidden"
              onWheel={onImageWheel}
              onDoubleClick={onImageDoubleClick}
              onPointerDown={onPanPointerDown}
              onPointerMove={onPanPointerMove}
              onPointerUp={onPanPointerUp}
              onPointerCancel={onPanPointerUp}
            >
              <img
                src={blobUrl}
                alt=""
                draggable={false}
                className="max-h-full max-w-full select-none object-contain transition-transform duration-100"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  cursor: zoom > 1 ? 'grab' : 'zoom-in',
                }}
              />
            </div>
          ) : (
            <div className="flex w-full max-w-3xl flex-col gap-3">
              <div className="relative overflow-hidden rounded-lg bg-black">
                <video
                  ref={videoRef}
                  src={blobUrl}
                  playsInline
                  className="max-h-[min(70vh,36rem)] w-full object-contain"
                  onClick={togglePlay}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onTimeUpdate={() => {
                    const v = videoRef.current;
                    if (v && !seeking) setCurrentTime(v.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    const v = videoRef.current;
                    if (v) {
                      setDuration(v.duration || 0);
                      setCurrentTime(v.currentTime || 0);
                    }
                  }}
                  onEnded={() => setPlaying(false)}
                />
                {!playing ? (
                  <button
                    type="button"
                    className="absolute inset-0 flex items-center justify-center bg-black/20"
                    onClick={togglePlay}
                    aria-label={t('chatMediaPlay')}
                  >
                    <span className="flex size-14 items-center justify-center rounded-full bg-black/55 text-white shadow-lg">
                      <PlayIcon className="size-7 ms-0.5" aria-hidden />
                    </span>
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-2 px-1">
                <button
                  type="button"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                  onClick={togglePlay}
                  aria-label={playing ? t('chatMediaPause') : t('chatMediaPlay')}
                >
                  {playing ? (
                    <PauseIcon className="size-4" aria-hidden />
                  ) : (
                    <PlayIcon className="size-4 ms-0.5" aria-hidden />
                  )}
                </button>
                <span className="shrink-0 text-xs tabular-nums text-white/80" dir="ltr">
                  {formatMediaTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
                  aria-label={t('chatMediaSeek')}
                  onPointerDown={() => setSeeking(true)}
                  onPointerUp={() => setSeeking(false)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setCurrentTime(next);
                    const v = videoRef.current;
                    if (v) v.currentTime = next;
                  }}
                />
                <span className="shrink-0 text-xs tabular-nums text-white/80" dir="ltr">
                  {formatMediaTime(duration)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {items.length > 1 ? (
        <div
          ref={filmstripRef}
          className="relative z-30 flex shrink-0 gap-2 overflow-x-auto border-t border-white/10 bg-black/50 px-3 py-3 custom-scrollbar sm:px-4"
          role="list"
          aria-label={t('chatMediaAlbum')}
        >
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              data-album-index={i}
              role="listitem"
              className={`relative size-14 shrink-0 overflow-hidden rounded-md ring-2 transition ${
                i === index
                  ? 'ring-primary ring-offset-1 ring-offset-black'
                  : 'ring-transparent opacity-70 hover:opacity-100'
              }`}
              onClick={() => setIndex(i)}
              aria-label={t('chatMediaItemAria').replace('{n}', String(i + 1))}
              aria-current={i === index ? 'true' : undefined}
            >
              <ChatMediaThumb url={it.url} kind={it.kind} className="size-full" />
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body
  );
};
