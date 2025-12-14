
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { PhoneInput } from '../PhoneInput';
import { Button } from '../Button';
import { useAddOwner } from '../../hooks/useQueries';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; }) => (
    <select id={id} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
        {children}
    </select>
);

export const AddOwnerModal = () => {
    const { isAddOwnerModalOpen, setIsAddOwnerModalOpen, t, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    
    // Create owner mutation
    const addOwnerMutation = useAddOwner();
    const isLoading = addOwnerMutation.isPending;

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
        
        if (!validateForm()) {
            return;
        }
        
        try {
            // Include company ID in the request
            const ownerData = {
                ...formState,
                company: currentUser?.company?.id,
            };
            
            if (!ownerData.company) {
                throw new Error(t('companyRequired') || 'Company information is required');
            }
            
            await addOwnerMutation.mutateAsync(ownerData);
            
            // Reset form
            setFormState({ name: '', phone: '', city: '', district: '' });
            setErrors({});
            
            // Close modal immediately and show success modal
            setIsAddOwnerModalOpen(false);
            setSuccessMessage(t('ownerCreatedSuccessfully') || 'Owner created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating owner:', error);
            setErrors({ _general: error?.message || t('errorCreatingOwner') || 'Failed to create owner. Please try again.' });
        }
    };

    return (
        <Modal isOpen={isAddOwnerModalOpen} onClose={() => {
            setIsAddOwnerModalOpen(false);
        }} title={t('addNewOwner')}>
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
                <div className="flex justify-end">
                    <Button type="submit" loading={isLoading} disabled={isLoading}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
