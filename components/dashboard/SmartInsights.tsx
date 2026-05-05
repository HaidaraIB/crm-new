import React from 'react';
import { dashboardSurface } from './dashboardStyles';

type SmartInsightsProps = {
  title: string;
  insights: string[];
};

export const SmartInsights = ({ title, insights }: SmartInsightsProps) => {
  if (insights.length === 0) return null;

  return (
    <div
      className={`${dashboardSurface} p-5 sm:p-6 bg-gradient-to-br from-primary-50/90 via-white to-blue-50/80 dark:from-primary-950/50 dark:via-gray-900/95 dark:to-blue-950/40 border-0 ring-1 ring-primary-200/50 dark:ring-primary-800/40`}
    >
      <h2 className="text-xs font-bold uppercase tracking-widest text-primary-700 dark:text-primary-300 mb-3">{title}</h2>
      <div className="space-y-2">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="flex gap-3 items-start rounded-xl bg-white/70 dark:bg-gray-950/30 px-3 py-2.5 backdrop-blur-sm border border-gray-100/90 dark:border-gray-700/60"
          >
            <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-gradient-to-br from-primary-500 to-blue-600 shrink-0" />
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">{insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
