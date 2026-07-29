import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { useUsers, useAssignLeads } from '../../hooks/useQueries';
import { getUserDisplayName } from '../../types';
import { isUserOnWeeklyDayOff } from '../../utils/weekOff';
import { buildLeadAssigneePickerOptions } from '../../utils/roles';
import { clearFieldError } from '../../utils/formFieldErrors';

export const AssignLeadModal = () => {
    const { isAssignLeadModalOpen, setIsAssignLeadModalOpen, checkedLeadIds, setCheckedLeadIds, t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [isUnassign, setIsUnassign] = useState<boolean>(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    // Fetch users using React Query
    const { data: usersResponse } = useUsers();
    const { currentUser } = useAppContext();
    const users = usersResponse?.results || [];
    
    const userOptions = React.useMemo(
        () => buildLeadAssigneePickerOptions(users, currentUser),
        [users, currentUser]
    );

    const companyTz = currentUser?.company?.timezone ?? 'UTC';
    
    // Assign leads mutation
    const assignLeadsMutation = useAssignLeads();
    const isAssigning = assignLeadsMutation.isPending;

    const handleAssignClick = () => {
        const newErrors: Record<string, string> = {};
        if (checkedLeadIds.size === 0) {
            newErrors.selectedLeads = t('selectLeads') || 'Please select at least one lead';
        }
        if (!isUnassign && selectedUserId === '') {
            newErrors.userId = t('selectEmployee') || 'Please select an employee';
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});
        setShowConfirmDialog(true);
    };

    const handleUnassignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsUnassign(checked);
        if (checked) {
            setSelectedUserId(''); // Clear selected user when unassign is checked
            clearFieldError(setErrors, 'userId');
        }
    };

    const handleUserSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedUserId(e.target.value);
        if (e.target.value !== '') {
            setIsUnassign(false); // Clear unassign when user is selected
        }
        clearFieldError(setErrors, 'userId');
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
            setErrors({});
            setCheckedLeadIds(new Set()); // Clear selection after success
            const successMessage = isUnassign 
                ? (t('leadsUnassignedSuccessfully') || 'Leads unassigned successfully!')
                : (t('leadsAssignedSuccessfully') || 'Leads assigned successfully!');
            setSuccessMessage(successMessage);
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error assigning leads:', error);
            setShowConfirmDialog(false);
            if (error?.code === 'employee_weekly_day_off') {
                setErrors({ general: t('errorEmployeeWeeklyDayOff') || error?.message || 'Cannot assign to this employee on their weekly day off.' });
            } else {
                setErrors({ general: error?.message || t('assignLeadsError') || 'Failed to assign leads. Please try again.' });
            }
        }
    };

    const handleClose = () => {
        setIsAssignLeadModalOpen(false);
        setSelectedUserId('');
        setIsUnassign(false);
        setShowConfirmDialog(false);
        setErrors({});
    };

    const selectedEmployee = selectedUserId && !isUnassign
        ? userOptions?.find(u => u.id === Number(selectedUserId))
        : null;

    return (
        <>
            <Modal isOpen={isAssignLeadModalOpen && !showConfirmDialog} onClose={handleClose} title={t('assignLead')}>
                <div className="space-y-4">
                    {errors.general && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-600 dark:text-red-400">
                            {errors.general}
                        </div>
                    )}
                    <div>
                        <p>{t('leadsCount')}: <span className="font-bold">{checkedLeadIds.size}</span></p>
                        {errors.selectedLeads && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.selectedLeads}</p>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="assignUser" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('selectEmployee')}</label>
                            <select 
                                id="assignUser" 
                                value={selectedUserId}
                                onChange={handleUserSelectChange}
                                disabled={isUnassign}
                                className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${errors.userId ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            >
                                <option value="">{t('selectEmployee') || 'Select Employee'}</option>
                                {userOptions?.map(user => {
                                    const off = isUserOnWeeklyDayOff(
                                        { weekly_day_off: user.weekly_day_off },
                                        companyTz
                                    );
                                    return (
                                        <option key={user.id} value={user.id} disabled={off}>
                                            {getUserDisplayName(user) + (off ? ` (${t('weeklyDayOff')})` : '')}
                                        </option>
                                    );
                                }) || []}
                            </select>
                            {errors.userId && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.userId}</p>
                            )}
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
