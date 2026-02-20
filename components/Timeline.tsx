import React, { useState } from 'react';
import { TimelineEntry as TimelineEntryType } from '../types';
import { ClockIcon, PhoneIcon } from './icons';

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
                                    ) : entry.type === 'sms' ? (
                                        <span 
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
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
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5">{entry.details}</p>
                                )}
                                {/* Display call datetime and follow-up date for calls */}
                                {entry.type === 'call' && (entry.callDatetime || entry.followUpDate) && (
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {entry.callDatetime && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <PhoneIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{entry.callDatetime}</span>
                                            </div>
                                        )}
                                        {/* Arrow between call datetime and follow-up date */}
                                        {entry.callDatetime && entry.followUpDate && (
                                            <svg 
                                                className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        )}
                                        {entry.followUpDate && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                <ClockIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                <span className="text-xs font-medium text-green-700 dark:text-green-300">{entry.followUpDate}</span>
                                            </div>
                                        )}
                                    </div>
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
