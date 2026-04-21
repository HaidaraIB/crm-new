import React from 'react';
import { Loader } from './Loader';

type SectionLoadingStateProps = {
  className?: string;
  label?: string;
};

export const SectionLoadingState = ({ className = 'py-8', label = 'Loading section' }: SectionLoadingStateProps) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader variant="primary" size="md" label={label} />
    </div>
  );
};
