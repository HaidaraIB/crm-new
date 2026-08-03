import React, { useEffect, useMemo, useState } from 'react';
import { PlayIcon } from '../icons';
import {
  chatMediaBinaryUrlIdentity,
  chatMediaBlobCachePut,
  chatMediaBlobCacheTake,
  chatMediaBlobCacheTouch,
  fetchChatMediaBlob,
} from '../../utils/chatMediaAuthBlob';

type Props = {
  url: string;
  kind: 'image' | 'video';
  className?: string;
  /** Extra class for the media element inside. */
  mediaClassName?: string;
};

/** Small auth-aware thumbnail for reply banners / filmstrips. */
export const ChatMediaThumb: React.FC<Props> = ({
  url,
  kind,
  className = '',
  mediaClassName = 'h-full w-full object-cover',
}) => {
  const urlIdentity = useMemo(() => chatMediaBinaryUrlIdentity(url), [url]);
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    return chatMediaBlobCacheTake(urlIdentity);
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      setBlobUrl(url);
      return;
    }
    const cached = chatMediaBlobCacheTake(urlIdentity);
    if (cached) {
      chatMediaBlobCacheTouch(urlIdentity, cached);
      setBlobUrl(cached);
      return;
    }
    let cancelled = false;
    setBlobUrl(null);
    void (async () => {
      try {
        const blob = await fetchChatMediaBlob(url);
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        chatMediaBlobCachePut(urlIdentity, objectUrl);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, urlIdentity]);

  if (failed || !blobUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-700/80 text-[10px] text-white/70 ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black/40 ${className}`}>
      {kind === 'image' ? (
        <img src={blobUrl} alt="" className={mediaClassName} draggable={false} />
      ) : (
        <>
          <video
            src={blobUrl}
            muted
            playsInline
            preload="metadata"
            className={mediaClassName}
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
            <PlayIcon className="size-3 text-white drop-shadow" aria-hidden />
          </span>
        </>
      )}
    </div>
  );
};
