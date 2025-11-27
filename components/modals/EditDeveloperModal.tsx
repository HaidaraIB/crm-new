
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { Developer } from '../../types';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const EditDeveloperModal = () => {
    const { isEditDeveloperModalOpen, setIsEditDeveloperModalOpen, t, updateDeveloper, editingDeveloper, setEditingDeveloper } = useAppContext();
    const [formState, setFormState] = useState<Omit<Developer, 'id' | 'code'>>({
        name: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    useEffect(() => {
        if (editingDeveloper) {
            setFormState({
                name: editingDeveloper.name,
            });
        }
    }, [editingDeveloper]);

    const handleClose = () => {
        setIsEditDeveloperModalOpen(false);
        setEditingDeveloper(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDeveloper) return;
        
        if (!validateForm()) {
            return;
        }
        
        try {
            await updateDeveloper({
                ...editingDeveloper,
                ...formState,
            });
            handleClose();
        } catch (error) {
            console.error('Error updating developer:', error);
        }
    };

    if (!editingDeveloper) return null;

    return (
        <Modal isOpen={isEditDeveloperModalOpen} onClose={handleClose} title={`${t('edit')} ${t('developer')}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">{t('developerName')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterDeveloperName')} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose}>{t('cancel')}</Button>
                    <Button type="submit">{t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};
