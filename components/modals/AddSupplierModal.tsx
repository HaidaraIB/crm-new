import { Alert } from '../Alert';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import {Input, AutoDirTextarea } from '../Input';
import { PhoneInput } from '../PhoneInput';
import { Button } from '../Button';
import { useCreateSupplier } from '../../hooks/useQueries';
import { scrollToFirstFieldError } from '../../utils/formFieldErrors';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-secondary mb-1">{children}</label>
);

const ADD_SUPPLIER_DOM_ID_MAP: Record<string, string> = {
    name: 'name',
    phone: 'phone',
    email: 'email',
};

export const AddSupplierModal = () => {
    const { isAddSupplierModalOpen, setIsAddSupplierModalOpen, t, language, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        contactPerson: '',
        specialization: '',
    });
    
    // Create supplier mutation
    const addSupplierMutation = useCreateSupplier();
    const loading = addSupplierMutation.isPending;
    
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const translate = (key: string) => {
        const value = t(key as never);
        return value && value !== key ? value : undefined;
    };

    const catalogValues = (): Record<string, unknown> => ({
            name: formState.name,
            email: formState.email,
            phone: formState.phone,
    });

    const applyCatalog = (values: Record<string, unknown>) => {
        const next = catalogFieldErrors('supplier.upsert', values, translate);

        return next;
    };

    const validateForm = (): boolean => {
        const next = applyCatalog(catalogValues());
        if (!currentUser?.company?.id) {
            next._general = t('companyRequired') || 'Company is required';
        }
        setErrors(next);
        if (Object.keys(next).length > 0) {
            scrollToFirstFieldError(next, ADD_SUPPLIER_DOM_ID_MAP);
            return false;
        }
        return true;
    };

    const blurField = (field: string) => {
        const next = applyCatalog(catalogValues());
        setErrors((prev) => {
            const updated = { ...prev };
            if (next[field]) updated[field] = next[field];
            else delete updated[field];
            return updated;
        });
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
            setErrors({});
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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            await addSupplierMutation.mutateAsync({
                name: formState.name.trim(),
                phone: formState.phone?.trim() || '',
                email: formState.email?.trim() || '',
                address: formState.address?.trim() || '',
                contact_person: formState.contactPerson?.trim() || '',
                specialization: formState.specialization?.trim() || '',
                company: currentUser?.company?.id || currentUser?.company_id,
            });

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
            
            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('supplierCreatedSuccessfully') || 'Supplier created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating supplier:', error);
            const serverErrors = serverFieldErrors(error, 'supplier.upsert', translate);
            if (serverErrors.company && !serverErrors._general) serverErrors._general = serverErrors.company;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('failedToCreateSupplier') || 'Failed to create supplier. Please try again.' });
        }
    };

    return (
        <Modal isOpen={isAddSupplierModalOpen} onClose={handleClose} title={t('addSupplier') || 'Add Supplier'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <Alert variant="error">{errors._general}</Alert>
                )}
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterSupplierName') || 'Enter supplier name'} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''} onBlur={() => blurField('name')} />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="phone">{t('phone')}</Label>
                    <PhoneInput 
                        id="phone" 
                        placeholder={t('enterPhoneNumber') || 'Enter phone number'} 
                        value={formState.phone} 
                        onChange={(value) => {
                            setFormState(prev => ({ ...prev, phone: value }));
                            clearError('phone');
                        }}
                        onBlur={() => blurField('phone')}
                        defaultCountry="IQ"
                        error={!!errors.phone}
                    />
                    {errors.phone && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input 
                        id="email" 
                        type="email" 
                        placeholder={t('enterEmail') || 'Enter email'} 
                        value={formState.email} 
                        onChange={handleChange}
                        className={errors.email ? 'border-red-500 dark:border-red-500' : ''} onBlur={() => blurField('email')} />
                    {errors.email && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="address">{t('address')}</Label>
                    <AutoDirTextarea 
                        id="address" 
                        rows={2} 
                        value={formState.address}
                        onChange={handleChange}
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
                    <Button type="submit" loading={loading} loadingText={t('saving')}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

