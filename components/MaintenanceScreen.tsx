import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from './Button';
import {
  resolveMaintenanceDisplayMessage,
  type MaintenanceRetryResult,
} from '../utils/maintenanceDisplay';

type MaintenanceScreenProps = {
  message: string;
  onRetry: () => Promise<MaintenanceRetryResult>;
};

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ message, onRetry }) => {
  const { t, language, theme } = useAppContext();
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<{
    variant: 'info' | 'warning' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const displayMessage = resolveMaintenanceDisplayMessage(
    message,
    t('maintenanceModeDescription'),
  );

  const handleRetry = async () => {
    setIsChecking(true);
    setFeedback({ variant: 'info', text: t('maintenanceModeChecking') });
    try {
      const result = await onRetry();
      if (result === 'online') {
        return;
      }
      if (result === 'maintenance') {
        setFeedback({ variant: 'warning', text: t('maintenanceModeStillActive') });
      } else {
        setFeedback({ variant: 'error', text: t('maintenanceModeCheckFailed') });
      }
    } finally {
      setIsChecking(false);
    }
  };

  const feedbackStyles = {
    info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    warning:
      'bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800',
    error: 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className={`min-h-screen flex flex-col items-center justify-center px-6 ${
        language === 'ar' ? 'font-arabic' : 'font-sans'
      } ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            theme === 'dark' ? 'bg-amber-900/40' : 'bg-amber-100'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-8 w-8 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 5a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z"
            />
          </svg>
        </div>
        <h1 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {t('maintenanceModeTitle')}
        </h1>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{displayMessage}</p>

        {feedback ? (
          <p
            role="status"
            aria-live="polite"
            className={`text-sm rounded-lg border px-4 py-3 ${feedbackStyles[feedback.variant]}`}
          >
            {feedback.text}
          </p>
        ) : null}

        <Button
          type="button"
          variant="primary"
          className="w-full"
          loading={isChecking}
          disabled={isChecking}
          onClick={() => void handleRetry()}
        >
          {t('maintenanceModeRetry')}
        </Button>
      </div>
    </div>
  );
};
