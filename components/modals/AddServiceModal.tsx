import { Alert } from '../Alert';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import {Input, AutoDirTextarea } from '../Input';
import { NumberInput } from '../NumberInput';
import { Checkbox } from '../Checkbox';
import { Button } from '../Button';
import { ServiceProvider } from '../../types';
import { useAddService, useServiceProviders } from '../../hooks/useQueries';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

const Select = ({ id, children, value, onChange }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; }) => {
    const { language } = useAppContext();
    return (
        <select id={id} value={value} onChange={onChange} dir={language === 'ar' ? 'rtl' : 'ltr'} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100">
            {children}
        </select>
    );
};

export const AddServiceModal = () => {
    const { isAddServiceModalOpen, setIsAddServiceModalOpen, t, language, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    
    // Fetch service providers using React Query
    const { data: providersResponse } = useServiceProviders();
    const serviceProviders: ServiceProvider[] = Array.isArray(providersResponse) 
        ? providersResponse 
        : (providersResponse?.results || []);

    // Create service mutation
    const addServiceMutation = useAddService();
    const loading = addServiceMutation.isPending;

    const [formState, setFormState] = useState({
        name: '',
        description: '',
        price: '',
        duration: '',
        category: '',
        provider: '',
        isActive: true,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const translate = (key: string) => {
        const value = t(key as never);
        return value && value !== key ? value : undefined;
    };

    const catalogValues = (): Record<string, unknown> => ({
            name: formState.name,
            description: formState.description,
    });

    const applyCatalog = (values: Record<string, unknown>) => {
        const next = catalogFieldErrors('service.upsert', values, translate);

        return next;
    };

    const validateForm = (): boolean => {
        const next = applyCatalog(catalogValues());
        if (!currentUser?.company?.id) {
            next._general = t('companyRequired') || 'Company is required';
        }
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
        if (isAddServiceModalOpen) {
            // Reset form when modal opens
            setFormState({
                name: '',
                description: '',
                price: '',
                duration: '',
                category: '',
                provider: '',
                isActive: true,
            });
            setErrors({});
        }
    }, [isAddServiceModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        if (type === 'checkbox') {
            setFormState(prev => ({ ...prev, [id]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormState(prev => ({ ...prev, [id]: value }));
        }
        clearError(id);
    };

    const handleClose = () => {
        setIsAddServiceModalOpen(false);
        setFormState({
            name: '',
            description: '',
            price: '',
            duration: '',
            category: '',
            provider: '',
            isActive: true,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            // Find provider by name to get its ID
            const selectedProvider = formState.provider 
                ? serviceProviders.find(prov => prov.name === formState.provider)
                : null;

            const payload: any = {
                name: formState.name.trim(),
                description: formState.description?.trim() || '',
                price: Number(formState.price) || 0,
                duration: formState.duration?.trim() || '',
                category: formState.category?.trim() || '',
                company: currentUser?.company?.id || currentUser?.company_id,
                is_active: formState.isActive,
            };

            // Only include provider if it's selected
            if (selectedProvider) {
                payload.provider = selectedProvider.id;
            }

            await addServiceMutation.mutateAsync(payload);

            // Reset form
            setFormState({
                name: '',
                description: '',
                price: '',
                duration: '',
                category: '',
                provider: '',
                isActive: true,
            });
            setErrors({});
            
            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('serviceCreatedSuccessfully') || 'Service created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating service:', error);
            const serverErrors = serverFieldErrors(error, 'service.upsert', translate);
            if (serverErrors.company && !serverErrors._general) serverErrors._general = serverErrors.company;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('failedToCreateService') || 'Failed to create service. Please try again.' });
        }
    };

    return (
        <Modal isOpen={isAddServiceModalOpen} onClose={handleClose} title={t('addService') || 'Add Service'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <Alert variant="error">{errors._general}</Alert>
                )}
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterServiceName') || 'Enter service name'} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''} onBlur={() => blurField('name')} />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="description">{t('description')}</Label>
                    <AutoDirTextarea
                        id="description"
                        rows={3}
                        value={formState.description}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={t('enterServiceDescription') || 'Enter service description'} onBlur={() => blurField('description')} />
                    {errors.description && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="price">{t('price')} <span className="text-red-500">*</span></Label>
                        <NumberInput 
                            id="price" 
                            placeholder={t('enterPrice') || 'Enter price'} 
                            value={formState.price} 
                            onChange={handleChange} 
                            min={0} 
                            step={0.1}
                            className={errors.price ? 'border-red-500 dark:border-red-500' : ''}
                        />
                        {errors.price && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="duration">{t('duration')}</Label>
                        <Input id="duration" placeholder={t('enterDuration') || 'e.g., 1 hour'} value={formState.duration} onChange={handleChange} />
                    </div>
                </div>
                <div>
                    <div>
                        <Label htmlFor="category">{t('category')}</Label>
                        <Input id="category" placeholder={t('enterCategory') || 'Enter category'} value={formState.category} onChange={handleChange} />
                    </div>

                </div>
                <div>
                    <div>
                        <Label htmlFor="provider">{t('provider')}</Label>
                        <Select id="provider" value={formState.provider} onChange={handleChange}>
                            <option value="">{t('selectProvider') || 'Select Provider (Optional)'}</option>
                            {serviceProviders.map(provider => (
                                <option key={provider.id} value={provider.name}>{provider.name}</option>
                            ))}
                        </Select>
                    </div>
                </div>
                <Checkbox
                    id="isActive"
                    checked={formState.isActive}
                    onChange={handleChange}
                    label={t('active')}
                />
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" loading={loading} loadingText={t('saving')}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

