import { Page } from '../types';

const STORAGE_KEY = 'crm:leadsReturnPage';

const LEADS_FAMILY_PAGES: ReadonlySet<Page> = new Set([
    'Leads',
    'All Leads',
    'Fresh Leads',
    'Hot Leads',
    'Cold Leads',
    'My Leads',
    'Rotated Leads',
]);

/** Remember which Leads-family page (Leads/Fresh/Hot/Cold/My/Rotated/All) opened a lead's detail view. */
export const setLeadsReturnPage = (page: Page): void => {
    try {
        sessionStorage.setItem(STORAGE_KEY, page);
    } catch {
        // Ignore storage errors (private mode, etc.)
    }
};

/** Get the Leads-family page to return to from the lead detail view's back button. */
export const getLeadsReturnPage = (): Page => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw && LEADS_FAMILY_PAGES.has(raw as Page)) return raw as Page;
    } catch {
        // Ignore storage errors
    }
    // 'Leads' itself isn't a directly-navigable sidebar destination (it's the
    // collapsible parent whose sub-items are the actual routes) — fall back to
    // 'All Leads', which every role's sidebar exposes.
    return 'All Leads';
};
