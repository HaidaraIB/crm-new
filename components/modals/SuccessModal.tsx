
import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';

export const SuccessModal = () => {
    const { 
        isSuccessModalOpen, 
        setIsSuccessModalOpen, 
        successMessage,
        t 
    } = useAppContext();

    useEffect(() => {
        if (isSuccessModalOpen && successMessage) {
            const timer = setTimeout(() => {
                setIsSuccessModalOpen(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isSuccessModalOpen, successMessage, setIsSuccessModalOpen]);

    return (
        <Modal 
            isOpen={isSuccessModalOpen} 
            onClose={() => setIsSuccessModalOpen(false)}
            title={t('success') || 'Success'}
        >
            <div className="space-y-4">
                <div className="flex items-center justify-center py-4">
                    <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-3">
                        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
                <p className="text-center text-gray-700 dark:text-gray-300 text-base">
                    {successMessage}
                </p>
                <div className="flex justify-center pt-2">
                    <Button onClick={() => setIsSuccessModalOpen(false)}>
                        {t('close') || 'Close'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

