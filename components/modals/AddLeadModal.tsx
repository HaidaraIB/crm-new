
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
    <select id={id} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
        {children}
    </select>
);

export const AddLeadModal = () => {
    const { isAddLeadModalOpen, setIsAddLeadModalOpen, t, addLead, users, currentUser } = useAppContext();
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

    // Set default assignedTo to current user when modal opens or users load
    useEffect(() => {
        if (isAddLeadModalOpen && users.length > 0) {
            const defaultUserId = currentUser?.id || users[0]?.id;
            if (defaultUserId) {
                setFormState(prev => {
                    if (!prev.assignedTo) {
                        return { ...prev, assignedTo: defaultUserId.toString() };
                    }
                    return prev;
                });
            }
        }
    }, [isAddLeadModalOpen, users.length, currentUser?.id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.name || !formState.phone) {
            // Add proper validation feedback
            return;
        }
        addLead({
            name: formState.name,
            phone: formState.phone,
            budget: Number(formState.budget) || 0,
            assignedTo: formState.assignedTo ? Number(formState.assignedTo) : 0,
            type: formState.type,
            communicationWay: formState.communicationWay,
            priority: formState.priority,
            status: formState.status,
        });
        setIsAddLeadModalOpen(false);
        // Reset form
        const defaultUserId = currentUser?.id || users[0]?.id || '';
        setFormState({
            name: '', phone: '', budget: '', assignedTo: defaultUserId.toString(),
            type: 'Fresh', communicationWay: 'Call', priority: 'Medium', status: 'Untouched',
        });
    };

    return (
        <Modal isOpen={isAddLeadModalOpen} onClose={() => setIsAddLeadModalOpen(false)} title={t('addNewLead')}>
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
                            <option value="">{t('selectEmployee') || 'Select Employee'}</option>
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
                {/* <div>
                    <Label htmlFor="notes">{t('notes')}</Label>
                    <textarea id="notes" rows={3} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
                </div> */}
                <div className="flex justify-end">
                    <Button type="submit">{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
