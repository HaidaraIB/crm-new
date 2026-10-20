/**
 * Whether `url` is served by the CRM API at `apiBaseUrl` (same origin), i.e.
 * whether it may carry the user's token. Presigned object-storage URLs (R2)
 * carry their own signature: sending a JWT there leaks it to another host, and
 * R2 rejects a request with both a header and a query signature.
 * See CRM-api-1/docs/STORAGE.md.
 */
export function isApiOriginUrl(url: string, apiBaseUrl: string, pageUrl?: string): boolean {
  try {
    // A relative API base (same-origin deployment) resolves against the page.
    const page = pageUrl ?? (typeof location !== 'undefined' ? location.href : 'http://localhost/');
    const base = new URL(apiBaseUrl, page);
    return new URL(url, base).origin === base.origin;
  } catch {
    return false;
  }
}
