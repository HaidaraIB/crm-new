import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  getSupersededCompanyName,
  isTabSuperseded,
  markTabSuperseded,
  subscribeImpersonationSupersession,
} from '../utils/impersonation';

/**
 * Enforces one active CRM session per browser profile.
 * When another tab starts impersonation, this tab stops without clearing
 * shared localStorage tokens (owned by the new tab).
 */
const ImpersonationSessionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, language } = useAppContext();
  const [superseded, setSuperseded] = useState(() => isTabSuperseded());
  const [companyName, setCompanyName] = useState(() => getSupersededCompanyName());

  useEffect(() => {
    return subscribeImpersonationSupersession((event) => {
      markTabSuperseded({ companyName: event.companyName, sid: event.sid });
      setCompanyName(event.companyName || '');
      setSuperseded(true);
    });
  }, []);

  if (!superseded) {
    return <>{children}</>;
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 ${
        language === 'ar' ? 'font-arabic' : ''
      }`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-amber-200 dark:border-amber-800">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6" aria-hidden>
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('impersonationSupersededTitle')}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          {companyName
            ? t('impersonationSupersededMessageWithCompany').replace('{company}', companyName)
            : t('impersonationSupersededMessage')}
        </p>
        <button
          type="button"
          onClick={() => window.close()}
          className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          {t('impersonationCloseTab')}
        </button>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('impersonationCloseTabHint')}</p>
      </div>
    </div>
  );
};

export default ImpersonationSessionGuard;
