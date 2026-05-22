
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { getLocalizedApiErrorMessage } from '../../utils/apiErrorMessage';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    itemName?: string;
    confirmButtonText?: string;
    confirmButtonVariant?: 'danger' | 'primary';
    showWarning?: boolean;
    showSuccessMessage?: boolean;
    successMessage?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    itemName,
    confirmButtonText,
    confirmButtonVariant = 'danger',
    showWarning = true,
    showSuccessMessage = true,
    successMessage,
}) => {
    const { t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setErrorMessage('');
        }
    }, [isOpen, title, message]);

    const handleClose = () => {
        setErrorMessage('');
        onClose();
    };

    const handleConfirm = async () => {
        setErrorMessage('');
        setIsDeleting(true);
        try {
            await onConfirm();
            
            // Close modal immediately
            handleClose();
            
            // Show success message only if enabled
            if (showSuccessMessage) {
                setSuccessMessage(successMessage || t('itemDeletedSuccessfully') || 'Item deleted successfully!');
                setIsSuccessModalOpen(true);
            }
        } catch (error: any) {
            console.error('Error in confirm action:', error);
            setErrorMessage(getLocalizedApiErrorMessage(error, t, 'errorDeletingItem'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title}>
            <div className="space-y-4">
                {errorMessage && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errorMessage}
                    </div>
                )}
                <p className="text-gray-700 dark:text-gray-300">
                    {itemName ? (
                        <>
                            {message} <span className="font-bold">{itemName}</span>? {showWarning && (t('confirmDeleteWarning') || 'This action cannot be undone.')}
                        </>
                    ) : (
                        <>
                            {message} {showWarning && (t('confirmDeleteWarning') || 'This action cannot be undone.')}
                        </>
                    )}
                </p>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={handleClose} disabled={isDeleting}>
                        {t('cancel')}
                    </Button>
                    <Button 
                        variant={confirmButtonVariant} 
                        onClick={handleConfirm} 
                        disabled={isDeleting} 
                        loading={isDeleting}
                    >
                        {confirmButtonText || t('delete')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

