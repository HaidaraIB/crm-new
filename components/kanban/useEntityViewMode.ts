import { useCallback, useState } from 'react';
import type { EntityViewMode } from './types';

const STORAGE_PREFIX = 'crm:viewMode:';

const isViewMode = (value: unknown): value is EntityViewMode =>
    value === 'table' || value === 'board';

const readStoredMode = (entity: string, fallback: EntityViewMode): EntityViewMode => {
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${entity}`);
        if (isViewMode(raw)) return raw;
    } catch {
        // Ignore storage errors (private mode, etc.)
    }
    return fallback;
};

/**
 * Persists table/board preference per entity (e.g. `leads`, `deals`).
 * Defaults to `table` so existing users keep the familiar list view.
 */
export const useEntityViewMode = (
    entity: string,
    defaultMode: EntityViewMode = 'table',
): [EntityViewMode, (mode: EntityViewMode) => void] => {
    const [mode, setModeState] = useState<EntityViewMode>(() =>
        readStoredMode(entity, defaultMode),
    );

    const setMode = useCallback(
        (next: EntityViewMode) => {
            setModeState(next);
            try {
                localStorage.setItem(`${STORAGE_PREFIX}${entity}`, next);
            } catch {
                // Ignore storage errors
            }
        },
        [entity],
    );

    return [mode, setMode];
};
