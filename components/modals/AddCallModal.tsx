
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useCreateClientCall, useCallMethods } from '../../hooks/useQueries';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const AddCallModal = () => {
    const { isAddCallModalOpen, setIsAddCallModalOpen, selectedLead, t, language, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    
    // Fetch call methods using React Query
    const { data: callMethodsData } = useCallMethods();
    // Handle both array response and object with results property
    const callMethods = Array.isArray(callMethodsData) 
        ? callMethodsData 
        : (callMethodsData?.results || []);

    // Create client call mutation
    const createClientCallMutation = useCreateClientCall();
    const loading = createClientCallMutation.isPending;

    // Get default call method (first one from settings)
    const getDefaultCallMethod = () => {
        return callMethods.length > 0 ? callMethods[0].name : '';
    };
    
    const [callMethod, setCallMethod] = useState(getDefaultCallMethod());
    const [notes, setNotes] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!callMethod || callMethod.trim() === '') {
            newErrors.callMethod = t('callMethodRequired') || 'Call method is required';
        }

        if (!notes || notes.trim() === '') {
            newErrors.notes = t('notesRequired') || 'Notes are required';
        }

        if (!followUpDate || followUpDate.trim() === '') {
            newErrors.followUpDate = t('followUpDateRequired') || 'Follow up date is required';
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

    // Update call method when callMethods change
    React.useEffect(() => {
        if (callMethods.length > 0) {
            setCallMethod(getDefaultCallMethod());
        }
    }, [callMethods]);

    if (!selectedLead) return null;

    const handleClose = () => {
        setIsAddCallModalOpen(false);
        setCallMethod(getDefaultCallMethod());
        setNotes('');
        setFollowUpDate('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLead) return;

        if (!validateForm()) {
            return;
        }

        try {
            // Find CallMethod from settings by name
            const callMethodObj = callMethods.find(c => 
                c.name === callMethod ||
                c.name.toLowerCase() === callMethod.toLowerCase() ||
                c.name.toLowerCase().replace(/\s+/g, '_') === callMethod.toLowerCase().replace(/\s+/g, '_') ||
                c.name.toLowerCase().replace(/\s+/g, '') === callMethod.toLowerCase().replace(/\s+/g, '')
            );
            
            if (!callMethodObj) {
                setErrors({ callMethod: t('callMethodNotFound') || 'Call method not found in settings. Please select a valid call method.' });
                return;
            }
            
            await createClientCallMutation.mutateAsync({
                client: selectedLead.id, // API expects 'client' not 'clientId'
                call_method: callMethodObj.id, // API expects call_method ID (pk) not name
                notes: notes,
                follow_up_date: followUpDate, // API expects 'follow_up_date' (required)
            });

            // Reset form
            setCallMethod(getDefaultCallMethod());
            setNotes('');
            setFollowUpDate('');
            setErrors({});
            
            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('callCreatedSuccessfully') || 'Call created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error adding call:', error);
            const errorMessage = error?.message || 'Failed to add call. Please try again.';
            setErrors({ _general: errorMessage });
        }
    };

    return (
        <Modal isOpen={isAddCallModalOpen} onClose={handleClose} title={`${t('addCall') || 'Add Call'} ${t('for')} ${selectedLead.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="callMethod">{t('callMethod') || 'Call Method'} <span className="text-red-500">*</span></Label>
                    <select 
                        id="callMethod" 
                        value={callMethod} 
                        onChange={(e) => {
                            setCallMethod(e.target.value);
                            clearError('callMethod');
                        }}
                        className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${errors.callMethod ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100`}
                    >
                        {(callMethods || []).length > 0 ? (
                            (callMethods || []).map(c => (
                                <option key={c.id} value={c.name}>
                                    {c.name}
                                </option>
                            ))
                        ) : (
                            <option value="">{t('noCallMethodsAvailable') || 'No call methods available'}</option>
                        )}
                    </select>
                    {errors.callMethod && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.callMethod}</p>
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
                        placeholder={t('writeCallDetails') || 'Write call details...'}
                    />
                    {errors.notes && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.notes}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="followUpDate">{t('followUpDate') || 'Follow Up Date'} <span className="text-red-500">*</span></Label>
                    <input 
                        type="datetime-local" 
                        id="followUpDate" 
                        value={followUpDate}
                        onChange={(e) => {
                            setFollowUpDate(e.target.value);
                            clearError('followUpDate');
                        }}
                        className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${errors.followUpDate ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100`}
                    />
                    {errors.followUpDate && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.followUpDate}</p>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading} loading={loading}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
