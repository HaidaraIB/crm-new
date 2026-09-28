import type { Page } from '../types';

const STORAGE_KEY = 'crm:leadReturnTarget';
const CALLS_TAB_KEY = 'crm:pendingCallsTab';

const LEAD_DETAIL_PAGES: ReadonlySet<Page> = new Set(['ViewLead', 'EditLead', 'CreateLead']);

const CALLS_TABS = new Set(['history', 'live', 'team', 'hours', 'error-logs']);

export type LeadOpenExtras = {
  /** Number the Chats page should reopen for this lead. */
  chatPhone?: string;
  /** Inbox thread to reselect when returning. */
  inboxConversationId?: number;
  /** Calls page tab to restore (history, error-logs, …). */
  callsTab?: string;
};

export type LeadReturnTarget = {
  page: Page;
  chatPhone?: string | null;
  inboxConversationId?: number | null;
  callsTab?: string | null;
};

export function isLeadDetailPage(page: Page): boolean {
  return LEAD_DETAIL_PAGES.has(page);
}

/** Remember the screen that opened lead details. Edit/create/view do not overwrite it. */
export function setLeadReturnTarget(target: LeadReturnTarget): void {
  if (isLeadDetailPage(target.page)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(target));
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
}

/** Read and clear the screen to return to from lead details. */
export function consumeLeadReturnTarget(): LeadReturnTarget | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeadReturnTarget;
    if (!parsed || typeof parsed.page !== 'string' || isLeadDetailPage(parsed.page)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function stashPendingCallsTab(tab: string | null | undefined): void {
  if (!tab || !CALLS_TABS.has(tab)) return;
  try {
    sessionStorage.setItem(CALLS_TAB_KEY, tab);
  } catch {
    // ignore
  }
}

export function consumePendingCallsTab(): string | null {
  try {
    const raw = sessionStorage.getItem(CALLS_TAB_KEY);
    sessionStorage.removeItem(CALLS_TAB_KEY);
    return raw && CALLS_TABS.has(raw) ? raw : null;
  } catch {
    return null;
  }
}
