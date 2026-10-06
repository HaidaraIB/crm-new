export type ConnectionStatus =
  | 'connected'
  | 'expired'
  | 'error'
  | 'pending'
  | 'disconnected'
  | 'disabled';

const KNOWN: ReadonlySet<string> = new Set([
  'connected',
  'expired',
  'error',
  'pending',
  'disconnected',
  'disabled',
]);

/** Map API and legacy UI status strings onto one badge tone. */
export function normalizeConnectionStatus(raw: string | null | undefined): ConnectionStatus {
  const value = (raw || '').trim().toLowerCase();
  if (KNOWN.has(value)) return value as ConnectionStatus;
  return 'disconnected';
}
