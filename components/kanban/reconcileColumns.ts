/**
 * Board columns keep local state so drag-and-drop and "load more" survive refetches,
 * which means fresh server data (after a delete/edit elsewhere) never lands on its own.
 * Reconcile merges a fresh page-1 snapshot back in: page 1 becomes server truth, and
 * anything loaded past page 1 is kept unless it was on page 1 before and is now gone.
 */
export type ReconcileArgs<T> = {
    /** Current local board state, keyed by column id. */
    current: Record<string, T[]>;
    /** Freshly fetched page-1 items, keyed by column id. */
    fresh: Record<string, T[]>;
    /** Ids that were on page 1 the last time we seeded/reconciled. */
    prevFirstPageIds: Set<string>;
    getItemId: (item: T) => string | number;
};

export type ReconcileResult<T> = {
    next: Record<string, T[]>;
    firstPageIds: Set<string>;
};

export const reconcileKanbanColumns = <T,>({
    current,
    fresh,
    prevFirstPageIds,
    getItemId,
}: ReconcileArgs<T>): ReconcileResult<T> => {
    const firstPageIds = new Set<string>();
    for (const items of Object.values(fresh)) {
        for (const item of items) firstPageIds.add(String(getItemId(item)));
    }

    const next: Record<string, T[]> = {};

    const columnKeys = new Set([...Object.keys(current), ...Object.keys(fresh)]);
    for (const colKey of columnKeys) {
        const freshList = fresh[colKey] || [];
        const currentList = current[colKey] || [];
        // Items past page 1 stay; page-1 items missing from the refetch were deleted or moved.
        const tail = currentList.filter((item) => {
            const id = String(getItemId(item));
            return !firstPageIds.has(id) && !prevFirstPageIds.has(id);
        });
        next[colKey] = [...freshList, ...tail];
    }

    return { next, firstPageIds };
};
