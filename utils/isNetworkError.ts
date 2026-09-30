/** Browser fetch failures (offline, CORS-blocked proxy page, connection reset). */
export function isNetworkError(e: unknown): boolean {
  if (!(e instanceof TypeError)) return false;
  const msg = String((e as Error).message || '').toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('network');
}
