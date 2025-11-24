
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <select id={id} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100">
        {children}
    </select>
);

export const EditUserModal = () => {
    const { isEditUserModalOpen, setIsEditUserModalOpen, selectedUser, t, updateUser } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        role: 'Employee' as string,
    });
    const [loading, setLoading] = useState(false);

    // Initialize form state when modal opens or selectedUser changes
    useEffect(() => {
        if (selectedUser && isEditUserModalOpen) {
            setFormState({
                name: selectedUser.name || '',
                phone: selectedUser.phone || '',
                email: selectedUser.email || '',
                password: '',
                role: selectedUser.role === 'Owner' ? 'Owner' : 'Employee', // فقط Owner أو Employee
            });
        }
    }, [selectedUser, isEditUserModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id.replace('edit-user-', '')]: value }));
    };

    const handleClose = () => {
        setIsEditUserModalOpen(false);
        setFormState({
            name: '',
            phone: '',
            email: '',
            password: '',
            role: 'Employee',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setLoading(true);
        try {
            await updateUser(selectedUser.id, {
                name: formState.name,
                phone: formState.phone,
                email: formState.email,
                password: formState.password || undefined,
                role: selectedUser.role === 'Owner' ? 'Owner' : formState.role, // لا يمكن تغيير دور Owner
            });
            handleClose();
        } catch (error: any) {
            console.error('Error updating user:', error);
            alert(error?.message || t('errorUpdatingUser') || 'Failed to update user. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!selectedUser) return null;

    return (
        <Modal isOpen={isEditUserModalOpen} onClose={handleClose} title={`${t('editUser')}: ${selectedUser.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="edit-user-name">{t('name')}</Label>
                    <Input id="edit-user-name" value={formState.name} onChange={handleChange} required />
                </div>
                <div>
                    <Label htmlFor="edit-user-phone">{t('phone')}</Label>
                    <Input id="edit-user-phone" value={formState.phone} onChange={handleChange} />
                </div>
                <div>
                    <Label htmlFor="edit-user-email">{t('email')}</Label>
                    <Input id="edit-user-email" type="email" value={formState.email} onChange={handleChange} required />
                </div>
                <div>
                    <Label htmlFor="edit-user-password">{t('newUserPassword')}</Label>
                    <Input id="edit-user-password" type="password" value={formState.password} onChange={handleChange} placeholder={t('leaveBlankPassword')} />
                </div>
                {selectedUser.role !== 'Owner' && (
                    <div>
                        <Label htmlFor="edit-user-role">{t('role')}</Label>
                        <Select id="edit-user-role" value={formState.role} onChange={handleChange}>
                            <option value="Employee">{t('employee')}</option>
                        </Select>
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};
