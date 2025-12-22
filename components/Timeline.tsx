import React, { useState } from 'react';
import { TimelineEntry as TimelineEntryType } from '../types';
import { ClockIcon } from './icons';

type TimelineProps = {
    history: TimelineEntryType[];
};

// Avatar component with fallback
const Avatar = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
    const [imgError, setImgError] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Generate initials from name
    const getInitials = (name: string): string => {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]);
        }
        return name.substring(0, 2);
    };

    // Fallback avatar with initials
    const fallbackAvatar = (
        <div className={`${className || 'h-10 w-10'} rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white font-semibold text-sm border-2 border-gray-200 dark:border-gray-700 shadow-md overflow-hidden`}>
            {getInitials(alt)}
        </div>
    );

    if (imgError || !src) {
        return fallbackAvatar;
    }

    return (
        <div className={`relative ${className || 'h-10 w-10'} rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-md`}>
            <img 
                src={src} 
                alt={alt} 
                className={`w-full h-full object-cover transition-all duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onError={() => setImgError(true)}
                onLoad={() => setImgLoaded(true)}
            />
            {!imgLoaded && !imgError && (
                <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}
        </div>
    );
};

export const Timeline = ({ history }: TimelineProps) => {
    return (
        <div className="space-y-8">
            {history.map(entry => (
                <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <Avatar src={entry.avatar} alt={entry.user} className="h-10 w-10" />
                        <div className="flex-1 w-px bg-gray-300 dark:bg-gray-600 my-2"></div>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{entry.user}</p>
                                    {entry.stage ? (
                                        <span 
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!entry.color ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : ""}`}
                                            style={entry.color ? {
                                                backgroundColor: `${entry.color}20`, // 20 is 12.5% opacity in hex
                                                color: entry.color,
                                                border: `1px solid ${entry.color}40` // 40 is 25% opacity
                                            } : undefined}
                                        >
                                            {entry.stage}
                                        </span>
                                    ) : entry.type === 'event' ? (
                                        <span 
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!entry.color ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200" : ""}`}
                                            style={entry.color ? {
                                                backgroundColor: `${entry.color}20`,
                                                color: entry.color,
                                                border: `1px solid ${entry.color}40`
                                            } : undefined}
                                        >
                                            {entry.action}
                                        </span>
                                    ) : (
                                        <span className="font-normal text-gray-500 dark:text-gray-400">- {entry.action}</span>
                                    )}
                                </div>
                                {entry.stage && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{entry.action}</p>
                                )}
                                {entry.type === 'event' && (entry.oldValue || entry.newValue) && (
                                    <div className="mt-1 flex items-center gap-2 text-sm">
                                        {entry.oldValue && (
                                            <span className="text-gray-500 line-through decoration-gray-400">{entry.oldValue}</span>
                                        )}
                                        {entry.oldValue && entry.newValue && (
                                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
                                            </svg>
                                        )}
                                        {entry.newValue && (
                                            <span className="font-medium text-primary-600 dark:text-primary-400">{entry.newValue}</span>
                                        )}
                                    </div>
                                )}
                                {entry.details && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{entry.details}</p>
                                )}
                            </div>
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
                                <ClockIcon className="w-3 h-3 me-1" />
                                {entry.date}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
