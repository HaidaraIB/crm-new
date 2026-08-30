import { useCallback, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const STORAGE_PREFIX = 'crm:pageSize:';
const DEFAULT_PAGE_SIZE: PageSize = 20;

const isPageSize = (value: unknown): value is PageSize =>
    PAGE_SIZE_OPTIONS.includes(Number(value) as PageSize);

const readStoredPageSize = (entity: string, fallback: PageSize): PageSize => {
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${entity}`);
        if (isPageSize(raw)) return Number(raw) as PageSize;
    } catch {
        // Ignore storage errors (private mode, etc.)
    }
    return fallback;
};

/**
 * Persists the 20/50/100 per-page preference per entity (e.g. `leads`, `deals`).
 * Defaults to 20 so existing users keep the familiar list length.
 */
export const usePersistedPageSize = (
    entity: string,
    defaultSize: PageSize = DEFAULT_PAGE_SIZE,
): [PageSize, (next: number) => void] => {
    const [pageSize, setPageSizeState] = useState<PageSize>(() =>
        readStoredPageSize(entity, defaultSize),
    );

    const setPageSize = useCallback(
        (next: number) => {
            if (!isPageSize(next)) return;
            setPageSizeState(next);
            try {
                localStorage.setItem(`${STORAGE_PREFIX}${entity}`, String(next));
            } catch {
                // Ignore storage errors
            }
        },
        [entity],
    );

    return [pageSize, setPageSize];
};
