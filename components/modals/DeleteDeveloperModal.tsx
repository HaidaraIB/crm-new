
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';

export const DeleteDeveloperModal = () => {
    const { isDeleteDeveloperModalOpen, setIsDeleteDeveloperModalOpen, deletingDeveloper, setDeletingDeveloper, t, deleteDeveloper } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleDelete = async () => {
        if (!deletingDeveloper) return;

        setIsLoading(true);
        setSuccessMessage('');
        try {
            await deleteDeveloper(deletingDeveloper.id);
            
            // Success - show message and close after a delay
            setSuccessMessage(t('developerDeletedSuccessfully') || 'Developer deleted successfully!');
            
            // Close modal after showing success message
            setTimeout(() => {
                setIsDeleteDeveloperModalOpen(false);
                setDeletingDeveloper(null);
                setSuccessMessage('');
            }, 1500);
        } catch (error: any) {
            console.error('Error deleting developer:', error);
            alert(error?.message || t('errorDeletingDeveloper') || 'Failed to delete developer. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!deletingDeveloper) return null;

    return (
        <Modal isOpen={isDeleteDeveloperModalOpen} onClose={() => {
            setIsDeleteDeveloperModalOpen(false);
            setDeletingDeveloper(null);
            setSuccessMessage('');
        }} title={t('deleteDeveloper') || 'Delete Developer'}>
            <div className="space-y-4">
                {successMessage && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 px-4 py-3 rounded-md text-sm">
                        {successMessage}
                    </div>
                )}
                {!successMessage && (
                    <p className="text-gray-700 dark:text-gray-300">
                        {t('confirmDeleteDeveloper1') || 'Are you sure you want to delete'} <span className="font-bold">{deletingDeveloper.name}</span>? {t('confirmDeleteDeveloper2') || 'This action cannot be undone.'}
                    </p>
                )}
                <div className="flex justify-end gap-2">
                    {!successMessage && (
                        <>
                            <Button variant="secondary" onClick={() => {
                                setIsDeleteDeveloperModalOpen(false);
                                setDeletingDeveloper(null);
                                setSuccessMessage('');
                            }} disabled={isLoading}>
                                {t('cancel')}
                            </Button>
                            <Button variant="danger" onClick={handleDelete} disabled={isLoading} loading={isLoading}>
                                {t('delete')}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};

