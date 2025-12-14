
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useDeleteUser } from '../../hooks/useQueries';

// Helper function to get user display name
const getUserDisplayName = (user: any, t?: (key: string) => string): string => {
    if (user.name) return user.name;
    if (user.first_name || user.last_name) {
        return [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    }
    return user.username || user.email || (t ? t('unknown') : 'Unknown');
};

export const DeleteUserModal = () => {
    const { isDeleteUserModalOpen, setIsDeleteUserModalOpen, selectedUser, t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    
    // Delete user mutation
    const deleteUserMutation = useDeleteUser();
    const isLoading = deleteUserMutation.isPending;
    
    const [errorMessage, setErrorMessage] = useState('');

    const handleDelete = async () => {
        if (!selectedUser) return;

        setErrorMessage('');

        try {
            await deleteUserMutation.mutateAsync(selectedUser.id);
            
            // Success - close modal and show success message
            setIsDeleteUserModalOpen(false);
            setSuccessMessage(t('employeeDeletedSuccessfully') || 'Employee deleted successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error deleting user:', error);
            
            // Extract error message from API response
            const errorMsg = error?.message || error?.fields?.detail || t('errorDeletingEmployee') || 'Failed to delete employee. Please try again.';
            setErrorMessage(errorMsg);
        }
    };

    if (!selectedUser) return null;

    const displayName = getUserDisplayName(selectedUser, t);

    return (
        <Modal isOpen={isDeleteUserModalOpen} onClose={() => {
            setIsDeleteUserModalOpen(false);
            setErrorMessage('');
        }} title={t('deleteEmployee')}>
            <div className="space-y-4">
                {errorMessage && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errorMessage}
                    </div>
                )}
                <p>{t('confirmDeleteEmployee1')} <span className="font-bold">{displayName}</span>{t('confirmDeleteEmployee2')}</p>
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
