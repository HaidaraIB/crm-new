/**
 * Authenticated blob URL cache for chat media (Team Chat + WhatsApp).
 */
import { getAuthenticatedBinaryRequestHeaders } from '../services/api';

export function chatMediaBinaryUrlIdentity(absoluteUrl: string): string {
  try {
    const u = new URL(absoluteUrl);
    return `${u.origin}${u.pathname}`;
  } catch {
    return absoluteUrl;
  }
}

const BLOB_CACHE_MAX = 40;
const blobUrlLru = new Map<string, string>();

export function chatMediaBlobCacheTake(identity: string): string | null {
  const v = blobUrlLru.get(identity);
  if (v == null) return null;
  blobUrlLru.delete(identity);
  blobUrlLru.set(identity, v);
  return v;
}

export function chatMediaBlobCachePut(identity: string, objectUrl: string) {
  const existing = blobUrlLru.get(identity);
  if (existing != null && existing !== objectUrl) {
    blobUrlLru.delete(identity);
    URL.revokeObjectURL(existing);
  }
  while (blobUrlLru.size >= BLOB_CACHE_MAX) {
    const firstKey = blobUrlLru.keys().next().value as string | undefined;
    if (firstKey == null) break;
    const old = blobUrlLru.get(firstKey);
    blobUrlLru.delete(firstKey);
    if (old) URL.revokeObjectURL(old);
  }
  blobUrlLru.set(identity, objectUrl);
}

export function chatMediaBlobCacheTouch(identity: string, objectUrl: string) {
  blobUrlLru.set(identity, objectUrl);
}

export async function fetchChatMediaBlob(url: string): Promise<Blob> {
  const r = await fetch(url, { headers: getAuthenticatedBinaryRequestHeaders() });
  if (!r.ok) throw new Error(`media_fetch_failed_${r.status}`);
  return r.blob();
}

export async function fetchChatMediaObjectUrl(url: string): Promise<string> {
  const blob = await fetchChatMediaBlob(url);
  return URL.createObjectURL(blob);
}
