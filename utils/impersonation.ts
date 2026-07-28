/**
 * Durable CRM impersonation session metadata (localStorage).
 * One active CRM session per browser profile: a new impersonation supersedes other tabs.
 */

export const IMPERSONATION_STORAGE_KEY = 'impersonation';
export const IMPERSONATION_CHANNEL = 'crm-impersonation';
const TAB_ID_KEY = 'crm_tab_id';
const SUPERSEDED_KEY = 'impersonation_superseded';
const LOCAL_SID_KEY = 'impersonation_local_sid';
/** localStorage ping so tabs without BroadcastChannel still learn about supersession */
const BROADCAST_PING_KEY = 'impersonation_broadcast_ping';

export type ImpersonationActor = {
  id: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

export type ImpersonationMeta = {
  active: true;
  sid: number | string;
  companyId?: number | null;
  companyName: string;
  targetUser: ImpersonationActor;
  impersonatedBy: ImpersonationActor;
  /** Tab that owns this impersonation write (sessionStorage-scoped). */
  ownerTabId?: string;
  startedAt?: number;
};

export type ImpersonationLifecycleEvent = {
  type: 'session_started';
  ownerTabId: string;
  sid: number | string;
  companyName?: string;
  at: number;
};

export function getTabId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = sessionStorage.getItem(TAB_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(TAB_ID_KEY, id);
    }
    return id;
  } catch {
    return `tab_${Date.now()}`;
  }
}

export function readImpersonation(): ImpersonationMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.active === true) {
      return parsed as ImpersonationMeta;
    }
  } catch {
    // ignore
  }
  return null;
}

export function isImpersonating(): boolean {
  return readImpersonation()?.active === true;
}

export function writeImpersonation(meta: ImpersonationMeta): void {
  if (typeof window === 'undefined') return;
  const ownerTabId = meta.ownerTabId || getTabId();
  const full: ImpersonationMeta = {
    ...meta,
    active: true,
    ownerTabId,
    startedAt: meta.startedAt ?? Date.now(),
  };
  localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(full));
  try {
    sessionStorage.setItem(LOCAL_SID_KEY, String(full.sid));
    sessionStorage.removeItem(SUPERSEDED_KEY);
  } catch {
    // ignore
  }
}

export function clearImpersonation(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
  try {
    sessionStorage.removeItem(LOCAL_SID_KEY);
    sessionStorage.removeItem(SUPERSEDED_KEY);
  } catch {
    // ignore
  }
}

export function isTabSuperseded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SUPERSEDED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTabSuperseded(payload?: { companyName?: string; sid?: number | string }): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SUPERSEDED_KEY, '1');
    if (payload?.companyName) {
      sessionStorage.setItem('impersonation_superseded_company', payload.companyName);
    }
    if (payload?.sid != null) {
      sessionStorage.setItem('impersonation_superseded_sid', String(payload.sid));
    }
  } catch {
    // ignore
  }
}

export function getSupersededCompanyName(): string {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem('impersonation_superseded_company') || '';
  } catch {
    return '';
  }
}

function postLifecycle(event: ImpersonationLifecycleEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const channel = new BroadcastChannel(IMPERSONATION_CHANNEL);
    channel.postMessage(event);
    channel.close();
  } catch {
    // BroadcastChannel unsupported — fall through to storage ping
  }
  try {
    localStorage.setItem(BROADCAST_PING_KEY, JSON.stringify(event));
  } catch {
    // ignore
  }
}

/**
 * Call after this tab writes a new impersonation session.
 * Other CRM tabs must stop using shared tokens and show a superseded state
 * without clearing localStorage (that would kill the new session).
 */
export function announceNewImpersonationSession(meta: ImpersonationMeta): void {
  const ownerTabId = meta.ownerTabId || getTabId();
  postLifecycle({
    type: 'session_started',
    ownerTabId,
    sid: meta.sid,
    companyName: meta.companyName,
    at: Date.now(),
  });
}

export type ImpersonationSupersedeHandler = (event: ImpersonationLifecycleEvent) => void;

/**
 * Subscribe to "another tab started impersonation / took the CRM session".
 * Returns an unsubscribe function.
 */
export function subscribeImpersonationSupersession(
  onSuperseded: ImpersonationSupersedeHandler
): () => void {
  if (typeof window === 'undefined') return () => {};

  const myTabId = getTabId();

  const handleEvent = (event: ImpersonationLifecycleEvent) => {
    if (!event || event.type !== 'session_started') return;
    if (event.ownerTabId === myTabId) return;
    onSuperseded(event);
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(IMPERSONATION_CHANNEL);
    channel.onmessage = (msg) => {
      handleEvent(msg.data as ImpersonationLifecycleEvent);
    };
  } catch {
    channel = null;
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key === BROADCAST_PING_KEY && e.newValue) {
      try {
        handleEvent(JSON.parse(e.newValue) as ImpersonationLifecycleEvent);
      } catch {
        // ignore
      }
      return;
    }
    if (e.key === IMPERSONATION_STORAGE_KEY && e.newValue) {
      try {
        const meta = JSON.parse(e.newValue) as ImpersonationMeta;
        if (meta?.active && meta.ownerTabId && meta.ownerTabId !== myTabId) {
          handleEvent({
            type: 'session_started',
            ownerTabId: meta.ownerTabId,
            sid: meta.sid,
            companyName: meta.companyName,
            at: Date.now(),
          });
        }
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener('storage', onStorage);
    try {
      channel?.close();
    } catch {
      // ignore
    }
  };
}

/** Module-level single-flight for code exchange (survives React Strict Mode remounts). */
const exchangeInflight = new Map<string, Promise<unknown>>();
const exchangeDone = new Map<string, unknown>();

export function getOrStartExchange<T>(code: string, start: () => Promise<T>): Promise<T> {
  const cached = exchangeDone.get(code);
  if (cached !== undefined) {
    return Promise.resolve(cached as T);
  }
  const existing = exchangeInflight.get(code);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = start()
    .then((result) => {
      exchangeDone.set(code, result);
      exchangeInflight.delete(code);
      return result;
    })
    .catch((err) => {
      exchangeInflight.delete(code);
      throw err;
    });
  exchangeInflight.set(code, promise);
  return promise;
}
