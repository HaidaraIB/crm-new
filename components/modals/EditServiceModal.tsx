
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { NumberInput } from '../NumberInput';
import { Checkbox } from '../Checkbox';
import { Button } from '../Button';
import { Service } from '../../types';
import { useUpdateService, useServiceProviders } from '../../hooks/useQueries';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

const Select = ({ id, children, value, onChange, className }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string; }) => {
    const { language } = useAppContext();
    const borderClass = className?.includes('border-red') ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600';
    const baseClassName = className?.replace(/border-\S+/g, '').trim() || '';
    return (
        <select id={id} value={value} onChange={onChange} dir={language === 'ar' ? 'rtl' : 'ltr'} className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 ${borderClass} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${baseClassName}`}>
            {children}
        </select>
    );
};

export const EditServiceModal = () => {
    const { isEditServiceModalOpen, setIsEditServiceModalOpen, t, editingService, setEditingService, language, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    
    // Fetch service providers using React Query
    const { data: providersResponse } = useServiceProviders();
    const serviceProviders = Array.isArray(providersResponse) 
        ? providersResponse 
        : (providersResponse?.results || []);

    // Update service mutation
    const updateServiceMutation = useUpdateService();
    const loading = updateServiceMutation.isPending;

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

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
        }

        if (!formState.price || Number(formState.price) <= 0) {
            newErrors.price = t('priceRequired') || 'Price is required and must be greater than 0';
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
        if (editingService) {
            // Get provider name from serviceProviders if provider is an ID
            let providerName = editingService.provider || '';
            if (editingService.provider && typeof editingService.provider === 'number') {
                const provider = serviceProviders.find(p => p.id === editingService.provider);
                providerName = provider?.name || '';
            } else if (editingService.provider && typeof editingService.provider === 'string') {
                providerName = editingService.provider;
            }
            
            setFormState({
                name: editingService.name || '',
                description: editingService.description || '',
                price: editingService.price !== undefined && editingService.price !== null ? editingService.price.toString() : '',
                duration: editingService.duration || '',
                category: editingService.category || '',
                provider: providerName,
                isActive: editingService.isActive !== undefined ? editingService.isActive : true,
            });
            setErrors({});
        }
    }, [editingService, serviceProviders]);

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
        setIsEditServiceModalOpen(false);
        setEditingService(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingService) return;
        
        if (!validateForm()) {
            return;
        }

        try {
            // Find provider by name to get its ID
            const selectedProvider = formState.provider 
                ? serviceProviders.find(prov => prov.name === formState.provider)
                : null;

            const updateData: any = {
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
                updateData.provider = selectedProvider.id;
            }

            await updateServiceMutation.mutateAsync({
                id: editingService.id,
                data: updateData
            });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('serviceUpdatedSuccessfully') || 'Service updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating service:', error);
            
            // Parse API validation errors
            const apiErrors = error?.response?.data || {};
            const newErrors: { [key: string]: string } = {};
            
            Object.keys(apiErrors).forEach(key => {
                const errorMessages = Array.isArray(apiErrors[key]) 
                    ? apiErrors[key] 
                    : [apiErrors[key]];
                newErrors[key] = errorMessages[0];
            });
            
            if (Object.keys(newErrors).length === 0) {
                newErrors._general = error?.message || t('failedToUpdateService') || 'Failed to update service. Please try again.';
            }
            
            setErrors(newErrors);
        }
    };

    if (!editingService) return null;

    return (
        <Modal isOpen={isEditServiceModalOpen} onClose={handleClose} title={t('editService') || 'Edit Service'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterServiceName') || 'Enter service name'} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="description">{t('description')}</Label>
                    <textarea
                        id="description"
                        rows={3}
                        value={formState.description}
                        onChange={handleChange}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder={t('enterServiceDescription') || 'Enter service description'}
                    />
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
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};

