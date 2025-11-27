
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { NumberInput } from '../NumberInput';
import { Checkbox } from '../Checkbox';
import { Button } from '../Button';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const AddServicePackageModal = () => {
    const { isAddServicePackageModalOpen, setIsAddServicePackageModalOpen, t, addServicePackage, services, language } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        description: '',
        price: '',
        duration: '',
        selectedServices: [] as number[],
        isActive: true,
    });
    const [loading, setLoading] = useState(false);
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
        if (isAddServicePackageModalOpen) {
            // Reset form when modal opens
            setFormState({
                name: '',
                description: '',
                price: '',
                duration: '',
                selectedServices: [],
                isActive: true,
            });
        }
    }, [isAddServicePackageModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        if (type === 'checkbox') {
            const serviceId = parseInt(id.replace('service-', ''));
            setFormState(prev => {
                const newSelected = (e.target as HTMLInputElement).checked
                    ? [...prev.selectedServices, serviceId]
                    : prev.selectedServices.filter(id => id !== serviceId);
                return { ...prev, selectedServices: newSelected };
            });
        } else {
            setFormState(prev => ({ ...prev, [id]: value }));
            clearError(id);
        }
    };

    const handleClose = () => {
        setIsAddServicePackageModalOpen(false);
        setFormState({
            name: '',
            description: '',
            price: '',
            duration: '',
            selectedServices: [],
            isActive: true,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            // Convert service IDs to service names for the API (addServicePackage expects names)
            const serviceNames = formState.selectedServices.map(id => {
                const service = services.find(s => s.id === id);
                return service?.name || '';
            }).filter(Boolean);

            await addServicePackage({
                name: formState.name,
                description: formState.description,
                price: Number(formState.price) || 0,
                duration: formState.duration,
                services: serviceNames as unknown as number[], // addServicePackage expects service names (strings), but converts them to IDs internally
                isActive: formState.isActive,
            });
            handleClose();
        } catch (error: any) {
            console.error('Error creating service package:', error);
            const errorMessage = error?.message || t('failedToCreateServicePackage') || 'Failed to create service package. Please try again.';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isAddServicePackageModalOpen} onClose={handleClose} title={t('addServicePackage') || 'Add Service Package'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterPackageName') || 'Enter package name'} 
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
                        placeholder={t('enterPackageDescription') || 'Enter package description'}
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
                            step={0.01}
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
                    <Label htmlFor="services">{t('services')}</Label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-700">
                        {services.length > 0 ? (
                            services.map(service => (
                                <div key={service.id} className="flex items-center gap-2 mb-2">
                                    <input 
                                        type="checkbox" 
                                        id={`service-${service.id}`}
                                        checked={formState.selectedServices.includes(service.id)}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                                    />
                                    <label htmlFor={`service-${service.id}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                        {service.name}
                                    </label>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-tertiary">{t('noServicesAvailable') || 'No services available'}</p>
                        )}
                    </div>
                </div>
                <Checkbox
                    id="isActive"
                    checked={formState.isActive}
                    onChange={(e) => setFormState(prev => ({ ...prev, isActive: e.target.checked }))}
                    label={t('active')}
                />
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

