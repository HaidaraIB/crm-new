
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const AddActionModal = () => {
    const { isAddActionModalOpen, setIsAddActionModalOpen, selectedLead, t, addClientTask, language } = useAppContext();
    const [stage, setStage] = useState(selectedLead?.lastStage || 'untouched');
    const [notes, setNotes] = useState('');
    const [reminder, setReminder] = useState('');
    const [loading, setLoading] = useState(false);

    if (!selectedLead) return null;

    const handleClose = () => {
        setIsAddActionModalOpen(false);
        setStage(selectedLead.lastStage || 'untouched');
        setNotes('');
        setReminder('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLead) return;

        setLoading(true);
        try {
            await addClientTask({
                clientId: selectedLead.id,
                stage: stage.toLowerCase().replace(/\s+/g, '_'),
                notes: notes,
                reminderDate: reminder || null,
            });
            handleClose();
        } catch (error) {
            console.error('Error adding action:', error);
            alert('Failed to add action. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isAddActionModalOpen} onClose={handleClose} title={`${t('add_action')} ${t('for')} ${selectedLead.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="stage">{t('stage')}</Label>
                    <select 
                        id="stage" 
                        value={stage} 
                        onChange={(e) => setStage(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                    >
                        <option value="untouched">{t('untouched')}</option>
                        <option value="touched">{t('touched')}</option>
                        <option value="following">{t('following')}</option>
                        <option value="meeting">{t('meeting')}</option>
                        <option value="no_answer">{t('noAnswer')}</option>
                        <option value="out_of_service">{t('outOfService')}</option>
                    </select>
                </div>
                <div>
                    <Label htmlFor="notes">{t('notes')}</Label>
                    <textarea 
                        id="notes" 
                        rows={4} 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100" 
                        placeholder={t('writeActionDetails')}
                    />
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
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
