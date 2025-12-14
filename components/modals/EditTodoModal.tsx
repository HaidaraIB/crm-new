
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { useUpdateTask, useDeals, useStages, useTasks } from '../../hooks/useQueries';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
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

interface EditTodoModalProps {
    todoId: number | null;
    onClose: () => void;
}

export const EditTodoModal = ({ todoId, onClose }: EditTodoModalProps) => {
    const { t, language, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    
    // Fetch data using React Query
    const { data: dealsResponse } = useDeals();
    const deals = Array.isArray(dealsResponse) 
        ? dealsResponse 
        : (dealsResponse?.results || []);

    const { data: stagesData } = useStages();
    const stages = Array.isArray(stagesData) 
        ? stagesData 
        : (stagesData?.results || []);

    // Fetch tasks to get the current todo data
    const { data: tasksResponse } = useTasks();
    const allTasksRaw = tasksResponse?.results || [];
    
    // Find the current todo
    const currentTodo = todoId ? allTasksRaw.find((task: any) => task.id === todoId) : null;

    // Update task mutation
    const updateTaskMutation = useUpdateTask();
    const loading = updateTaskMutation.isPending;
    
    const [formState, setFormState] = useState({
        dealId: '',
        stageId: '',
        notes: '',
        reminderDate: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Initialize form state when modal opens or todo changes
    useEffect(() => {
        if (todoId && currentTodo) {
            // Get deal ID - handle both deal object and deal_id
            const dealId = currentTodo.deal_id || (typeof currentTodo.deal === 'number' ? currentTodo.deal : (currentTodo.deal?.id)) || '';
            
            // Get stage ID - handle both stage object and stage_id
            const stageId = currentTodo.stage_id || (typeof currentTodo.stage === 'number' ? currentTodo.stage : (currentTodo.stage?.id)) || '';
            
            // Format reminder_date for datetime-local input
            const reminderDate = currentTodo.reminder_date || currentTodo.reminderDate || '';
            let formattedReminderDate = '';
            if (reminderDate) {
                try {
                    const date = new Date(reminderDate);
                    if (!isNaN(date.getTime())) {
                        // Format as YYYY-MM-DDTHH:mm for datetime-local input
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        formattedReminderDate = `${year}-${month}-${day}T${hours}:${minutes}`;
                    }
                } catch (e) {
                    console.error('Error formatting reminder date:', e);
                }
            }
            
            setFormState({
                dealId: dealId ? dealId.toString() : '',
                stageId: stageId ? stageId.toString() : '',
                notes: currentTodo.notes || '',
                reminderDate: formattedReminderDate,
            });
            setErrors({});
        }
    }, [todoId, currentTodo]);

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.dealId || formState.dealId === '') {
            newErrors.dealId = t('dealRequired') || 'Deal is required';
        }

        if (!formState.stageId || formState.stageId === '') {
            newErrors.stageId = t('stageRequired') || 'Stage is required';
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!todoId) {
            return;
        }
        
        if (!validateForm()) {
            return;
        }

        try {
            const payload = {
                deal: Number(formState.dealId), // API expects 'deal' field with deal ID
                stage: Number(formState.stageId), // API expects stage ID (pk), not name
                notes: formState.notes || '',
                reminder_date: formState.reminderDate, // API expects snake_case
            };
            
            
            await updateTaskMutation.mutateAsync({ 
                id: todoId, 
                data: payload
            });

            // Close modal and show success message
            onClose();
            setSuccessMessage(t('todoUpdatedSuccessfully') || 'Todo updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating todo:', error);
            
            // Handle API validation errors
            let errorMessage = t('failedToUpdateTodo') || 'Failed to update todo. Please try again.';
            const newErrors: { [key: string]: string } = {};
            
            if (error?.message) {
                try {
                    const errorData = JSON.parse(error.message);
                    
                    Object.keys(errorData).forEach(key => {
                        if (Array.isArray(errorData[key])) {
                            newErrors[key] = errorData[key][0];
                        } else if (typeof errorData[key] === 'string') {
                            newErrors[key] = errorData[key];
                        }
                    });
                    
                    // Map API field names to form field names
                    if (newErrors.deal) {
                        newErrors.dealId = newErrors.deal;
                        delete newErrors.deal;
                    }
                    if (newErrors.stage) {
                        newErrors.stageId = newErrors.stage;
                        delete newErrors.stage;
                    }
                    if (newErrors.reminder_date) {
                        newErrors.reminderDate = newErrors.reminder_date;
                        delete newErrors.reminder_date;
                    }
                    
                    setErrors(newErrors);
                    
                    // Show first error in alert
                    const firstError = Object.values(newErrors)[0];
                    if (firstError) {
                        errorMessage = firstError;
                    }
                } catch (e) {
                    // If parsing fails, use the error message as is
                    errorMessage = error.message;
                }
            } else if (error?.fields || error?.response?.data) {
                const errorData = error.fields || error.response?.data || {};
                
                Object.keys(errorData).forEach(key => {
                    if (Array.isArray(errorData[key])) {
                        newErrors[key] = errorData[key][0];
                    } else if (typeof errorData[key] === 'string') {
                        newErrors[key] = errorData[key];
                    }
                });
                
                // Map API field names to form field names
                if (newErrors.deal) {
                    newErrors.dealId = newErrors.deal;
                    delete newErrors.deal;
                }
                if (newErrors.stage) {
                    newErrors.stageId = newErrors.stage;
                    delete newErrors.stage;
                }
                if (newErrors.reminder_date) {
                    newErrors.reminderDate = newErrors.reminder_date;
                    delete newErrors.reminder_date;
                }
                
                setErrors(newErrors);
                
                // Show first error in alert
                const firstError = Object.values(newErrors)[0];
                if (firstError) {
                    errorMessage = firstError;
                }
            }
            
            setErrors(prev => ({ ...prev, _general: errorMessage }));
        }
    };

    if (!todoId) {
        return null;
    }

    return (
        <Modal isOpen={!!todoId} onClose={onClose} title={t('editTodo') || 'Edit Todo'}>
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
                        <option value="">{t('selectDeal') || 'Select Deal'}</option>
                        {deals.length > 0 ? (
                            deals.map((deal: any) => (
                                <option key={deal.id} value={deal.id.toString()}>
                                    {deal.clientName || `Deal #${deal.id}`}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>{t('noDealsAvailable') || 'No deals available'}</option>
                        )}
                    </Select>
                    {errors.dealId && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dealId}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="stageId">{t('stage')} <span className="text-red-500">*</span></Label>
                    <Select 
                        id="stageId" 
                        value={formState.stageId} 
                        onChange={handleChange}
                        className={errors.stageId ? 'border-red-500 dark:border-red-500' : ''}
                    >
                        <option disabled value="">{t('selectStage') || 'Select Stage'}</option>
                        {(stages || []).length > 0 ? (
                            (stages || []).map((stage: any) => (
                                <option key={stage.id} value={stage.id.toString()}>
                                    {stage.name}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>{t('noStagesAvailable') || 'No stages available'}</option>
                        )}
                    </Select>
                    {errors.stageId && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stageId}</p>
                    )}
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
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading} loading={loading}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

