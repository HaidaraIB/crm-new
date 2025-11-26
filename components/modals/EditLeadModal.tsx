
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';
import { Lead } from '../../types';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; }) => (
    <select id={id} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100">
        {children}
    </select>
);

export const EditLeadModal = () => {
    const { isEditLeadModalOpen, setIsEditLeadModalOpen, t, updateLead, users, editingLead } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        budget: '',
        assignedTo: '',
        type: 'Fresh' as Lead['type'],
        communicationWay: 'Call',
        priority: 'Medium' as Lead['priority'],
        status: 'Untouched' as Lead['status'],
    });
    const [loading, setLoading] = useState(false);

    // Initialize form state when editingLead changes
    useEffect(() => {
        if (editingLead) {
            setFormState({
                name: editingLead.name || '',
                phone: editingLead.phone || '',
                budget: editingLead.budget?.toString() || '0',
                assignedTo: editingLead.assignedTo?.toString() || '0',
                type: editingLead.type || 'Fresh',
                communicationWay: editingLead.communicationWay || 'Call',
                priority: editingLead.priority || 'Medium',
                status: editingLead.status || 'Untouched',
            });
        }
    }, [editingLead]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
    };

    const handleClose = () => {
        setIsEditLeadModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLead) return;
        
        if (!formState.name || !formState.phone) {
            alert('Please fill in required fields');
            return;
        }

        setLoading(true);
        try {
            await updateLead(editingLead.id, {
                name: formState.name,
                phone: formState.phone,
                budget: Number(formState.budget) || 0,
                assignedTo: formState.assignedTo ? Number(formState.assignedTo) : 0,
                type: formState.type,
                communicationWay: formState.communicationWay,
                priority: formState.priority,
                status: formState.status,
            });
            handleClose();
        } catch (error) {
            console.error('Error updating lead:', error);
            alert('Failed to update lead. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!editingLead) return null;

    return (
        <Modal isOpen={isEditLeadModalOpen} onClose={handleClose} title={t('editClient') || 'Edit Client'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="name">{t('clientName')}</Label>
                        <Input id="name" placeholder={t('enterClientName')} value={formState.name} onChange={handleChange} />
                    </div>
                     <div>
                        <Label htmlFor="budget">{t('budget')}</Label>
                        <NumberInput id="budget" name="budget" value={formState.budget} onChange={handleChange} placeholder={t('enterBudget')} min={0} step={1} />
                    </div>
                    <div>
                        <Label htmlFor="phone">{t('phoneNumber')}</Label>
                        <Input id="phone" placeholder={t('enterPhoneNumber')} value={formState.phone} onChange={handleChange} />
                    </div>
                     <div>
                        <Label htmlFor="assignedTo">{t('assignedTo')}</Label>
                        <Select id="assignedTo" value={formState.assignedTo} onChange={handleChange}>
                            <option value="0">{t('selectEmployee') || 'Select Employee'}</option>
                            {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="type">{t('type')}</Label>
                        <Select id="type" value={formState.type} onChange={handleChange}>
                            <option value="Fresh">{t('fresh')}</option>
                            <option value="Cold">{t('cold')}</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="communicationWay">{t('communicationWay')}</Label>
                        <Select id="communicationWay" value={formState.communicationWay} onChange={handleChange}>
                            <option value="Call">{t('call')}</option>
                            <option value="WhatsApp">{t('whatsapp')}</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="priority">{t('priority')}</Label>
                        <Select id="priority" value={formState.priority} onChange={handleChange}>
                            <option value="High">{t('high')}</option>
                            <option value="Medium">{t('medium')}</option>
                            <option value="Low">{t('low')}</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="status">{t('status')}</Label>
                        <Select id="status" value={formState.status} onChange={handleChange}>
                            <option value="Untouched">{t('untouched') || 'Untouched'}</option>
                            <option value="Touched">{t('touched') || 'Touched'}</option>
                            <option value="Following">{t('following') || 'Following'}</option>
                            <option value="Meeting">{t('meeting') || 'Meeting'}</option>
                            <option value="No Answer">{t('noAnswer') || 'No Answer'}</option>
                            <option value="Out Of Service">{t('outOfService') || 'Out Of Service'}</option>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};

