
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useDeleteDeveloper } from '../../hooks/useQueries';
import { Modal } from '../Modal';
import { Button } from '../Button';

export const DeleteDeveloperModal = () => {
    const { isDeleteDeveloperModalOpen, setIsDeleteDeveloperModalOpen, deletingDeveloper, setDeletingDeveloper, t } = useAppContext();
    const deleteDeveloperMutation = useDeleteDeveloper();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (!deletingDeveloper) return;

        setIsLoading(true);
        setSuccessMessage('');
        setError('');
        try {
            await deleteDeveloperMutation.mutateAsync(deletingDeveloper.id);
            
            // Success - show message and close after a delay
            setSuccessMessage(t('developerDeletedSuccessfully') || 'Developer deleted successfully!');
            
            // Close modal after showing success message
            setTimeout(() => {
                setIsDeleteDeveloperModalOpen(false);
                setDeletingDeveloper(null);
                setSuccessMessage('');
                setError('');
            }, 1500);
        } catch (error: any) {
            console.error('Error deleting developer:', error);
            setError(
                error?.message ||
                    t('errorDeletingDeveloper') ||
                    'Failed to delete developer. Please try again.'
            );
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
            setError('');
        }} title={t('deleteDeveloper') || 'Delete Developer'}>
            <div className="space-y-4">
                {successMessage && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 px-4 py-3 rounded-md text-sm">
                        {successMessage}
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {error}
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
                                setError('');
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

