
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { Supplier } from '../../types';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const EditSupplierModal = () => {
    const { isEditSupplierModalOpen, setIsEditSupplierModalOpen, t, updateSupplier, editingSupplier, setEditingSupplier, language } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        contactPerson: '',
        specialization: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingSupplier) {
            setFormState({
                name: editingSupplier.name,
                phone: editingSupplier.phone,
                email: editingSupplier.email,
                address: editingSupplier.address,
                contactPerson: editingSupplier.contactPerson,
                specialization: editingSupplier.specialization,
            });
        }
    }, [editingSupplier]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
    };

    const handleClose = () => {
        setIsEditSupplierModalOpen(false);
        setEditingSupplier(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSupplier || !formState.name) {
            alert(t('fillRequiredFields') || 'Please fill in required fields');
            return;
        }

        setLoading(true);
        try {
            await updateSupplier({
                ...editingSupplier,
                name: formState.name,
                phone: formState.phone || '',
                email: formState.email || '',
                address: formState.address || '',
                contactPerson: formState.contactPerson || '',
                specialization: formState.specialization || '',
            });
            handleClose();
        } catch (error: any) {
            console.error('Error updating supplier:', error);
            const errorMessage = error?.message || t('failedToUpdateSupplier') || 'Failed to update supplier. Please try again.';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!editingSupplier) return null;

    return (
        <Modal isOpen={isEditSupplierModalOpen} onClose={handleClose} title={t('editSupplier') || 'Edit Supplier'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">{t('name')} *</Label>
                    <Input id="name" placeholder={t('enterSupplierName') || 'Enter supplier name'} value={formState.name} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="phone">{t('phone')}</Label>
                        <Input id="phone" placeholder={t('enterPhone') || 'Enter phone'} value={formState.phone} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="email">{t('email')}</Label>
                        <Input id="email" type="email" placeholder={t('enterEmail') || 'Enter email'} value={formState.email} onChange={handleChange} />
                    </div>
                </div>
                <div>
                    <Label htmlFor="address">{t('address')}</Label>
                    <textarea 
                        id="address" 
                        rows={2} 
                        value={formState.address}
                        onChange={handleChange}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" 
                        placeholder={t('enterAddress') || 'Enter address'}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="contactPerson">{t('contactPerson')}</Label>
                        <Input id="contactPerson" placeholder={t('enterContactPerson') || 'Enter contact person'} value={formState.contactPerson} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="specialization">{t('specialization')}</Label>
                        <Input id="specialization" placeholder={t('enterSpecialization') || 'Enter specialization'} value={formState.specialization} onChange={handleChange} />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};

