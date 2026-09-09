import React from 'react';
import { Loader } from './Loader';
import { useAppContext } from '../context/AppContext';

type SectionLoadingStateProps = {
  className?: string;
  label?: string;
};

export const SectionLoadingState = ({ className = 'py-8', label }: SectionLoadingStateProps) => {
  const { t } = useAppContext();
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader variant="primary" size="md" label={label ?? t('loading')} />
    </div>
  );
};
