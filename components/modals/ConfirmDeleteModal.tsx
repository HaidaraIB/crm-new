
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';

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
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
            
            // Close modal immediately
            onClose();
            
            // Show success message only if enabled
            if (showSuccessMessage) {
                setSuccessMessage(successMessage || t('itemDeletedSuccessfully') || 'Item deleted successfully!');
                setIsSuccessModalOpen(true);
            }
        } catch (error: any) {
            console.error('Error in confirm action:', error);
            alert(error?.message || t('errorDeletingItem') || 'Failed to complete action. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
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
                    <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
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

