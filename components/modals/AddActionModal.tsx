
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useCreateClientTask, useStages } from '../../hooks/useQueries';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const AddActionModal = () => {
    const { isAddActionModalOpen, setIsAddActionModalOpen, selectedLead, t, language, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    
    // Fetch stages using React Query
    const { data: stagesData } = useStages();
    // Handle both array response and object with results property
    const stages = Array.isArray(stagesData) 
        ? stagesData 
        : (stagesData?.results || []);

    // Create client task mutation
    const createClientTaskMutation = useCreateClientTask();
    const loading = createClientTaskMutation.isPending;

    // Get default stage from selectedLead's lastStage or first stage from settings
    const getDefaultStage = () => {
        if (selectedLead?.lastStage) {
            // Try to find matching stage by name (case-insensitive)
            const matchingStage = stages.find(s => 
                s.name === selectedLead.lastStage ||
                s.name.toLowerCase().replace(/\s+/g, '_') === selectedLead.lastStage?.toLowerCase().replace(/\s+/g, '_')
            );
            if (matchingStage) {
                return matchingStage.name;
            }
        }
        // Return first stage from settings, or empty string if none
        return stages.length > 0 ? stages[0].name : '';
    };
    
    const [stage, setStage] = useState(getDefaultStage());
    const [notes, setNotes] = useState('');
    const [reminder, setReminder] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!stage || stage.trim() === '') {
            newErrors.stage = t('stageRequired') || 'Stage is required';
        }

        if (!notes || notes.trim() === '') {
            newErrors.notes = t('notesRequired') || 'Notes are required';
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

    // Update stage when selectedLead or stages change
    React.useEffect(() => {
        if (selectedLead && stages.length > 0) {
            setStage(getDefaultStage());
        }
    }, [selectedLead, stages]);

    if (!selectedLead) return null;

    const handleClose = () => {
        setIsAddActionModalOpen(false);
        setStage(getDefaultStage());
        setNotes('');
        setReminder('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLead) return;

        if (!validateForm()) {
            return;
        }

        try {
            // البحث عن Stage من الإعدادات بناءً على الاسم
            // Try exact match first, then case-insensitive, then normalized
            const stageObj = stages.find(s => 
                s.name === stage ||
                s.name.toLowerCase() === stage.toLowerCase() ||
                s.name.toLowerCase().replace(/\s+/g, '_') === stage.toLowerCase().replace(/\s+/g, '_') ||
                s.name.toLowerCase().replace(/\s+/g, '') === stage.toLowerCase().replace(/\s+/g, '')
            );
            
            if (!stageObj) {
                setErrors({ stage: t('stageNotFound') || 'Stage not found in settings. Please select a valid stage.' });
                return;
            }
            
            await createClientTaskMutation.mutateAsync({
                client: selectedLead.id, // API expects 'client' not 'clientId'
                stage: stageObj.id, // API expects stage ID (pk) not name
                notes: notes,
                reminder_date: reminder || null, // API expects 'reminder_date' not 'reminderDate'
            });

            // Reset form
            setStage(getDefaultStage());
            setNotes('');
            setReminder('');
            setErrors({});
            
            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('actionCreatedSuccessfully') || 'Action created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error adding action:', error);
            const errorMessage = error?.message || 'Failed to add action. Please try again.';
            setErrors({ _general: errorMessage });
        }
    };

    return (
        <Modal isOpen={isAddActionModalOpen} onClose={handleClose} title={`${t('add_action')} ${t('for')} ${selectedLead.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="stage">{t('stage')} <span className="text-red-500">*</span></Label>
                    <select 
                        id="stage" 
                        value={stage} 
                        onChange={(e) => {
                            setStage(e.target.value);
                            clearError('stage');
                        }}
                        className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${errors.stage ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100`}
                    >
                        {(stages || []).length > 0 ? (
                            (stages || []).map(s => (
                                <option key={s.id} value={s.name}>
                                    {s.name}
                                </option>
                            ))
                        ) : (
                            <option value="">{t('noStagesAvailable') || 'No stages available'}</option>
                        )}
                    </select>
                    {errors.stage && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stage}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="notes">{t('notes')} <span className="text-red-500">*</span></Label>
                    <textarea 
                        id="notes" 
                        rows={4} 
                        value={notes}
                        onChange={(e) => {
                            setNotes(e.target.value);
                            clearError('notes');
                        }}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${errors.notes ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100`}
                        placeholder={t('writeActionDetails')}
                    />
                    {errors.notes && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.notes}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="reminder">{t('reminderDate')}</Label>
                    <input 
                        type="datetime-local" 
                        id="reminder" 
                        value={reminder}
                        onChange={(e) => setReminder(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
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
