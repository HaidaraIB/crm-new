
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';
import { useUpdateCampaign } from '../../hooks/useQueries';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const EditCampaignModal = () => {
    const { isEditCampaignModalOpen, setIsEditCampaignModalOpen, t, editingCampaign, setEditingCampaign, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    
    // Update campaign mutation
    const updateCampaignMutation = useUpdateCampaign();
    const isLoading = updateCampaignMutation.isPending;

    const [formState, setFormState] = useState({
        name: '',
        code: '',
        budget: '',
        isActive: true,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (editingCampaign) {
            // Handle both camelCase and snake_case from API
            const isActive = (editingCampaign as any).is_active !== undefined 
                ? (editingCampaign as any).is_active 
                : (editingCampaign.isActive !== undefined ? editingCampaign.isActive : true);
            
            setFormState({
                name: editingCampaign.name || '',
                code: editingCampaign.code || '',
                budget: editingCampaign.budget ? String(editingCampaign.budget) : '',
                isActive: isActive,
            });
        }
    }, [editingCampaign]);

    const handleClose = () => {
        setIsEditCampaignModalOpen(false);
        setEditingCampaign(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type, checked } = e.target;
        setFormState(prev => ({
            ...prev,
            [id]: type === 'checkbox' ? checked : value
        }));
        // Clear error when user starts typing
        if (errors[id]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[id];
                return newErrors;
            });
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCampaign) return;
        
        if (!formState.name || formState.name.trim() === '') {
            setErrors({ name: t('nameRequired') || 'Name is required' });
            return;
        }
        
        setErrors({});
        
        // Get company ID - ensure it exists
        const companyId = currentUser?.company?.id;
        if (!companyId) {
            setErrors({ _general: t('companyRequired') || 'Company information is required. Please refresh the page and try again.' });
            return;
        }
        
        try {
            // Send data in snake_case format for API
            await updateCampaignMutation.mutateAsync({
                id: editingCampaign.id,
                data: {
                    name: formState.name.trim(),
                    budget: Number(formState.budget) || 0,
                    is_active: formState.isActive, // Send as snake_case for API
                    company: companyId,
                }
            });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('campaignUpdatedSuccessfully') || 'Campaign updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating campaign:', error);
            
            // Handle API errors - Django REST Framework returns errors in specific format
            const errorMessage = error?.message || '';
            const errorFields = error?.fields || {};
            
            // Check for field-specific errors first (from API response)
            if (errorFields.company) {
                const companyError = Array.isArray(errorFields.company) ? errorFields.company[0] : errorFields.company;
                setErrors({ _general: companyError || t('companyRequired') || 'Company information is required' });
            } else if (errorFields.name) {
                const nameError = Array.isArray(errorFields.name) ? errorFields.name[0] : errorFields.name;
                setErrors({ name: nameError || t('nameRequired') || 'Name is required' });
            } else if (errorFields.budget) {
                const budgetError = Array.isArray(errorFields.budget) ? errorFields.budget[0] : errorFields.budget;
                setErrors({ budget: budgetError || t('invalidBudget') || 'Invalid budget value' });
            } else {
                // Generic error - show at top
                setErrors({ _general: errorMessage || t('errorUpdatingCampaign') || 'Failed to update campaign. Please try again.' });
            }
        }
    };

    if (!editingCampaign) return null;

    return (
        <Modal isOpen={isEditCampaignModalOpen} onClose={handleClose} title={`${t('edit')} ${t('campaign')}`}>
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
                        placeholder={t('enterCampaignName')} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                 <div>
                    <Label htmlFor="budget">{t('budget')}</Label>
                    <NumberInput id="budget" name="budget" value={formState.budget} onChange={handleChange} placeholder={t('enterCampaignBudget')} min={0} step={1} />
                </div>
                <div className="flex items-center gap-2">
                    <input id="isActive" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" checked={formState.isActive} onChange={handleChange} />
                    <label htmlFor="isActive" className="text-sm font-medium text-secondary">{t('active')}</label>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isLoading} loading={isLoading}>{t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};

