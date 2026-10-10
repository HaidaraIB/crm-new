import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { formatDealMoney } from '../../utils/deals/dealFormatters';
import type { DealSummary } from '../../types';

export const DealSummaryBar = ({ summary }: { summary?: DealSummary }) => {
  const { t } = useAppContext();
  const tiles = [
    { label: t('dealOpenValue'), value: formatDealMoney(summary?.openValue) },
    { label: t('dealWeightedForecast'), value: formatDealMoney(summary?.weightedForecast) },
    { label: t('dealWonPeriod'), value: String(summary?.wonThisPeriod.count ?? 0) },
    { label: t('winRate'), value: `${summary?.winRate ?? 0}%` },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card px-4 py-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{tile.label}</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white tabular-nums">{tile.value}</p>
        </div>
      ))}
    </div>
  );
};
