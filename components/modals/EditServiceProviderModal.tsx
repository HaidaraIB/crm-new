import { Alert } from '../Alert';

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { NumberInput } from '../NumberInput';
import { PhoneInput } from '../PhoneInput';
import { Button } from '../Button';
import { ServiceProvider } from '../../types';
import { useUpdateServiceProvider } from '../../hooks/useQueries';
import { buildUpdateDiff } from '../../utils/buildUpdateDiff';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-secondary mb-1">{children}</label>
);

export const EditServiceProviderModal = () => {
    const { isEditServiceProviderModalOpen, setIsEditServiceProviderModalOpen, t, editingServiceProvider, setEditingServiceProvider, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        email: '',
        specialization: '',
        rating: '',
    });
    
    // Update service provider mutation
    const updateServiceProviderMutation = useUpdateServiceProvider();
    const loading = updateServiceProviderMutation.isPending;
    const initialPayloadRef = useRef<Record<string, unknown> | null>(null);

    const buildPayload = (state: typeof formState): Record<string, unknown> => ({
        name: state.name.trim(),
        phone: state.phone?.trim() || '',
        email: state.email?.trim() || '',
        specialization: state.specialization?.trim() || '',
        rating: state.rating ? Number(state.rating) : undefined,
        company: currentUser?.company?.id || currentUser?.company_id,
    });
    
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
        const next = catalogFieldErrors('service_provider.upsert', values, translate);

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

    useEffect(() => {
        if (editingServiceProvider) {
            const initState = {
                name: editingServiceProvider.name || '',
                phone: editingServiceProvider.phone || '',
                email: editingServiceProvider.email || '',
                specialization: editingServiceProvider.specialization || '',
                rating: editingServiceProvider.rating !== undefined && editingServiceProvider.rating !== null ? editingServiceProvider.rating.toString() : '',
            };
            setFormState(initState);
            initialPayloadRef.current = buildPayload(initState);
            setErrors({});
        } else {
            initialPayloadRef.current = null;
        }
    }, [editingServiceProvider, currentUser?.company?.id, currentUser?.company_id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsEditServiceProviderModalOpen(false);
        setEditingServiceProvider(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingServiceProvider) return;
        
        if (!validateForm()) {
            return;
        }

        try {
            const next = buildPayload(formState);
            const patch = buildUpdateDiff(initialPayloadRef.current || {}, next);
            if (Object.keys(patch).length === 0) {
                handleClose();
                return;
            }

            await updateServiceProviderMutation.mutateAsync({
                id: editingServiceProvider.id,
                data: patch,
            });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('serviceProviderUpdatedSuccessfully') || 'Service provider updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating service provider:', error);
            const serverErrors = serverFieldErrors(error, 'service_provider.upsert', translate);
            if (serverErrors.company && !serverErrors._general) serverErrors._general = serverErrors.company;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('failedToUpdateServiceProvider') || 'Failed to update service provider. Please try again.' });
        }
    };

    if (!editingServiceProvider) return null;

    return (
        <Modal isOpen={isEditServiceProviderModalOpen} onClose={handleClose} title={t('editServiceProvider') || 'Edit Service Provider'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <Alert variant="error">{errors._general}</Alert>
                )}
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterProviderName') || 'Enter provider name'} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''} onBlur={() => blurField('name')} />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div>
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
                </div>
                <div>
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="specialization">{t('specialization')}</Label>
                        <Input id="specialization" placeholder={t('enterSpecialization') || 'Enter specialization'} value={formState.specialization} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="rating">{t('rating')}</Label>
                        <NumberInput 
                            id="rating" 
                            min={0} 
                            max={5} 
                            step={0.1} 
                            placeholder={t('enterRating') || 'Enter rating (0-5)'} 
                            value={formState.rating} 
                            onChange={handleChange}
                            className={errors.rating ? 'border-red-500 dark:border-red-500' : ''}
                        />
                        {errors.rating && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.rating}</p>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading} loading={loading}>{t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};

