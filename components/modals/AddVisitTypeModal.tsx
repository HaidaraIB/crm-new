
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { useCreateVisitType } from '../../hooks/useQueries';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const AddVisitTypeModal = () => {
    const { isAddVisitTypeModalOpen, setIsAddVisitTypeModalOpen, t, language, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();

    const createVisitTypeMutation = useCreateVisitType();
    const loading = createVisitTypeMutation.isPending;

    const [formState, setFormState] = useState({
        name: '',
        description: '',
        color: '#808080',
        isDefault: false,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const next: { [key: string]: string } = {};
        if (!formState.name.trim()) {
            next.name = t('nameRequired') || 'Name is required';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => {
                const n = { ...prev };
                delete n[field];
                return n;
            });
        }
    };

    useEffect(() => {
        if (isAddVisitTypeModalOpen) {
            setFormState({ name: '', description: '', color: '#808080', isDefault: false });
            setErrors({});
        }
    }, [isAddVisitTypeModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormState(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsAddVisitTypeModalOpen(false);
        setFormState({ name: '', description: '', color: '#808080', isDefault: false });
        setErrors({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!currentUser?.company?.id) {
            setErrors({ _general: t('companyRequired') || 'Company is required' });
            return;
        }
        try {
            await createVisitTypeMutation.mutateAsync({
                name: formState.name,
                description: formState.description,
                color: formState.color,
                company: currentUser.company.id,
                is_default: formState.isDefault,
            });
            handleClose();
            setSuccessMessage(t('visitTypeCreatedSuccessfully') || 'Visit type created.');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error(error);
            setErrors({ _general: error?.message || t('failedToCreateVisitType') || 'Failed to create visit type.' });
        }
    };

    return (
        <Modal isOpen={isAddVisitTypeModalOpen} onClose={handleClose} title={t('addVisitType') || 'Add visit type'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="name">{t('visitTypeName') || 'Name'} <span className="text-red-500">*</span></Label>
                    <Input
                        id="name"
                        placeholder={t('enterVisitTypeName') || 'Enter name'}
                        value={formState.name}
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
                </div>
                <div>
                    <Label htmlFor="description">{t('description')}</Label>
                    <textarea
                        id="description"
                        rows={3}
                        value={formState.description}
                        onChange={handleChange}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                        placeholder={t('enterVisitTypeDescription') || 'Description (optional)'}
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
                    <Button type="submit" disabled={loading}>{loading ? (t('loading') || 'Loading…') : t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
