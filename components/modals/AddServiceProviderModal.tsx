
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { NumberInput } from '../NumberInput';
import { PhoneInput } from '../PhoneInput';
import { Button } from '../Button';
import { useCreateServiceProvider } from '../../hooks/useQueries';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const AddServiceProviderModal = () => {
    const { isAddServiceProviderModalOpen, setIsAddServiceProviderModalOpen, t, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        email: '',
        specialization: '',
        rating: '',
    });
    
    // Create service provider mutation
    const addServiceProviderMutation = useCreateServiceProvider();
    const loading = addServiceProviderMutation.isPending;
    
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
        }

        if (formState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
            newErrors.email = t('invalidEmail') || 'Invalid email format';
        }

        if (formState.rating && (Number(formState.rating) < 0 || Number(formState.rating) > 5)) {
            newErrors.rating = t('ratingRange') || 'Rating must be between 0 and 5';
        }

        if (!currentUser?.company?.id) {
            newErrors._general = t('companyRequired') || 'Company is required';
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
        if (isAddServiceProviderModalOpen) {
            // Reset form when modal opens
            setFormState({
                name: '',
                phone: '',
                email: '',
                specialization: '',
                rating: '',
            });
            setErrors({});
        }
    }, [isAddServiceProviderModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsAddServiceProviderModalOpen(false);
        setFormState({
            name: '',
            phone: '',
            email: '',
            specialization: '',
            rating: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            await addServiceProviderMutation.mutateAsync({
                name: formState.name.trim(),
                phone: formState.phone?.trim() || '',
                email: formState.email?.trim() || '',
                specialization: formState.specialization?.trim() || '',
                rating: formState.rating ? Number(formState.rating) : undefined,
                company: currentUser?.company?.id || currentUser?.company_id,
            });

            // Reset form
            setFormState({
                name: '',
                phone: '',
                email: '',
                specialization: '',
                rating: '',
            });
            setErrors({});
            
            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('serviceProviderCreatedSuccessfully') || 'Service provider created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating service provider:', error);
            
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
                newErrors._general = error?.message || t('failedToCreateServiceProvider') || 'Failed to create service provider. Please try again.';
            }
            
            setErrors(newErrors);
        }
    };

    return (
        <Modal isOpen={isAddServiceProviderModalOpen} onClose={handleClose} title={t('addServiceProvider') || 'Add Service Provider'}>
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
                        placeholder={t('enterProviderName') || 'Enter provider name'} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
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
                            defaultCountry="SY"
                        />
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
                            className={errors.email ? 'border-red-500 dark:border-red-500' : ''}
                        />
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
                    <Button type="submit" disabled={loading} loading={loading}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

