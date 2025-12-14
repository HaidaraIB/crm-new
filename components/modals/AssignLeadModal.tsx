import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';

export const AssignLeadModal = () => {
    const { isAssignLeadModalOpen, setIsAssignLeadModalOpen, checkedLeadIds, t, users, assignLeads, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);

    const handleAssignClick = () => {
        if (!selectedUserId || checkedLeadIds.size === 0) {
            alert(t('selectEmployee') || 'Please select an employee');
            return;
        }
        setShowConfirmDialog(true);
    };

    const handleConfirmAssign = async () => {
        setIsAssigning(true);
        try {
            await assignLeads(Array.from(checkedLeadIds), Number(selectedUserId));
            
            // Close modal immediately and show success modal
            setIsAssignLeadModalOpen(false);
            setSelectedUserId('');
            setShowConfirmDialog(false);
            setSuccessMessage(t('leadsAssignedSuccessfully') || 'Leads assigned successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error assigning leads:', error);
            alert(error?.message || t('assignLeadsError') || 'Failed to assign leads. Please try again.');
        } finally {
            setIsAssigning(false);
        }
    };

    const handleClose = () => {
        setIsAssignLeadModalOpen(false);
        setSelectedUserId('');
        setShowConfirmDialog(false);
    };

    const selectedEmployee = users?.find(u => u.id === Number(selectedUserId));

    return (
        <>
            <Modal isOpen={isAssignLeadModalOpen && !showConfirmDialog} onClose={handleClose} title={t('assignLead')}>
                <div className="space-y-4">
                    <p>{t('leadsCount')}: <span className="font-bold">{checkedLeadIds.size}</span></p>
                    <div>
                        <label htmlFor="assignUser" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('selectEmployee')}</label>
                        <select 
                            id="assignUser" 
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">{t('selectEmployee') || 'Select Employee'}</option>
                            {users?.map(user => <option key={user.id} value={user.id}>{user.name}</option>) || []}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={handleClose}>{t('cancel')}</Button>
                        <Button onClick={handleAssignClick} disabled={!selectedUserId || checkedLeadIds.size === 0}>{t('assignLead')}</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showConfirmDialog} onClose={() => {
                setShowConfirmDialog(false);
            }} title={t('confirmAssignLeads') || 'Confirm Assignment'}>
                <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        {t('confirmAssignLeadsMessage') || 'Are you sure you want to assign'}
                        <span className="font-bold"> {checkedLeadIds.size} </span>
                        {t('confirmAssignLeadsMessage2') || 'lead(s) to'}
                        <span className="font-bold"> {selectedEmployee?.name || ''}</span>?
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => {
                            setShowConfirmDialog(false);
                        }} disabled={isAssigning}>
                            {t('cancel')}
                        </Button>
                        <Button onClick={handleConfirmAssign} disabled={isAssigning} loading={isAssigning}>
                            {t('confirmAssign') || 'Confirm'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};