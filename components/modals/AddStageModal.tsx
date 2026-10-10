
import React, { useState, useEffect } from 'react';
import { Alert } from '../Alert';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import {Input, AutoDirTextarea } from '../Input';
import { Button } from '../Button';
import { useAddStage } from '../../hooks/useQueries';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const AddStageModal = () => {
    const { isAddStageModalOpen, setIsAddStageModalOpen, t, language, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    
    // Create stage mutation
    const addStageMutation = useAddStage();
    const loading = addStageMutation.isPending;

    const [formState, setFormState] = useState({
        name: '',
        description: '',
        color: '#808080',
        isDefault: false,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const translate = (key: string) => {
        const value = t(key as never);
        return value && value !== key ? value : undefined;
    };

    const catalogValues = (): Record<string, unknown> => ({
            name: formState.name,
            description: formState.description,
            color: formState.color,
    });

    const applyCatalog = (values: Record<string, unknown>) => {
        const next = catalogFieldErrors('stage.upsert', values, translate);

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
        if (isAddStageModalOpen) {
            setFormState({
                name: '',
                description: '',
                color: '#808080',
                isDefault: false,
            });
            setErrors({});
        }
    }, [isAddStageModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormState(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsAddStageModalOpen(false);
        setFormState({
            name: '',
            description: '',
            color: '#808080',
            isDefault: false,
        });
        setErrors({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        if (!currentUser?.company?.id) {
            setErrors({ _general: t('companyRequired') || 'Company is required' });
            return;
        }

        try {
            await addStageMutation.mutateAsync({
                name: formState.name,
                description: formState.description,
                color: formState.color,
                required: false,
                auto_advance: false,
                company: currentUser.company.id,
                is_default: formState.isDefault,
            });

            handleClose();
            setSuccessMessage(t('stageCreatedSuccessfully') || 'Stage created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating stage:', error);
            const serverErrors = serverFieldErrors(error, 'stage.upsert', translate);
            if (serverErrors.company && !serverErrors._general) serverErrors._general = serverErrors.company;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('failedToCreateStage') || 'Failed to create stage. Please try again.' });
        }
    };

    return (
        <Modal isOpen={isAddStageModalOpen} onClose={handleClose} title={t('addStage') || 'Add Stage'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <Alert variant="error">{errors._general}</Alert>
                )}
                <div>
                    <Label htmlFor="name">{t('stageName')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterStageName') || 'Enter stage name'} 
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
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder={t('enterStageDescription') || 'Enter stage description'} onBlur={() => blurField('description')} />
                    {errors.description && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
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
                            onBlur={() => blurField('color')}
                            className="h-10 w-20 p-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                        />
                        {errors.color && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.color}</p>
                        )}
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400 uppercase">{formState.color}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="isDefault"
                        checked={formState.isDefault}
                        onChange={handleChange}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="isDefault">{t('default') || 'Default'}</Label>
                </div>
                <div className={`flex ${language === 'ar' ? 'flex-row-reverse' : ''} justify-end gap-2`}>
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" loading={loading} loadingText={t('saving')}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

