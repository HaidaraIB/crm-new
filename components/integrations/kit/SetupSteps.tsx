import React from 'react';

export const SetupSteps: React.FC<{
  title: string;
  steps: string[];
  action?: React.ReactNode;
}> = ({ title, steps, action }) => (
  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/50">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
      {action}
    </div>
    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
      {steps.map((text, index) => (
        <li key={index}>{text}</li>
      ))}
    </ol>
  </div>
);
