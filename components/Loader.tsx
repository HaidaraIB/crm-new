
import React from 'react';

type LoaderProps = {
  className?: string;
  variant?: 'primary' | 'foreground';
};

export const Loader = ({ className = '', variant = 'foreground' }: LoaderProps) => {
    const colorClass = variant === 'primary' ? 'bg-primary' : 'bg-primary-foreground';
    return (
        <div className={`flex items-center justify-center space-x-1 rtl:space-x-reverse h-6 ${className}`}>
            <span className={`w-1.5 h-full ${colorClass} rounded-full animate-bounce-loader`} style={{ animationDelay: '0s' }}></span>
            <span className={`w-1.5 h-full ${colorClass} rounded-full animate-bounce-loader`} style={{ animationDelay: '0.1s' }}></span>
            <span className={`w-1.5 h-full ${colorClass} rounded-full animate-bounce-loader`} style={{ animationDelay: '0.2s' }}></span>
            <span className={`w-1.5 h-full ${colorClass} rounded-full animate-bounce-loader`} style={{ animationDelay: '0.3s' }}></span>
            <span className={`w-1.5 h-full ${colorClass} rounded-full animate-bounce-loader`} style={{ animationDelay: '0.4s' }}></span>
        </div>
    );
};
