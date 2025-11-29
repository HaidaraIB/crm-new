
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
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    itemName,
}) => {
    const { t } = useAppContext();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [successMessage, setSuccessMessage] = React.useState('');

    const handleConfirm = async () => {
        setIsDeleting(true);
        setSuccessMessage('');
        try {
            await onConfirm();
            
            // Success - show message and close after a delay
            setSuccessMessage(t('itemDeletedSuccessfully') || 'Item deleted successfully!');
            
            // Close modal after showing success message
            setTimeout(() => {
                onClose();
                setSuccessMessage('');
            }, 1500);
        } catch (error: any) {
            console.error('Error deleting:', error);
            alert(error?.message || t('errorDeletingItem') || 'Failed to delete item. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={() => {
            onClose();
            setSuccessMessage('');
        }} title={title}>
            <div className="space-y-4">
                {successMessage && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 px-4 py-3 rounded-md text-sm">
                        {successMessage}
                    </div>
                )}
                {!successMessage && (
                    <p className="text-gray-700 dark:text-gray-300">
                        {message}
                        {itemName && <span className="font-bold"> {itemName}</span>}
                        {itemName ? '? ' : ' '}
                        {t('confirmDeleteWarning') || 'This action cannot be undone.'}
                    </p>
                )}
                <div className="flex justify-end gap-2">
                    {!successMessage && (
                        <>
                            <Button variant="secondary" onClick={() => {
                                onClose();
                                setSuccessMessage('');
                            }} disabled={isDeleting}>
                                {t('cancel')}
                            </Button>
                            <Button variant="danger" onClick={handleConfirm} disabled={isDeleting} loading={isDeleting}>
                                {t('delete')}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};

