import { useEffect, useState } from 'react';
import {
  chatMediaBinaryUrlIdentity,
  chatMediaBlobCachePut,
  chatMediaBlobCacheTake,
  fetchChatMediaBlob,
} from '../utils/chatMediaAuthBlob';

/** Resolve an authenticated media URL to a blob: object URL (cached). */
export function useAuthBlobUrl(url: string | null | undefined): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return;
    }
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      setBlobUrl(url);
      return;
    }
    const identity = chatMediaBinaryUrlIdentity(url);
    const cached = chatMediaBlobCacheTake(identity);
    if (cached) {
      setBlobUrl(cached);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const blob = await fetchChatMediaBlob(url);
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        chatMediaBlobCachePut(identity, objectUrl);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setBlobUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return blobUrl;
}
