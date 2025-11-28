
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';

export const DeleteUserModal = () => {
    const { isDeleteUserModalOpen, setIsDeleteUserModalOpen, selectedUser, t, deleteUser } = useAppContext();

    const handleDelete = () => {
        if (selectedUser) {
            deleteUser(selectedUser.id);
        }
        setIsDeleteUserModalOpen(false);
    };

    if (!selectedUser) return null;

    return (
        <Modal isOpen={isDeleteUserModalOpen} onClose={() => setIsDeleteUserModalOpen(false)} title={t('deleteEmployee')}>
            <div className="space-y-4">
                <p>{t('confirmDeleteEmployee1')} <span className="font-bold">{selectedUser.name}</span>{t('confirmDeleteEmployee2')}</p>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setIsDeleteUserModalOpen(false)}>{t('cancel')}</Button>
                    <Button variant="danger" onClick={handleDelete}>{t('deleteEmployee')}</Button>
                </div>
            </div>
        </Modal>
    );
};
