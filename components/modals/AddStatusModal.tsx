
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { useAddStatus } from '../../hooks/useQueries';

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

export const AddStatusModal = () => {
    const { isAddStatusModalOpen, setIsAddStatusModalOpen, t, language, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    
    // Create status mutation
    const addStatusMutation = useAddStatus();
    const loading = addStatusMutation.isPending;

    const [formState, setFormState] = useState({
        name: '',
        description: '',
        category: 'active' as 'active' | 'inactive' | 'follow_up' | 'closed',
        color: '#808080',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
        }

        if (!formState.category) {
            newErrors.category = t('categoryRequired') || 'Category is required';
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
        if (isAddStatusModalOpen) {
            setFormState({
                name: '',
                description: '',
                category: 'active',
                color: '#808080',
            });
            setErrors({});
        }
    }, [isAddStatusModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsAddStatusModalOpen(false);
        setFormState({
            name: '',
            description: '',
            category: 'active',
            color: '#808080',
        });
        setErrors({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            await addStatusMutation.mutateAsync({
                name: formState.name,
                description: formState.description,
                category: formState.category,
                color: formState.color,
                isDefault: false,
                isHidden: false,
                company: currentUser?.company?.id,
            });

            handleClose();
            setSuccessMessage(t('statusCreatedSuccessfully') || 'Status created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating status:', error);
            const errorData = error?.response?.data || error?.data || {};
            const newErrors: { [key: string]: string } = {};
            
            // Parse API validation errors
            if (errorData.company) {
                newErrors._general = Array.isArray(errorData.company) ? errorData.company[0] : errorData.company;
            }
            if (errorData.name) {
                newErrors.name = Array.isArray(errorData.name) ? errorData.name[0] : errorData.name;
            }
            if (errorData.category) {
                newErrors.category = Array.isArray(errorData.category) ? errorData.category[0] : errorData.category;
            }
            if (errorData.description) {
                newErrors.description = Array.isArray(errorData.description) ? errorData.description[0] : errorData.description;
            }
            
            if (Object.keys(newErrors).length === 0) {
                newErrors._general = error?.message || t('failedToCreateStatus') || 'Failed to create status. Please try again.';
            }
            
            setErrors(newErrors);
        }
    };

    return (
        <Modal isOpen={isAddStatusModalOpen} onClose={handleClose} title={t('addStatus') || 'Add Status'}>
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
                        placeholder={t('enterStatusName') || 'Enter status name'} 
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
                        placeholder={t('enterStatusDescription') || 'Enter status description'}
                    />
                </div>
                <div>
                    <Label htmlFor="category">{t('category')} <span className="text-red-500">*</span></Label>
                    <Select 
                        id="category" 
                        value={formState.category} 
                        onChange={handleChange}
                        className={errors.category ? 'border-red-500 dark:border-red-500' : ''}
                    >
                        <option value="active">{t('active')}</option>
                        <option value="inactive">{t('inactive')}</option>
                        <option value="follow_up">{t('followUp')}</option>
                        <option value="closed">{t('closed')}</option>
                    </Select>
                    {errors.category && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="color">{t('color') || 'Color'}</Label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            id="color"
                            value={formState.color}
                            onChange={(e) => setFormState(prev => ({ ...prev, color: e.target.value }))}
                            className="h-10 w-20 p-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                        />
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400 uppercase">{formState.color}</span>
                    </div>
                </div>
                <div className={`flex ${language === 'ar' ? 'flex-row-reverse' : ''} justify-end gap-2`}>
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

