import { Alert } from '../Alert';

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import {Input, AutoDirTextarea } from '../Input';
import { Button } from '../Button';
import { useUpdateCallMethod } from '../../hooks/useQueries';
import { buildUpdateDiff } from '../../utils/buildUpdateDiff';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const EditCallMethodModal = () => {
    const { isEditCallMethodModalOpen, setIsEditCallMethodModalOpen, t, editingCallMethod, setEditingCallMethod, language, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    
    // Update call method mutation
    const updateCallMethodMutation = useUpdateCallMethod();
    const loading = updateCallMethodMutation.isPending;
    const initialPayloadRef = useRef<Record<string, unknown> | null>(null);

    const buildPayload = (state: typeof formState): Record<string, unknown> => ({
        name: state.name,
        description: state.description,
        color: state.color,
        company: currentUser?.company?.id,
        is_default: state.isDefault,
    });

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
        const next = catalogFieldErrors('call_method.upsert', values, translate);

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
        if (editingCallMethod) {
            const cm = editingCallMethod as { isDefault?: boolean; is_default?: boolean };
            const initState = {
                name: editingCallMethod.name,
                description: editingCallMethod.description || '',
                color: editingCallMethod.color || '#808080',
                isDefault: cm.isDefault ?? cm.is_default ?? false,
            };
            setFormState(initState);
            initialPayloadRef.current = buildPayload(initState);
            setErrors({});
        } else {
            initialPayloadRef.current = null;
        }
    }, [editingCallMethod, currentUser?.company?.id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormState(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsEditCallMethodModalOpen(false);
        setEditingCallMethod(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCallMethod) return;
        
        if (!validateForm()) {
            return;
        }

        if (!currentUser?.company?.id) {
            setErrors({ _general: t('companyRequired') || 'Company is required' });
            return;
        }

        try {
            const next = buildPayload(formState);
            const patch = buildUpdateDiff(initialPayloadRef.current || {}, next);
            if (Object.keys(patch).length === 0) {
                handleClose();
                return;
            }

            await updateCallMethodMutation.mutateAsync({
                id: editingCallMethod.id,
                data: patch,
            });

            handleClose();
            setSuccessMessage(t('callMethodUpdatedSuccessfully') || 'Call method updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating call method:', error);
            const serverErrors = serverFieldErrors(error, 'call_method.upsert', translate);
            if (serverErrors.company && !serverErrors._general) serverErrors._general = serverErrors.company;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('failedToUpdateCallMethod') || 'Failed to update call method. Please try again.' });
        }
    };

    if (!editingCallMethod) return null;

    return (
        <Modal isOpen={isEditCallMethodModalOpen} onClose={handleClose} title={t('editCallMethod') || 'Edit Call Method'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <Alert variant="error">{errors._general}</Alert>
                )}
                <div>
                    <Label htmlFor="name">{t('callMethodName') || 'Call Method Name'} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterCallMethodName') || 'Enter call method name'} 
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
                        placeholder={t('enterCallMethodDescription') || 'Enter call method description'} onBlur={() => blurField('description')} />
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
                    <Button type="submit" loading={loading} loadingText={t('saving')}>{t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};
