import React from 'react';
import {
    entitlementLabel,
    formatLimitValue,
    getSortedEnabledFeatureKeys,
    getSortedLimitEntries,
    type PlanLanguage,
} from '../utils/planEntitlements';

export type PlanEntitlementsLabels = {
    resourceLimitsTitle: string;
    featuresTitle: string;
    none: string;
};

type Props = {
    users?: number | string | null;
    clients?: number | string | null;
    extra_limits?: Record<string, number | 'unlimited' | null>;
    features?: Record<string, boolean>;
    language: PlanLanguage;
    labels: PlanEntitlementsLabels;
    className?: string;
};

export const PlanEntitlementsSummary: React.FC<Props> = ({
    users,
    clients,
    extra_limits,
    features,
    language,
    labels,
    className = '',
}) => {
    const normalizedLimits: Record<string, number | 'unlimited' | null> = {
        ...(extra_limits || {}),
    };
    if (users !== undefined && users !== null && users !== '') {
        normalizedLimits.max_employees = users === 'unlimited' ? 'unlimited' : Number(users);
    }
    if (clients !== undefined && clients !== null && clients !== '') {
        normalizedLimits.max_clients = clients === 'unlimited' ? 'unlimited' : Number(clients);
    }

    const limitRows = getSortedLimitEntries(normalizedLimits).filter(([k]) => k !== 'max_users');
    const featureKeys = getSortedEnabledFeatureKeys(features);

    return (
        <div
            className={`mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 space-y-3 text-xs ${className}`.trim()}
        >
            <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{labels.resourceLimitsTitle}</p>
                {limitRows.length === 0 ? (
                    <p className="text-secondary">{labels.none}</p>
                ) : (
                    <ul className="space-y-1.5">
                        {limitRows.map(([k, v]) => (
                            <li key={k} className="flex justify-between gap-3 text-secondary">
                                <span className="min-w-0">{entitlementLabel(k, language)}</span>
                                <span className="shrink-0 font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                                    {formatLimitValue(v, language)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{labels.featuresTitle}</p>
                {featureKeys.length === 0 ? (
                    <p className="text-secondary">{labels.none}</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {featureKeys.map((k) => (
                            <span
                                key={k}
                                className="inline-flex items-center gap-1 rounded-full border border-primary-500/35 dark:border-primary-400/40 bg-primary-50/90 dark:bg-primary-900/25 px-2.5 py-1 text-xs text-primary-800 dark:text-primary-200"
                            >
                                <svg
                                    className="w-3.5 h-3.5 shrink-0 text-primary-600 dark:text-primary-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {entitlementLabel(k, language)}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
