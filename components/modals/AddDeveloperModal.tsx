import { Alert } from '../Alert';

import React, { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { useAddDeveloper } from '../../hooks/useQueries';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const AddDeveloperModal = () => {
    const { isAddDeveloperModalOpen, setIsAddDeveloperModalOpen, t, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    
    // Create developer mutation
    const addDeveloperMutation = useAddDeveloper();
    const isLoading = addDeveloperMutation.isPending;

    const [formState, setFormState] = useState({
        name: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const translate = (key: string) => {
        const value = t(key as never);
        return value && value !== key ? value : undefined;
    };

    const catalogValues = (): Record<string, unknown> => ({
            name: formState.name,
    });

    const applyCatalog = (values: Record<string, unknown>) => {
        const next = catalogFieldErrors('developer.upsert', values, translate);

        return next;
    };

    const validateForm = (): boolean => {
        const next = applyCatalog(catalogValues());
        setErrors(next);
        return Object.keys(next).length === 0;
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        try {
            // Include company ID in the request
            const developerData = {
                ...formState,
                company: currentUser?.company?.id,
            };
            
            if (!developerData.company) {
                throw new Error(t('companyRequired') || 'Company information is required');
            }
            
            await addDeveloperMutation.mutateAsync(developerData);

            // Reset form
            setFormState({ name: '' });
            setErrors({});
            
            // Close modal immediately and show success modal
            setIsAddDeveloperModalOpen(false);
            setSuccessMessage(t('developerCreatedSuccessfully') || 'Developer created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error adding developer:', error);
            const serverErrors = serverFieldErrors(error, 'developer.upsert', translate);
            if (serverErrors.company && !serverErrors._general) serverErrors._general = serverErrors.company;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('errorCreatingDeveloper') || 'Failed to add developer. Please try again.' });
        }
    };

    return (
        <Modal isOpen={isAddDeveloperModalOpen} onClose={() => {
            setIsAddDeveloperModalOpen(false);
        }} title={t('addNewDeveloper')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <Alert variant="error">{errors._general}</Alert>
                )}
                <div>
                    <Label htmlFor="name">{t('developerName')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterDeveloperName')} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''} onBlur={() => blurField('name')} />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => {
                        setIsAddDeveloperModalOpen(false);
                        setSuccessMessage('');
                    }} disabled={isLoading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isLoading} loading={isLoading}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
