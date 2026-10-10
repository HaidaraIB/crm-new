import React, { useState, useEffect, useRef } from 'react';
import { Alert } from '../Alert';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import {Input, AutoDirTextarea } from '../Input';
import { Button } from '../Button';
import { useUpdateTag } from '../../hooks/useQueries';
import { buildUpdateDiff } from '../../utils/buildUpdateDiff';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

type TagFormState = {
    name: string;
    description: string;
    color: string;
};

export const EditTagModal = () => {
    const {
        isEditTagModalOpen,
        setIsEditTagModalOpen,
        t,
        editingTag,
        setEditingTag,
        language,
        setIsSuccessModalOpen,
        setSuccessMessage,
        currentUser,
    } = useAppContext();

    const updateTagMutation = useUpdateTag();
    const loading = updateTagMutation.isPending;
    const initialPayloadRef = useRef<Record<string, unknown> | null>(null);

    const buildPayload = (state: TagFormState): Record<string, unknown> => ({
        name: state.name,
        description: state.description,
        color: state.color,
        company: currentUser?.company?.id,
    });

    const [formState, setFormState] = useState<TagFormState>({
        name: '',
        description: '',
        color: '#808080',
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
        if (editingTag) {
            const initState: TagFormState = {
                name: editingTag.name,
                description: editingTag.description || '',
                color: editingTag.color || '#808080',
            };
            setFormState(initState);
            initialPayloadRef.current = buildPayload(initState);
            setErrors({});
        } else {
            initialPayloadRef.current = null;
        }
    }, [editingTag, currentUser?.company?.id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsEditTagModalOpen(false);
        setEditingTag(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTag) return;

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

            await updateTagMutation.mutateAsync({
                id: editingTag.id,
                data: patch,
            });

            handleClose();
            setSuccessMessage(t('tagUpdatedSuccessfully') || 'Tag updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating tag:', error);
            const serverErrors = serverFieldErrors(error, 'tag.upsert', translate);
            if (serverErrors.company && !serverErrors._general) serverErrors._general = serverErrors.company;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('failedToUpdateTag') || 'Failed to update tag. Please try again.' });
        }
    };

    if (!editingTag) return null;

    return (
        <Modal isOpen={isEditTagModalOpen} onClose={handleClose} title={t('editTag') || 'Edit Tag'}>
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
