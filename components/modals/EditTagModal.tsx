import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { useUpdateTag } from '../../hooks/useQueries';
import { buildUpdateDiff } from '../../utils/buildUpdateDiff';

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

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
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
            const errorData = error?.response?.data || error?.data || {};
            const newErrors: { [key: string]: string } = {};

            if (errorData.company) {
                newErrors._general = Array.isArray(errorData.company) ? errorData.company[0] : errorData.company;
            }
            if (errorData.name) {
                newErrors.name = Array.isArray(errorData.name) ? errorData.name[0] : errorData.name;
            }
            if (errorData.description) {
                newErrors.description = Array.isArray(errorData.description) ? errorData.description[0] : errorData.description;
            }
            if (errorData.non_field_errors) {
                newErrors._general = Array.isArray(errorData.non_field_errors)
                    ? errorData.non_field_errors[0]
                    : errorData.non_field_errors;
            }

            if (Object.keys(newErrors).length === 0) {
                newErrors._general = error?.message || t('failedToUpdateTag') || 'Failed to update tag. Please try again.';
            }

            setErrors(newErrors);
        }
    };

    if (!editingTag) return null;

    return (
        <Modal isOpen={isEditTagModalOpen} onClose={handleClose} title={t('editTag') || 'Edit Tag'}>
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
                        placeholder={t('enterTagName') || 'Enter tag name'}
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
                        placeholder={t('enterTagDescription') || 'Enter tag description'}
                    />
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
