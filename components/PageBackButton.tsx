import React from 'react';
import { useAppContext } from '../context/AppContext';
import { goToPreviousPage } from '../utils/routing';
import { ArrowLeftIcon } from './icons';

type PageBackButtonProps = {
  /** Used when this page was opened directly and there is no previous in-app page. */
  fallback?: () => void;
  /** Replaces the default history behavior. Lead view uses this to restore chat context. */
  onClick?: () => void;
};

export const PageBackButton: React.FC<PageBackButtonProps> = ({ fallback, onClick }) => {
  const { t } = useAppContext();
  return (
    <button
      type="button"
      onClick={onClick ?? (() => goToPreviousPage(fallback ?? (() => undefined)))}
      className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
      title={t('back')}
      aria-label={t('back')}
    >
      <ArrowLeftIcon className="h-5 w-5 shrink-0" />
    </button>
  );
};
