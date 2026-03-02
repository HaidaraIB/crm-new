
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';

export type AlertVariant = 'info' | 'warning' | 'error';

export const AlertModal = () => {
    const {
        isAlertModalOpen,
        setIsAlertModalOpen,
        alertMessage,
        alertVariant = 'info',
        t,
    } = useAppContext();

    const titleByVariant: Record<AlertVariant, string> = {
        info: t('notice') || 'Notice',
        warning: t('warning') || 'Warning',
        error: t('error') || 'Error',
    };

    const iconByVariant: Record<AlertVariant, { bg: string; path: string }> = {
        info: {
            bg: 'bg-blue-100 dark:bg-blue-900/20',
            path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        },
        warning: {
            bg: 'bg-amber-100 dark:bg-amber-900/20',
            path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        },
        error: {
            bg: 'bg-red-100 dark:bg-red-900/20',
            path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
        },
    };

    const iconColorByVariant: Record<AlertVariant, string> = {
        info: 'text-blue-600 dark:text-blue-400',
        warning: 'text-amber-600 dark:text-amber-400',
        error: 'text-red-600 dark:text-red-400',
    };

    const { bg, path } = iconByVariant[alertVariant];
    const iconColor = iconColorByVariant[alertVariant];

    return (
        <Modal
            isOpen={isAlertModalOpen}
            onClose={() => setIsAlertModalOpen(false)}
            title={titleByVariant[alertVariant]}
        >
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className={`rounded-full p-2 shrink-0 ${bg}`}>
                        <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
                        </svg>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-base pt-0.5 flex-1">
                        {alertMessage}
                    </p>
                </div>
                <div className="flex justify-end pt-2">
                    <Button onClick={() => setIsAlertModalOpen(false)}>
                        {t('ok') || 'OK'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
