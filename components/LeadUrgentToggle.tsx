import React from 'react';
import { ToggleSwitch } from './ToggleSwitch';
import { useAppContext } from '../context/AppContext';
import { isUserOnShiftForUrgent } from '../utils/weekOff';
import { User } from '../types';

type LeadUrgentToggleProps = {
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
    /** Assignee-eligible users used to detect live on-shift staff */
    candidateUsers?: User[];
    companyTimeZone?: string | null;
    /** Soft warning after create when API fell back */
    apiWarning?: string | null;
};

/**
 * Compact urgent flag for the lead form section header (title row).
 * Help text lives in the tooltip; on-shift / API warnings show below when relevant.
 */
export const LeadUrgentToggle = ({
    enabled,
    setEnabled,
    candidateUsers = [],
    companyTimeZone,
    apiWarning,
}: LeadUrgentToggleProps) => {
    const { t } = useAppContext();

    const someoneOnShift = candidateUsers.some((u) =>
        isUserOnShiftForUrgent(u, companyTimeZone)
    );
    const showLiveHint = enabled && !someoneOnShift;
    const help = t('urgentHelp');

    return (
        <div className="space-y-2">
            <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${
                    enabled
                        ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/30'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/60'
                }`}
                title={help}
            >
                <span
                    className={`text-sm font-medium whitespace-nowrap ${
                        enabled
                            ? 'text-orange-800 dark:text-orange-200'
                            : 'text-gray-700 dark:text-gray-300'
                    }`}
                >
                    {t('urgent')}
                </span>
                <ToggleSwitch enabled={enabled} setEnabled={setEnabled} />
            </div>
            {showLiveHint && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                    {t('urgentNoOneOnShift')}
                </div>
            )}
            {apiWarning && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                    {apiWarning}
                </div>
            )}
        </div>
    );
};

/** Small badge for lists / cards / detail. */
export const LeadUrgentBadge = ({ className = '' }: { className?: string }) => {
    const { t } = useAppContext();
    return (
        <span
            className={`inline-flex rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 ${className}`}
        >
            {t('urgent')}
        </span>
    );
};
