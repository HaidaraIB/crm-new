import React from 'react';
import {
    entitlementLabel,
    formatLimitValue,
    getSortedEnabledFeatureKeys,
    getSortedUsageEntries,
    type PlanLanguage,
} from '../utils/planEntitlements';

export type PlanEntitlementsLabels = {
    featuresTitle: string;
    monthlyUsageTitle: string;
    none: string;
};

type Props = {
    features?: Record<string, boolean>;
    usage_limits_monthly?: Record<string, number | 'unlimited' | null>;
    language: PlanLanguage;
    labels: PlanEntitlementsLabels;
    className?: string;
};

export const PlanEntitlementsSummary: React.FC<Props> = ({
    features,
    usage_limits_monthly,
    language,
    labels,
    className = '',
}) => {
    const featureKeys = getSortedEnabledFeatureKeys(features);
    const usageRows = getSortedUsageEntries(usage_limits_monthly);

    return (
        <div
            className={`mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 space-y-3 text-xs ${className}`.trim()}
        >
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

            {usageRows.length > 0 && (
                <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{labels.monthlyUsageTitle}</p>
                    <ul className="space-y-1.5">
                        {usageRows.map(([k, v]) => (
                            <li key={k} className="flex justify-between gap-3 text-secondary">
                                <span className="min-w-0">{entitlementLabel(k, language)}</span>
                                <span className="shrink-0 font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                                    {formatLimitValue(v, language)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
