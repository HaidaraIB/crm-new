import React, { useState, useEffect } from 'react';
import { Alert } from '../Alert';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import {Input, AutoDirTextarea } from '../Input';
import { Button } from '../Button';
import { useAddTag } from '../../hooks/useQueries';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

const EMPTY_FORM = {
    name: '',
    description: '',
    color: '#808080',
};

export const AddTagModal = () => {
    const {
        isAddTagModalOpen,
        setIsAddTagModalOpen,
        t,
        language,
        setIsSuccessModalOpen,
        setSuccessMessage,
        currentUser,
    } = useAppContext();

    const addTagMutation = useAddTag();
    const loading = addTagMutation.isPending;

    const [formState, setFormState] = useState(EMPTY_FORM);
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
        const next = catalogFieldErrors('tag.upsert', values, translate);

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
        if (isAddTagModalOpen) {
            setFormState(EMPTY_FORM);
            setErrors({});
        }
    }, [isAddTagModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsAddTagModalOpen(false);
        setFormState(EMPTY_FORM);
        setErrors({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await addTagMutation.mutateAsync({
                name: formState.name,
                description: formState.description,
                color: formState.color,
                company: currentUser?.company?.id,
            });

            handleClose();
            setSuccessMessage(t('tagCreatedSuccessfully') || 'Tag created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating tag:', error);
            const serverErrors = serverFieldErrors(error, 'tag.upsert', translate);
            if (serverErrors.company && !serverErrors._general) serverErrors._general = serverErrors.company;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('failedToCreateTag') || 'Failed to create tag. Please try again.' });
        }
    };

    return (
        <Modal isOpen={isAddTagModalOpen} onClose={handleClose} title={t('addTag') || 'Add Tag'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <Alert variant="error">{errors._general}</Alert>
                )}
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input
                        id="name"
                        placeholder={t('enterTagName') || 'Enter tag name'}
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
                        placeholder={t('enterTagDescription') || 'Enter tag description'} onBlur={() => blurField('description')} />
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
                <div className={`flex ${language === 'ar' ? 'flex-row-reverse' : ''} justify-end gap-2`}>
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" loading={loading} loadingText={t('saving')}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
