import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownToLineIcon } from '../icons';
import { ChatVoicePlayer } from './ChatVoicePlayer';
import {
  chatMediaBinaryUrlIdentity,
  chatMediaBlobCachePut,
  chatMediaBlobCacheTake,
  chatMediaBlobCacheTouch,
  fetchChatMediaBlob,
} from '../../utils/chatMediaAuthBlob';

function LazyAspectSizer({ aspectRatio }: { aspectRatio: string }) {
  return (
    <div
      className="pointer-events-none block w-full max-h-64"
      style={{ aspectRatio }}
      aria-hidden
    />
  );
}

export type ChatBlobMediaProps = {
  url: string;
  kind: 'image' | 'video' | 'audio' | 'document';
  mine: boolean;
  filename?: string | null;
  attachmentWidth?: number | null;
  attachmentHeight?: number | null;
  t: (key: string) => string;
  onIntrinsicLayout?: () => void;
};

export const ChatBlobMedia: React.FC<ChatBlobMediaProps> = ({
  url,
  kind,
  mine,
  filename,
  attachmentWidth,
  attachmentHeight,
  t,
  onIntrinsicLayout,
}) => {
  const urlIdentity = useMemo(() => chatMediaBinaryUrlIdentity(url), [url]);
  const lazyVisual = kind === 'image' || kind === 'video';

  const aspectRatioCss =
    attachmentWidth != null &&
    attachmentHeight != null &&
    attachmentWidth > 0 &&
    attachmentHeight > 0
      ? `${attachmentWidth} / ${attachmentHeight}`
      : '16 / 9';

  const hasKnownAspect =
    attachmentWidth != null &&
    attachmentHeight != null &&
    attachmentWidth > 0 &&
    attachmentHeight > 0;

  const [blobUrl, setBlobUrl] = useState<string | null>(() =>
    lazyVisual ? chatMediaBlobCacheTake(urlIdentity) : null
  );
  const [failed, setFailed] = useState(false);
  const [lazyRequested, setLazyRequested] = useState(false);
  const [lazyLoading, setLazyLoading] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      setBlobUrl(url);
      setLazyRequested(false);
      setLazyLoading(false);
      return;
    }
    if (lazyVisual) {
      const cached = chatMediaBlobCacheTake(urlIdentity);
      setBlobUrl(cached);
      setLazyRequested(false);
      setLazyLoading(false);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlobUrl(null);
    void (async () => {
      try {
        const blob = await fetchChatMediaBlob(url);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, urlIdentity, lazyVisual]);

  useEffect(() => {
    if (!lazyVisual || !lazyRequested || blobUrl != null) return;
    let cancelled = false;
    void (async () => {
      setLazyLoading(true);
      try {
        const blob = await fetchChatMediaBlob(url);
        if (cancelled) {
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        chatMediaBlobCachePut(urlIdentity, objectUrl);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLazyRequested(false);
        }
      } finally {
        if (!cancelled) setLazyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lazyVisual, lazyRequested, blobUrl, url, urlIdentity]);

  const startLazyLoad = useCallback(() => {
    const cached = chatMediaBlobCacheTake(urlIdentity);
    if (cached != null) {
      chatMediaBlobCacheTouch(urlIdentity, cached);
      setBlobUrl(cached);
      return;
    }
    setLazyRequested(true);
  }, [urlIdentity]);

  if (failed) {
    return (
      <span className={`text-xs ${mine ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
        {t('teamChatCouldNotLoad')}
      </span>
    );
  }

  const mediaShellClass = `relative w-full overflow-hidden rounded-lg max-h-64 ${
    mine
      ? 'bg-white/10'
      : 'bg-gradient-to-br from-gray-200/90 to-gray-300/80 dark:from-gray-700/80 dark:to-gray-800/70'
  }`;

  if (lazyVisual && !blobUrl) {
    return (
      <div className={mediaShellClass}>
        <LazyAspectSizer aspectRatio={aspectRatioCss} />
        <button
          type="button"
          className="absolute inset-0 z-10 flex w-full flex-col items-center justify-center gap-2 border-0 bg-transparent p-3 outline-none ring-primary/40 focus-visible:ring-2"
          aria-label={t('teamChatTapToLoadAria')}
          onClick={startLazyLoad}
          disabled={lazyLoading}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black/50 text-white shadow-md">
            {lazyLoading ? (
              <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <ArrowDownToLineIcon className="size-5" aria-hidden />
            )}
          </span>
          <span
            className={`pointer-events-none max-w-[90%] text-center text-[11px] font-medium leading-snug ${
              mine ? 'text-white/90' : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {t('teamChatTapToLoad')}
          </span>
        </button>
      </div>
    );
  }

  if (!blobUrl) {
    return <span className={`text-xs ${mine ? 'text-white/70' : 'text-gray-400'}`}>…</span>;
  }

  const docName = filename || 'download';
  const lazyAspectBoxClass = 'relative w-full overflow-hidden rounded-lg max-h-64';

  if (kind === 'image') {
    if (hasKnownAspect) {
      return (
        <div className={lazyAspectBoxClass}>
          <LazyAspectSizer aspectRatio={aspectRatioCss} />
          <img
            src={blobUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            onLoad={onIntrinsicLayout}
          />
        </div>
      );
    }
    return (
      <img
        src={blobUrl}
        alt=""
        className="max-h-64 w-full rounded-lg object-contain"
        onLoad={onIntrinsicLayout}
      />
    );
  }
  if (kind === 'video') {
    if (hasKnownAspect) {
      return (
        <div className={lazyAspectBoxClass}>
          <LazyAspectSizer aspectRatio={aspectRatioCss} />
          <video
            src={blobUrl}
            controls
            className="absolute inset-0 h-full w-full object-contain"
            onLoadedMetadata={onIntrinsicLayout}
          />
        </div>
      );
    }
    return (
      <video
        src={blobUrl}
        controls
        className="max-h-64 w-full rounded-lg"
        onLoadedMetadata={onIntrinsicLayout}
      />
    );
  }
  if (kind === 'audio') {
    return (
      <ChatVoicePlayer
        blobUrl={blobUrl}
        mine={mine}
        t={t}
        onIntrinsicLayout={onIntrinsicLayout}
      />
    );
  }
  return (
    <a
      href={blobUrl}
      download={docName}
      className={`inline-flex text-sm font-semibold underline ${
        mine ? 'text-white' : 'text-primary dark:text-primary-200'
      }`}
    >
      {t('teamChatDownload')}
    </a>
  );
};
