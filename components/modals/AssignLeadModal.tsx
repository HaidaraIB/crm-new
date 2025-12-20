import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { useUsers, useAssignLeads } from '../../hooks/useQueries';
import { getUserDisplayName } from '../../types';

export const AssignLeadModal = () => {
    const { isAssignLeadModalOpen, setIsAssignLeadModalOpen, checkedLeadIds, setCheckedLeadIds, t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [isUnassign, setIsUnassign] = useState<boolean>(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    
    // Fetch users using React Query
    const { data: usersResponse } = useUsers();
    const { currentUser } = useAppContext();
    const users = usersResponse?.results || [];
    
    // Ensure admin (current user) is included in the options even if not in the users list
    const userOptions = React.useMemo(() => {
        const options = [...users];
        if (currentUser && !options.find(u => u.id === currentUser.id)) {
            options.unshift(currentUser);
        }
        return options;
    }, [users, currentUser]);
    
    // Assign leads mutation
    const assignLeadsMutation = useAssignLeads();
    const isAssigning = assignLeadsMutation.isPending;

    const handleAssignClick = () => {
        if (checkedLeadIds.size === 0) {
            alert(t('selectLeads') || 'Please select at least one lead');
            return;
        }
        if (!isUnassign && selectedUserId === '') {
            alert(t('selectEmployee') || 'Please select an employee');
            return;
        }
        setShowConfirmDialog(true);
    };

    const handleUnassignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsUnassign(checked);
        if (checked) {
            setSelectedUserId(''); // Clear selected user when unassign is checked
        }
    };

    const handleUserSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedUserId(e.target.value);
        if (e.target.value !== '') {
            setIsUnassign(false); // Clear unassign when user is selected
        }
    };

    const handleConfirmAssign = async () => {
        try {
            // Convert to number or null based on checkbox
            const userId = isUnassign ? null : (selectedUserId ? Number(selectedUserId) : null);
            
            await assignLeadsMutation.mutateAsync({
                clientIds: Array.from(checkedLeadIds),
                userId: userId
            });
            
            // Close modal immediately and show success modal
            setIsAssignLeadModalOpen(false);
            setSelectedUserId('');
            setIsUnassign(false);
            setShowConfirmDialog(false);
            setCheckedLeadIds(new Set()); // Clear selection after success
            const successMessage = isUnassign 
                ? (t('leadsUnassignedSuccessfully') || 'Leads unassigned successfully!')
                : (t('leadsAssignedSuccessfully') || 'Leads assigned successfully!');
            setSuccessMessage(successMessage);
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error assigning leads:', error);
            alert(error?.message || t('assignLeadsError') || 'Failed to assign leads. Please try again.');
        }
    };

    const handleClose = () => {
        setIsAssignLeadModalOpen(false);
        setSelectedUserId('');
        setIsUnassign(false);
        setShowConfirmDialog(false);
    };

    const selectedEmployee = selectedUserId && !isUnassign
        ? userOptions?.find(u => u.id === Number(selectedUserId))
        : null;

    return (
        <>
            <Modal isOpen={isAssignLeadModalOpen && !showConfirmDialog} onClose={handleClose} title={t('assignLead')}>
                <div className="space-y-4">
                    <p>{t('leadsCount')}: <span className="font-bold">{checkedLeadIds.size}</span></p>
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="assignUser" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('selectEmployee')}</label>
                            <select 
                                id="assignUser" 
                                value={selectedUserId}
                                onChange={handleUserSelectChange}
                                disabled={isUnassign}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">{t('selectEmployee') || 'Select Employee'}</option>
                                {userOptions?.map(user => <option key={user.id} value={user.id}>{getUserDisplayName(user)}</option>) || []}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="unassignCheckbox"
                                checked={isUnassign}
                                onChange={handleUnassignChange}
                            />
                            <label htmlFor="unassignCheckbox" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                {t('unassign') || 'Unassign'}
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={handleClose}>{t('cancel')}</Button>
                        <Button onClick={handleAssignClick} disabled={(isUnassign ? false : selectedUserId === '') || checkedLeadIds.size === 0}>
                            {isUnassign ? (t('unassign') || 'Unassign') : t('assignLead')}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showConfirmDialog} onClose={() => {
                setShowConfirmDialog(false);
            }} title={t('confirmAssignLeads') || 'Confirm Assignment'}>
                <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        {isUnassign ? (
                            <>
                                {t('confirmUnassignLeadsMessage') || 'Are you sure you want to unassign'}
                                <span className="font-bold"> {checkedLeadIds.size} </span>
                                {t('confirmUnassignLeadsMessage2') || 'lead(s)?'}
                            </>
                        ) : (
                            <>
                                {t('confirmAssignLeadsMessage') || 'Are you sure you want to assign'}
                                <span className="font-bold"> {checkedLeadIds.size} </span>
                                {t('confirmAssignLeadsMessage2') || 'lead(s) to'}
                                <span className="font-bold"> {selectedEmployee ? getUserDisplayName(selectedEmployee) : ''}</span>?
                            </>
                        )}
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
