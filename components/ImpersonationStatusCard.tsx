import React from 'react';
import { useAppContext } from '../context/AppContext';

type ImpersonationStatusCardProps = {
  /** Icon shown inside the amber circle (pass a 24px-stroke icon, e.g. `<LogOutIcon className="w-6 h-6" />`). */
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  actions: React.ReactNode;
  /** Optional fine print under the actions. */
  hint?: React.ReactNode;
};

/**
 * Full-screen status card for impersonation lifecycle states (superseded / ended).
 * Same visual language as `MaintenanceScreen`: centered card, amber icon badge,
 * themed background, dark mode and RTL. Banners render on top of the app; these
 * screens replace it.
 */
export const ImpersonationStatusCard: React.FC<ImpersonationStatusCardProps> = ({
  icon,
  title,
  description,
  actions,
  hint,
}) => {
  const { language } = useAppContext();

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 ${
        language === 'ar' ? 'font-arabic' : 'font-sans'
      }`}
    >
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-amber-200 dark:border-amber-800">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300">
          {icon}
        </div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{description}</p>
        <div className="flex flex-col gap-3">{actions}</div>
        {hint ? <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
      </div>
    </div>
  );
};
