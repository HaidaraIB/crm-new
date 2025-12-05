
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { TaskStage } from '../../types';
import { getStageDisplayLabel } from '../../utils/taskStageMapper';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; }) => {
    const { language } = useAppContext();
    return (
        <select id={id} value={value} onChange={onChange} dir={language === 'ar' ? 'rtl' : 'ltr'} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100">
            {children}
        </select>
    );
};

export const AddTodoModal = () => {
    const { isAddTodoModalOpen, setIsAddTodoModalOpen, t, addTodo, deals, leads, language, stages, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    
    // Get default stage from settings (first stage or 'Hold')
    const getDefaultStage = () => {
        if (stages.length > 0) {
            return stages[0].name as TaskStage;
        }
        return 'Hold' as TaskStage;
    };
    
    const [formState, setFormState] = useState({
        dealId: '',
        stage: getDefaultStage(),
        notes: '',
        reminderDate: '',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.dealId || formState.dealId === '') {
            newErrors.dealId = t('dealRequired') || 'Deal is required';
        }

        if (!formState.reminderDate || formState.reminderDate.trim() === '') {
            newErrors.reminderDate = t('reminderDateRequired') || 'Reminder date is required';
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

    // Initialize form state when modal opens
    useEffect(() => {
        if (isAddTodoModalOpen && deals.length > 0) {
            // Set default reminder date to tomorrow at 9 AM
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            const reminderDateStr = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
            
            setFormState({
                dealId: deals[0].id.toString(),
                stage: getDefaultStage(),
                notes: '',
                reminderDate: reminderDateStr,
            });
        }
    }, [isAddTodoModalOpen, deals.length, stages]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsAddTodoModalOpen(false);
        // Reset form state
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const reminderDateStr = tomorrow.toISOString().slice(0, 16);
        
        setFormState({
            dealId: deals.length > 0 ? deals[0].id.toString() : '',
            stage: getDefaultStage(),
            notes: '',
            reminderDate: reminderDateStr,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            await addTodo({
                dealId: Number(formState.dealId),
                stage: formState.stage,
                notes: formState.notes,
                reminderDate: formState.reminderDate,
            });

            // Reset form
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            const reminderDateStr = tomorrow.toISOString().slice(0, 16);
            
            setFormState({
                dealId: deals.length > 0 ? deals[0].id.toString() : '',
                stage: getDefaultStage(),
                notes: '',
                reminderDate: reminderDateStr,
            });
            setErrors({});
            
            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('todoCreatedSuccessfully') || 'Todo created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating todo:', error);
            const errorMessage = error?.message || t('failedToCreateTodo') || 'Failed to create todo. Please try again.';
            setErrors({ _general: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isAddTodoModalOpen} onClose={handleClose} title={t('addTodo')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="dealId">{t('deal')} <span className="text-red-500">*</span></Label>
                    <Select 
                        id="dealId" 
                        value={formState.dealId} 
                        onChange={handleChange}
                        className={errors.dealId ? 'border-red-500 dark:border-red-500' : ''}
                    >
                        <option value="">{t('selectDeal')}</option>
                        {deals.map(deal => (
                            <option key={deal.id} value={deal.id}>{deal.clientName}</option>
                        ))}
                    </Select>
                    {errors.dealId && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dealId}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="stage">{t('stage')}</Label>
                    <Select id="stage" value={formState.stage} onChange={handleChange}>
                        {stages.length > 0 ? (
                            stages.map(stage => (
                                <option key={stage.id} value={stage.name}>
                                    {stage.name}
                                </option>
                            ))
                        ) : (
                            <option value="">{t('noStagesAvailable') || 'No stages available'}</option>
                        )}
                    </Select>
                </div>
                <div>
                    <Label htmlFor="reminderDate">{t('reminderDateAndTime')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="reminderDate" 
                        type="datetime-local" 
                        value={formState.reminderDate} 
                        onChange={handleChange}
                        className={errors.reminderDate ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.reminderDate && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reminderDate}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="notes">{t('notes')}</Label>
                    <textarea 
                        id="notes" 
                        rows={4} 
                        value={formState.notes}
                        onChange={handleChange}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" 
                        placeholder={t('enterNotes')}
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading} loading={loading}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

