
import React, { useState, useEffect } from 'react';
import { Alert } from '../Alert';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import {Input, AutoDirTextarea } from '../Input';
import { NumberInput } from '../NumberInput';
import { Button } from '../Button';
import { useAddStatus } from '../../hooks/useQueries';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

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
        isDefault: false,
        autoDeleteHoursRaw: '',
        requiresChangeReason: false,
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
        const next = catalogFieldErrors('status.upsert', values, translate);

        return next;
    };

    const validateForm = (): boolean => {
        const next = applyCatalog(catalogValues());
        if (!currentUser?.company?.id) {
            next._general = t('companyRequired') || 'Company is required';
        }
        const raw = String(formState.autoDeleteHoursRaw || '').trim();
        if (raw !== '') {
            const n = parseInt(raw, 10);
            if (!Number.isFinite(n) || n < 1) {
                next.autoDeleteHoursRaw = t('invalidNumber') || 'Enter a whole number of hours (1 or more), or leave empty';
            }
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const blurField = (field: string) => {
        const next = applyCatalog(catalogValues());
        if (field === 'autoDeleteHoursRaw') {
            const raw = String(formState.autoDeleteHoursRaw || '').trim();
            if (raw !== '') {
                const n = parseInt(raw, 10);
                if (!Number.isFinite(n) || n < 1) {
                    next.autoDeleteHoursRaw = t('invalidNumber') || 'Enter a whole number of hours (1 or more), or leave empty';
                }
            }
        }
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
        if (isAddStatusModalOpen) {
            setFormState({
                name: '',
                description: '',
                category: 'active',
                color: '#808080',
                isDefault: false,
                autoDeleteHoursRaw: '',
                requiresChangeReason: false,
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
            isDefault: false,
            autoDeleteHoursRaw: '',
            requiresChangeReason: false,
        });
        setErrors({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            const raw = formState.autoDeleteHoursRaw.trim();
            const auto_delete_after_hours = raw === '' ? null : parseInt(raw, 10);

            await addStatusMutation.mutateAsync({
                name: formState.name,
                description: formState.description,
                category: formState.category,
                color: formState.color,
                is_default: formState.isDefault,
                is_hidden: false,
                company: currentUser?.company?.id,
                auto_delete_after_hours,
                requires_change_reason: formState.requiresChangeReason,
            });

            handleClose();
            setSuccessMessage(t('statusCreatedSuccessfully') || 'Status created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating status:', error);
            const serverErrors = serverFieldErrors(error, 'status.upsert', translate);
            if (serverErrors.company && !serverErrors._general) serverErrors._general = serverErrors.company;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('failedToCreateStatus') || 'Failed to create status. Please try again.' });
        }
    };

    return (
        <Modal isOpen={isAddStatusModalOpen} onClose={handleClose} title={t('addStatus') || 'Add Status'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <Alert variant="error">{errors._general}</Alert>
                )}
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterStatusName') || 'Enter status name'} 
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
                        placeholder={t('enterStatusDescription') || 'Enter status description'} onBlur={() => blurField('description')} />
                    {errors.description && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                    )}
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
                    <Label htmlFor="autoDeleteHoursRaw">{t('autoDeleteAfterHoursLabel')}</Label>
                    <NumberInput
                        id="autoDeleteHoursRaw"
                        min={1}
                        placeholder={t('autoDeleteHoursPlaceholder')}
                        value={formState.autoDeleteHoursRaw}
                        onChange={(e) => {
                            setFormState((prev) => ({ ...prev, autoDeleteHoursRaw: e.target.value }));
                            if (errors.autoDeleteHoursRaw) {
                                setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.autoDeleteHoursRaw;
                                    return next;
                                });
                            }
                        }}
                        onBlur={() => blurField('autoDeleteHoursRaw')}
                        className={errors.autoDeleteHoursRaw ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.autoDeleteHoursRaw && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.autoDeleteHoursRaw}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('autoDeleteHelp')}</p>
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
                        onChange={(e) => setFormState(prev => ({ ...prev, isDefault: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary bg-white dark:bg-gray-800"
                    />
                    <Label htmlFor="isDefault">{t('setAsDefault') || 'Set as default'}</Label>
                </div>
                <div className="flex items-start gap-2">
                    <input
                        type="checkbox"
                        id="requiresChangeReason"
                        checked={formState.requiresChangeReason}
                        onChange={(e) => setFormState(prev => ({ ...prev, requiresChangeReason: e.target.checked }))}
                        className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary bg-white dark:bg-gray-800"
                    />
                    <div>
                        <Label htmlFor="requiresChangeReason">{t('requiresChangeReasonLabel')}</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('requiresChangeReasonHelp')}</p>
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

