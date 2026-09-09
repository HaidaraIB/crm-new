import React from 'react';
import { Loader } from './Loader';
import { useAppContext } from '../context/AppContext';

type PageLoadingStateProps = {
  className?: string;
  label?: string;
};

export const PageLoadingState = ({ className = '', label }: PageLoadingStateProps) => {
  const { t } = useAppContext();
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ minHeight: 'calc(100vh - 200px)' }}>
      <Loader variant="primary" size="lg" label={label ?? t('loading')} />
    </div>
  );
};
