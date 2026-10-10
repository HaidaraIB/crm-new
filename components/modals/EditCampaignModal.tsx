import { Alert } from '../Alert';

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';
import { useUpdateCampaign } from '../../hooks/useQueries';
import { buildUpdateDiff } from '../../utils/buildUpdateDiff';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const EditCampaignModal = () => {
    const { isEditCampaignModalOpen, setIsEditCampaignModalOpen, t, editingCampaign, setEditingCampaign, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    
    // Update campaign mutation
    const updateCampaignMutation = useUpdateCampaign();
    const isLoading = updateCampaignMutation.isPending;
    const initialPayloadRef = useRef<Record<string, unknown> | null>(null);

    const buildPayload = (state: typeof formState, companyId: number): Record<string, unknown> => ({
        name: state.name.trim(),
        budget: Number(state.budget) || 0,
        is_active: state.isActive,
        company: companyId,
    });

    const [formState, setFormState] = useState({
        name: '',
        code: '',
        budget: '',
        isActive: true,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (editingCampaign) {
            const isActive = (editingCampaign as any).is_active !== undefined 
                ? (editingCampaign as any).is_active 
                : (editingCampaign.isActive !== undefined ? editingCampaign.isActive : true);
            
            const initState = {
                name: editingCampaign.name || '',
                code: editingCampaign.code || '',
                budget: editingCampaign.budget ? String(editingCampaign.budget) : '',
                isActive: isActive,
            };
            setFormState(initState);
            const companyId = currentUser?.company?.id;
            if (companyId) {
                initialPayloadRef.current = buildPayload(initState, companyId);
            } else {
                initialPayloadRef.current = null;
            }
        } else {
            initialPayloadRef.current = null;
        }
    }, [editingCampaign, currentUser?.company?.id]);

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
    
    const translate = (key: string) => {
        const value = t(key as never);
        return value && value !== key ? value : undefined;
    };

    const catalogValues = (): Record<string, unknown> => ({
            name: formState.name,
    });

    const applyCatalog = (values: Record<string, unknown>) => {
        const next = catalogFieldErrors('campaign.upsert', values, translate);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCampaign) return;
        
        if (!validateForm()) {
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
            const next = buildPayload(formState, companyId);
            const patch = buildUpdateDiff(initialPayloadRef.current || {}, next);
            if (Object.keys(patch).length === 0) {
                handleClose();
                return;
            }

            await updateCampaignMutation.mutateAsync({
                id: editingCampaign.id,
                data: patch,
            });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('campaignUpdatedSuccessfully') || 'Campaign updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating campaign:', error);
            const serverErrors = serverFieldErrors(error, 'campaign.upsert', translate);
            if (serverErrors.company && !serverErrors._general) serverErrors._general = serverErrors.company;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('errorUpdatingCampaign') || 'Failed to update campaign. Please try again.' });
        }
    };

    if (!editingCampaign) return null;

    return (
        <Modal isOpen={isEditCampaignModalOpen} onClose={handleClose} title={`${t('edit')} ${t('campaign')}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <Alert variant="error">{errors._general}</Alert>
                )}
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterCampaignName')} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''} onBlur={() => blurField('name')} />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                 <div>
                    <Label htmlFor="budget">{t('budget')}</Label>
                    <NumberInput id="budget" name="budget" value={formState.budget} onChange={handleChange} placeholder={t('enterCampaignBudget')} min={0} step={1} />
                    {errors.budget && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.budget}</p>
                    )}
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

