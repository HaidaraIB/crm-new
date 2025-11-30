
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
    const { t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
            
            // Close modal immediately and show success modal
            onClose();
            setSuccessMessage(t('itemDeletedSuccessfully') || 'Item deleted successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error deleting:', error);
            alert(error?.message || t('errorDeletingItem') || 'Failed to delete item. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                    {message}
                    {itemName && <span className="font-bold"> {itemName}</span>}
                    {itemName ? '? ' : ' '}
                    {t('confirmDeleteWarning') || 'This action cannot be undone.'}
                </p>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
                        {t('cancel')}
                    </Button>
                    <Button variant="danger" onClick={handleConfirm} disabled={isDeleting} loading={isDeleting}>
                        {t('delete')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

