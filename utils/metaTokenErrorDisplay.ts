/** Map Meta OAuth / session invalidation errors to CRM i18n keys. */

export function metaTokenErrorTranslationKey(raw: string | null | undefined): string | null {
  const text = (raw || '').trim().toLowerCase();
  if (!text) return null;
  if (
    text.includes('session has been invalidated') ||
    text.includes('changed their password') ||
    text.includes('changed the session for security') ||
    text.includes('error validating access token') ||
    text.includes('token is no longer valid') ||
    text.includes('session invalidated')
  ) {
    return 'metaTokenSessionInvalidated';
  }
  if (text.includes('expired') || text.includes('expir')) {
    return 'connectionInvalidPleaseReconnect';
  }
  return null;
}

export function localizeMetaTokenError(
  raw: string | null | undefined,
  t: (key: any) => string,
  fallbackKey = 'connectionInvalidPleaseReconnect',
): string {
  const key = metaTokenErrorTranslationKey(raw) || fallbackKey;
  const translated = t(key as any);
  if (translated && translated !== key) return translated;
  const fallback = t(fallbackKey as any);
  if (fallback && fallback !== fallbackKey) return fallback;
  return (raw || '').trim() || 'Token is no longer valid. Please reconnect.';
}
