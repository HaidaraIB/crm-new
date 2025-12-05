import React from 'react';
import { TimelineEntry as TimelineEntryType } from '../types';
import { ClockIcon } from './icons';

type TimelineProps = {
    history: TimelineEntryType[];
};

export const Timeline = ({ history }: TimelineProps) => {
    return (
        <div className="space-y-8">
            {history.map(entry => (
                <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <img src={entry.avatar} alt={entry.user} className="h-10 w-10 rounded-full" />
                        <div className="flex-1 w-px bg-gray-300 dark:bg-gray-600 my-2"></div>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{entry.user}</p>
                                    {entry.stage ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            {entry.stage}
                                        </span>
                                    ) : (
                                        <span className="font-normal text-gray-500 dark:text-gray-400">- {entry.action}</span>
                                    )}
                                </div>
                                {entry.stage && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{entry.action}</p>
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
