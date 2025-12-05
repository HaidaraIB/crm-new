
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';

export const DeleteUserModal = () => {
    const { isDeleteUserModalOpen, setIsDeleteUserModalOpen, selectedUser, t, deleteUser } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleDelete = async () => {
        if (!selectedUser) return;

        setIsLoading(true);
        setSuccessMessage('');

        try {
            await deleteUser(selectedUser.id);
            
            // Success - show message and close after a delay
            setSuccessMessage(t('employeeDeletedSuccessfully') || 'Employee deleted successfully!');
            
            // Close modal after showing success message
            setTimeout(() => {
                setIsDeleteUserModalOpen(false);
                setSuccessMessage('');
            }, 1500);
        } catch (error: any) {
            console.error('Error deleting user:', error);
            alert(error?.message || t('errorDeletingEmployee') || 'Failed to delete employee. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!selectedUser) return null;

    return (
        <Modal isOpen={isDeleteUserModalOpen} onClose={() => {
            setIsDeleteUserModalOpen(false);
            setSuccessMessage('');
        }} title={t('deleteEmployee')}>
            <div className="space-y-4">
                {successMessage && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 px-4 py-3 rounded-md text-sm">
                        {successMessage}
                    </div>
                )}
                <p>{t('confirmDeleteEmployee1')} <span className="font-bold">{selectedUser.name}</span>{t('confirmDeleteEmployee2')}</p>
                <div className="flex justify-end gap-2">
                    <Button 
                        variant="secondary" 
                        onClick={() => {
                            setIsDeleteUserModalOpen(false);
                            setSuccessMessage('');
                        }}
                        disabled={isLoading}
                    >
                        {t('cancel')}
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={handleDelete}
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        {t('deleteEmployee')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
