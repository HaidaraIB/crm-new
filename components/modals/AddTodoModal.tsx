
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
    const { isAddTodoModalOpen, setIsAddTodoModalOpen, t, addTodo, deals, leads, language } = useAppContext();
    const [formState, setFormState] = useState({
        dealId: '',
        stage: 'hold' as TaskStage,
        notes: '',
        reminderDate: '',
    });
    const [loading, setLoading] = useState(false);

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
                stage: 'hold',
                notes: '',
                reminderDate: reminderDateStr,
            });
        }
    }, [isAddTodoModalOpen, deals.length]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
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
            stage: 'hold',
            notes: '',
            reminderDate: reminderDateStr,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.dealId || !formState.reminderDate) {
            alert(t('pleaseFillRequiredFields'));
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
            handleClose();
        } catch (error: any) {
            console.error('Error creating todo:', error);
            const errorMessage = error?.message || t('failedToCreateTodo');
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isAddTodoModalOpen} onClose={handleClose} title={t('addTodo')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="dealId">{t('deal')}</Label>
                    <Select id="dealId" value={formState.dealId} onChange={handleChange}>
                        <option value="">{t('selectDeal')}</option>
                        {deals.map(deal => (
                            <option key={deal.id} value={deal.id}>{deal.clientName}</option>
                        ))}
                    </Select>
                </div>
                <div>
                    <Label htmlFor="stage">{t('stage')}</Label>
                    <Select id="stage" value={formState.stage} onChange={handleChange}>
                        <option value="hold">{getStageDisplayLabel('hold', t)}</option>
                        <option value="meeting">{getStageDisplayLabel('meeting', t)}</option>
                        <option value="done_meeting">{getStageDisplayLabel('done_meeting', t)}</option>
                        <option value="following">{getStageDisplayLabel('following', t)}</option>
                        <option value="no_answer">{getStageDisplayLabel('no_answer', t)}</option>
                        <option value="whatsapp_pending">{getStageDisplayLabel('whatsapp_pending', t)}</option>
                        <option value="out_of_service">{getStageDisplayLabel('out_of_service', t)}</option>
                        <option value="cancellation">{getStageDisplayLabel('cancellation', t)}</option>
                        <option value="not_interested">{getStageDisplayLabel('not_interested', t)}</option>
                        <option value="follow_after_meeting">{getStageDisplayLabel('follow_after_meeting', t)}</option>
                        <option value="reschedule_meeting">{getStageDisplayLabel('reschedule_meeting', t)}</option>
                        <option value="broker">{getStageDisplayLabel('broker', t)}</option>
                        <option value="resale">{getStageDisplayLabel('resale', t)}</option>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="reminderDate">{t('reminderDateAndTime')}</Label>
                    <Input id="reminderDate" type="datetime-local" value={formState.reminderDate} onChange={handleChange} />
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
                    <Button type="submit" disabled={loading}>{loading ? t('loading') : t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

