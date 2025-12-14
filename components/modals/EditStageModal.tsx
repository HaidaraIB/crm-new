
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { Stage } from '../../types';
import { useUpdateStage } from '../../hooks/useQueries';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const EditStageModal = () => {
    const { isEditStageModalOpen, setIsEditStageModalOpen, t, editingStage, setEditingStage, language, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    
    // Update stage mutation
    const updateStageMutation = useUpdateStage();
    const loading = updateStageMutation.isPending;

    const [formState, setFormState] = useState({
        name: '',
        description: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
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
        if (editingStage) {
            setFormState({
                name: editingStage.name,
                description: editingStage.description || '',
            });
            setErrors({});
        }
    }, [editingStage]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsEditStageModalOpen(false);
        setEditingStage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStage) return;
        
        if (!validateForm()) {
            return;
        }

        if (!currentUser?.company?.id) {
            setErrors({ _general: t('companyRequired') || 'Company is required' });
            return;
        }

        try {
            await updateStageMutation.mutateAsync({
                id: editingStage.id,
                data: {
                    name: formState.name,
                    description: formState.description,
                    company: currentUser.company.id,
                }
            });

            handleClose();
            setSuccessMessage(t('stageUpdatedSuccessfully') || 'Stage updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating stage:', error);
            const errorData = error?.response?.data || error?.data || {};
            const newErrors: { [key: string]: string } = {};
            
            // Parse API validation errors
            if (errorData.company) {
                newErrors._general = Array.isArray(errorData.company) ? errorData.company[0] : errorData.company;
            }
            if (errorData.name) {
                newErrors.name = Array.isArray(errorData.name) ? errorData.name[0] : errorData.name;
            }
            if (errorData.description) {
                newErrors.description = Array.isArray(errorData.description) ? errorData.description[0] : errorData.description;
            }
            
            if (Object.keys(newErrors).length === 0) {
                newErrors._general = error?.message || t('failedToUpdateStage') || 'Failed to update stage. Please try again.';
            }
            
            setErrors(newErrors);
        }
    };

    if (!editingStage) return null;

    return (
        <Modal isOpen={isEditStageModalOpen} onClose={handleClose} title={t('editStage') || 'Edit Stage'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="name">{t('stageName')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterStageName') || 'Enter stage name'} 
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
                        placeholder={t('enterStageDescription') || 'Enter stage description'}
                    />
                </div>
                <div className={`flex ${language === 'ar' ? 'flex-row-reverse' : ''} justify-end gap-2`}>
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};

