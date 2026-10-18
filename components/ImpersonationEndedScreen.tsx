import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from './Button';
import { ImpersonationStatusCard } from './ImpersonationStatusCard';
import { LogOutIcon } from './icons';

/**
 * Shown when a support (impersonation) session is ended and the browser blocks
 * `window.close()`. Replaces the raw DOM-injected fallback with the app's themed
 * full-screen card.
 */
const ImpersonationEndedScreen: React.FC = () => {
  const { t } = useAppContext();

  return (
    <ImpersonationStatusCard
      icon={<LogOutIcon className="w-6 h-6" aria-hidden />}
      title={t('impersonationEndedTitle')}
      description={t('impersonationEndedMessage')}
      actions={
        <>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              window.location.href = '/login';
            }}
          >
            {t('impersonationBackToLogin')}
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => window.close()}>
            {t('impersonationCloseTab')}
          </Button>
        </>
      }
      hint={t('impersonationCloseTabHint')}
    />
  );
};

export default ImpersonationEndedScreen;
