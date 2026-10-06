import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { translations } from '../../../constants';
import { ConnectionStatus } from './status';

const TONE: Record<ConnectionStatus, string> = {
  connected: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-500/20',
  expired: 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-500/20',
  error: 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-500/20',
  pending: 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-500/20',
  disconnected: 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/80',
  disabled: 'text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/30',
};

const DOT: Record<ConnectionStatus, string> = {
  connected: 'bg-green-500',
  expired: 'bg-amber-500',
  error: 'bg-amber-500',
  pending: 'bg-amber-500',
  disconnected: 'bg-gray-400',
  disabled: 'bg-red-500',
};

const LABEL_KEY: Record<ConnectionStatus, keyof typeof translations.en> = {
  connected: 'connected',
  expired: 'statusExpired',
  error: 'error',
  pending: 'leadApiStatusPending',
  disconnected: 'disconnected',
  disabled: 'integrationStatusDisabled',
};

export const StatusBadge: React.FC<{
  status: ConnectionStatus;
  label?: string;
  className?: string;
}> = ({ status, label, className = '' }) => {
  const { t } = useAppContext();
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${TONE[status]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT[status]}`} />
      {label ?? t(LABEL_KEY[status])}
    </span>
  );
};
