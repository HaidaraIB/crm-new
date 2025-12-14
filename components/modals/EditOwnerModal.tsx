
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { PhoneInput } from '../PhoneInput';
import { Button } from '../Button';
import { useUpdateOwner } from '../../hooks/useQueries';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange, className }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string; }) => {
    const borderClass = className?.includes('border-red') ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600';
    const baseClassName = className?.replace(/border-\S+/g, '').trim() || '';
    return (
        <select id={id} value={value} onChange={onChange} className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 ${borderClass} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${baseClassName}`}>
            {children}
        </select>
    );
};

export const EditOwnerModal = () => {
    const { isEditOwnerModalOpen, setIsEditOwnerModalOpen, t, editingOwner, setEditingOwner, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    
    // Update owner mutation
    const updateOwnerMutation = useUpdateOwner();
    const isLoading = updateOwnerMutation.isPending;
    
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        city: '',
        district: '',
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
        if (editingOwner) {
            setFormState({
                name: editingOwner.name,
                phone: editingOwner.phone,
                city: editingOwner.city,
                district: editingOwner.district,
            });
        }
    }, [editingOwner]);

    const handleClose = () => {
        setIsEditOwnerModalOpen(false);
        setEditingOwner(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handlePhoneChange = (value: string) => {
        setFormState(prev => ({ ...prev, phone: value }));
        clearError('phone');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOwner) return;
        
        if (!validateForm()) {
            return;
        }
        
        try {
            // Prepare owner data with all fields and company ID
            const ownerData = {
                name: formState.name.trim(),
                phone: formState.phone,
                city: formState.city,
                district: formState.district,
                company: currentUser?.company?.id,
            };
            
            if (!ownerData.company) {
                throw new Error(t('companyRequired') || 'Company information is required');
            }
            
            await updateOwnerMutation.mutateAsync({ id: editingOwner.id, data: ownerData });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('ownerUpdatedSuccessfully') || 'Owner updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating owner:', error);
            setErrors({ _general: error?.message || t('errorUpdatingOwner') || 'Failed to update owner. Please try again.' });
        }
    };

    if (!editingOwner) return null;

    return (
        <Modal isOpen={isEditOwnerModalOpen} onClose={handleClose} title={`${t('edit')} ${t('ownerName')}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="name">{t('ownerName')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterOwnerFullName')} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="phone">{t('ownerPhone')}</Label>
                    <PhoneInput 
                        id="phone" 
                        placeholder={t('enterContactPhoneNumber')} 
                        value={formState.phone} 
                        onChange={handlePhoneChange} 
                    />
                </div>
                 <div>
                    <Label htmlFor="city">{t('city')}</Label>
                    <Input 
                        id="city" 
                        placeholder={t('enterCity') || 'Enter city'} 
                        value={formState.city} 
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <Label htmlFor="district">{t('ownerDistrict')}</Label>
                    <Input id="district" placeholder={t('enterSpecificDistrict')} value={formState.district} onChange={handleChange} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>{t('cancel')}</Button>
                    <Button type="submit" loading={isLoading} disabled={isLoading}>{t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};
