import React from 'react';
import { Loader } from './Loader';

type PageLoadingStateProps = {
  className?: string;
  label?: string;
};

export const PageLoadingState = ({ className = '', label = 'Loading page' }: PageLoadingStateProps) => {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ minHeight: 'calc(100vh - 200px)' }}>
      <Loader variant="primary" size="lg" label={label} />
    </div>
  );
};
