import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ImpersonationStatusCard } from './ImpersonationStatusCard';
import ImpersonationEndedScreen from './ImpersonationEndedScreen';
import {
  getSupersededCompanyName,
  isTabSuperseded,
  markTabSuperseded,
  subscribeImpersonationEnded,
  subscribeImpersonationSupersession,
} from '../utils/impersonation';

/**
 * Enforces one active CRM session per browser profile.
 * When another tab starts impersonation, this tab stops without clearing
 * shared localStorage tokens (owned by the new tab).
 * When this tab ends its own impersonation, it shows the ended screen.
 */
const ImpersonationSessionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useAppContext();
  const [ended, setEnded] = useState(false);
  const [superseded, setSuperseded] = useState(() => isTabSuperseded());
  const [companyName, setCompanyName] = useState(() => getSupersededCompanyName());

  useEffect(() => {
    return subscribeImpersonationSupersession((event) => {
      markTabSuperseded({ companyName: event.companyName, sid: event.sid });
      setCompanyName(event.companyName || '');
      setSuperseded(true);
    });
  }, []);

  useEffect(() => subscribeImpersonationEnded(() => setEnded(true)), []);

  if (ended) {
    return <ImpersonationEndedScreen />;
  }

  if (!superseded) {
    return <>{children}</>;
  }

  return (
    <ImpersonationStatusCard
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6" aria-hidden>
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      }
      title={t('impersonationSupersededTitle')}
      description={
        companyName
          ? t('impersonationSupersededMessageWithCompany').replace('{company}', companyName)
          : t('impersonationSupersededMessage')
      }
      actions={
        <button
          type="button"
          onClick={() => window.close()}
          className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          {t('impersonationCloseTab')}
        </button>
      }
      hint={t('impersonationCloseTabHint')}
    />
  );
};

export default ImpersonationSessionGuard;
