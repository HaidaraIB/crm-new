
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-secondary mb-1">{children}</label>
);

export const AddSupplierModal = () => {
    const { isAddSupplierModalOpen, setIsAddSupplierModalOpen, t, addSupplier, language } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        contactPerson: '',
        specialization: '',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [successMessage, setSuccessMessage] = useState('');

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
        }

        if (formState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
            newErrors.email = t('invalidEmail') || 'Invalid email format';
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
        if (isAddSupplierModalOpen) {
            // Reset form when modal opens
            setFormState({
                name: '',
                phone: '',
                email: '',
                address: '',
                contactPerson: '',
                specialization: '',
            });
        }
    }, [isAddSupplierModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsAddSupplierModalOpen(false);
        setFormState({
            name: '',
            phone: '',
            email: '',
            address: '',
            contactPerson: '',
            specialization: '',
        });
        setSuccessMessage('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setSuccessMessage('');
        try {
            await addSupplier({
                name: formState.name,
                phone: formState.phone || '',
                email: formState.email || '',
                address: formState.address || '',
                contactPerson: formState.contactPerson || '',
                specialization: formState.specialization || '',
            });

            // Success - show message and close after a delay
            setSuccessMessage(t('supplierCreatedSuccessfully') || 'Supplier created successfully!');
            
            // Reset form
            setFormState({
                name: '',
                phone: '',
                email: '',
                address: '',
                contactPerson: '',
                specialization: '',
            });
            setErrors({});
            
            // Close modal after showing success message
            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (error: any) {
            console.error('Error creating supplier:', error);
            const errorMessage = error?.message || t('failedToCreateSupplier') || 'Failed to create supplier. Please try again.';
            setErrors({ _general: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isAddSupplierModalOpen} onClose={handleClose} title={t('addSupplier') || 'Add Supplier'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {successMessage && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 px-4 py-3 rounded-md text-sm">
                        {successMessage}
                    </div>
                )}
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterSupplierName') || 'Enter supplier name'} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="phone">{t('phone')}</Label>
                        <Input id="phone" placeholder={t('enterPhone') || 'Enter phone'} value={formState.phone} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="email">{t('email')}</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder={t('enterEmail') || 'Enter email'} 
                            value={formState.email} 
                            onChange={handleChange}
                            className={errors.email ? 'border-red-500 dark:border-red-500' : ''}
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                        )}
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
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

