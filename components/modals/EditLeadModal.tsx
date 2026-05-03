
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';
import { PhoneInput } from '../PhoneInput';
import { Checkbox } from '../Checkbox';
import { Lead, PhoneNumber } from '../../types';
import { PlusIcon, TrashIcon } from '../icons';
import { useUpdateLead, useUsers, useStatuses, useChannels } from '../../hooks/useQueries';
import { isUserOnWeeklyDayOff } from '../../utils/weekOff';
import { buildLeadAssigneePickerOptions, showInLeadAssigneePicker } from '../../utils/roles';
import { LeadInterestInventoryFields, buildInterestedInventoryApiBody } from '../LeadInterestInventoryFields';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange, className, language }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string; language?: 'ar' | 'en' }) => {
    const { language: contextLanguage } = useAppContext();
    const lang = language || contextLanguage;
    return (
        <select id={id} value={value} onChange={onChange} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${className || ''}`}>
            {children}
        </select>
    );
};

export const EditLeadModal = () => {
    const { isEditLeadModalOpen, setIsEditLeadModalOpen, t, editingLead, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    const companyTz = currentUser?.company?.timezone ?? 'UTC';
    
    // Fetch data using React Query
    const { data: usersResponse } = useUsers();
    const users = usersResponse?.results || [];

    const { data: statusesData } = useStatuses();
    const statuses = Array.isArray(statusesData)
        ? statusesData
        : (statusesData?.results || []);

    const { data: channelsData } = useChannels();
    const channels = Array.isArray(channelsData)
        ? channelsData
        : (channelsData?.results || []);
    const chList = channels;
    const stList = statuses;
    const defaultChannelName = React.useMemo(() => {
        if (!chList.length) return '';
        const c = chList.find((x: { isDefault?: boolean; is_default?: boolean }) => x.isDefault ?? x.is_default) || chList[0];
        return c?.name ?? '';
    }, [chList]);
    const defaultStatusName = React.useMemo(() => {
        if (!stList.length) return '';
        const s = stList.find((x: { isDefault?: boolean; is_default?: boolean; isHidden?: boolean }) => (x.isDefault ?? x.is_default) && !x.isHidden)
            || stList.find((x: { isHidden?: boolean }) => !x.isHidden) || stList[0];
        return s?.name ?? '';
    }, [stList]);

    // Update lead mutation
    const updateLeadMutation = useUpdateLead();
    const loading = updateLeadMutation.isPending;

    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        budget: '',
        budgetMax: '',
        assignedTo: '',
        type: '' as Lead['type'],
        communicationWay: '',
        priority: '' as Lead['priority'],
        status: '' as Lead['status'],
        leadCompanyName: '',
        profession: '',
        notes: '',
        interestedDeveloper: '',
        interestedProject: '',
        interestedUnit: '',
    });
    const [phoneNumbers, setPhoneNumbers] = useState<Array<Omit<PhoneNumber, 'id' | 'created_at' | 'updated_at'> | PhoneNumber>>([]);

    const userOptions = React.useMemo(
        () => buildLeadAssigneePickerOptions(users, currentUser),
        [users, currentUser]
    );

    // Initialize form state when editingLead changes
    useEffect(() => {
        if (editingLead) {
            const aid = editingLead.assignedTo;
            let assignedToField = '';
            if (aid) {
                const assignee = users.find((u) => u.id === aid);
                if (assignee && showInLeadAssigneePicker(assignee.role)) {
                    assignedToField = String(aid);
                }
            }
            setFormState({
                name: editingLead.name || '',
                phone: editingLead.phone || '',
                budget: editingLead.budget != null ? String(editingLead.budget) : '',
                budgetMax:
                    editingLead.budgetMax != null
                        ? String(editingLead.budgetMax)
                        : (editingLead as any).budget_max != null
                          ? String((editingLead as any).budget_max)
                          : '',
                assignedTo: assignedToField,
                type: editingLead.type || '',
                communicationWay: editingLead.communicationWay || defaultChannelName,
                priority: editingLead.priority || '',
                status: editingLead.status || defaultStatusName,
                leadCompanyName: editingLead.leadCompanyName ?? (editingLead as any).lead_company_name ?? '',
                profession: editingLead.profession ?? (editingLead as any).profession ?? '',
                notes: editingLead.notes ?? (editingLead as any).notes ?? '',
                interestedDeveloper:
                    (editingLead as Lead).interestedDeveloper != null
                        ? String((editingLead as Lead).interestedDeveloper)
                        : (editingLead as any).interested_developer != null
                          ? String((editingLead as any).interested_developer)
                          : '',
                interestedProject:
                    (editingLead as Lead).interestedProject != null
                        ? String((editingLead as Lead).interestedProject)
                        : (editingLead as any).interested_project != null
                          ? String((editingLead as any).interested_project)
                          : '',
                interestedUnit:
                    (editingLead as Lead).interestedUnit != null
                        ? String((editingLead as Lead).interestedUnit)
                        : (editingLead as any).interested_unit != null
                          ? String((editingLead as any).interested_unit)
                          : '',
            });
            // Initialize phone numbers from editingLead
            if (editingLead.phoneNumbers && editingLead.phoneNumbers.length > 0) {
                setPhoneNumbers(editingLead.phoneNumbers.map(pn => ({
                    ...pn,
                    phone_number: pn.phone_number,
                })));
            } else if (editingLead.phone) {
                // If no phone numbers but has phone, create one
                setPhoneNumbers([{
                    phone_number: editingLead.phone,
                    phone_type: 'mobile',
                    is_primary: true,
                    notes: '',
                }]);
            } else {
                setPhoneNumbers([]);
            }
        }
    }, [editingLead, defaultChannelName, defaultStatusName, users]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
    };

    const handleClose = () => {
        setIsEditLeadModalOpen(false);
    };

    const handleAddPhoneNumber = () => {
        setPhoneNumbers(prev => [...prev, {
            phone_number: '',
            phone_type: 'mobile',
            is_primary: prev.length === 0, // First phone is primary by default
            notes: '',
        }]);
    };

    const handleRemovePhoneNumber = (index: number) => {
        setPhoneNumbers(prev => {
            const newPhones = prev.filter((_, i) => i !== index);
            // If we removed the primary, make the first one primary
            if (newPhones.length > 0 && !newPhones.some(p => p.is_primary)) {
                newPhones[0].is_primary = true;
            }
            return newPhones;
        });
    };

    const handlePhoneNumberChange = (index: number, field: keyof PhoneNumber, value: string | boolean) => {
        setPhoneNumbers(prev => {
            const newPhones = [...prev];
            if (field === 'is_primary' && value === true) {
                // If setting this as primary, unset all others
                newPhones.forEach((p, i) => {
                    p.is_primary = i === index;
                });
            } else {
                newPhones[index] = { ...newPhones[index], [field]: value };
            }
            return newPhones;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLead) return;
        
        if (!formState.name) {
            alert('Please fill in required fields');
            return;
        }

        // Use phone numbers if provided, otherwise use single phone field
        const finalPhoneNumbers = phoneNumbers.length > 0 
            ? phoneNumbers.filter(pn => pn.phone_number.trim() !== '')
            : formState.phone 
            ? [{
                phone_number: formState.phone,
                phone_type: 'mobile' as const,
                is_primary: true,
                notes: '',
            }]
            : [];
        
        if (finalPhoneNumbers.length === 0) {
            alert('At least one phone number is required');
            return;
        }

        try {
            const channelId = formState.communicationWay
                ? (chList.find((c: { id?: number; name?: string }) =>
                    c.id?.toString() === formState.communicationWay || c.name === formState.communicationWay)?.id ?? null)
                : null;
            const statusId = formState.status
                ? (stList.find((s: { id?: number; name?: string }) =>
                    s.id?.toString() === formState.status || s.name === formState.status)?.id ?? null)
                : null;

            const priorityValue = formState.priority
                ? (formState.priority.toLowerCase() as 'low' | 'medium' | 'high')
                : null;
            const typeValue = formState.type
                ? (formState.type.toLowerCase() as 'fresh' | 'cold')
                : null;

            const primaryPhone =
                finalPhoneNumbers.find(pn => pn.is_primary)?.phone_number
                || finalPhoneNumbers[0]?.phone_number
                || '';

            const companyId = currentUser?.company?.id;
            if (!companyId) {
                alert(t('companyRequired') || 'Company is required. Please log in again.');
                return;
            }

            const updateData: Record<string, unknown> = {
                name: formState.name,
                phone_numbers: finalPhoneNumbers,
                budget: formState.budget ? Number(formState.budget) : null,
                budget_max: formState.budgetMax?.trim() ? Number(formState.budgetMax) : null,
                assigned_to: formState.assignedTo ? Number(formState.assignedTo) : null,
                type: typeValue,
                communication_way: channelId,
                priority: priorityValue,
                status: statusId,
                company: companyId,
                lead_company_name: formState.leadCompanyName?.trim() || null,
                profession: formState.profession?.trim() || null,
                notes: formState.notes?.trim() ? formState.notes.trim() : null,
                ...buildInterestedInventoryApiBody(currentUser?.company?.specialization, {
                    interestedDeveloper: formState.interestedDeveloper,
                    interestedProject: formState.interestedProject,
                    interestedUnit: formState.interestedUnit,
                }),
            };
            if (primaryPhone) {
                updateData.phone_number = primaryPhone;
            }

            await updateLeadMutation.mutateAsync({ id: editingLead.id, data: updateData });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('leadUpdatedSuccessfully') || 'Lead updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating lead:', error);
            const code = error?.code || error?.error_key;
            if (code === 'employee_weekly_day_off') {
                alert(
                    t('employeeWeeklyDayOffAssignError')
                    || error?.message
                    || 'Cannot assign to this employee on their weekly day off.'
                );
                return;
            }
            if (error?.fields?.assigned_to) {
                const fe = error.fields.assigned_to;
                alert(Array.isArray(fe) ? fe[0] : String(fe));
                return;
            }
            alert(error?.message || t('errorUpdatingLead') || 'Failed to update lead. Please try again.');
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
                        <Label htmlFor="leadCompanyName">{t('leadCompanyName')}</Label>
                        <Input id="leadCompanyName" placeholder={t('enterLeadCompanyName')} value={formState.leadCompanyName} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="profession">{t('profession')}</Label>
                        <Input id="profession" placeholder={t('enterProfession')} value={formState.profession} onChange={handleChange} />
                    </div>
                    <LeadInterestInventoryFields
                        className="md:col-span-2"
                        idPrefix="edit-lead-modal-inv"
                        value={{
                            interestedDeveloper: formState.interestedDeveloper,
                            interestedProject: formState.interestedProject,
                            interestedUnit: formState.interestedUnit,
                        }}
                        onChange={(inv) => setFormState((prev) => ({ ...prev, ...inv }))}
                    />
                    <div className="md:col-span-2">
                        <Label htmlFor="notes">{t('notes')}</Label>
                        <textarea
                            id="notes"
                            rows={3}
                            value={formState.notes}
                            onChange={handleChange}
                            placeholder={t('enterNotes') || 'Enter notes...'}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                        />
                    </div>
                     <div>
                        <Label htmlFor="budget">{t('budget')}</Label>
                        <NumberInput id="budget" name="budget" value={formState.budget} onChange={handleChange} placeholder={t('enterBudget')} min={0} step={1} />
                    </div>
                    <div>
                        <Label htmlFor="budgetMax">{t('budgetMaxOptional')}</Label>
                        <NumberInput id="budgetMax" name="budgetMax" value={formState.budgetMax} onChange={handleChange} placeholder={t('enterBudgetMax')} min={0} step={1} />
                    </div>
                    <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="phoneNumbers">{t('phoneNumbers') || 'Phone Numbers'}</Label>
                            <Button type="button" variant="secondary" onClick={handleAddPhoneNumber} className="text-xs">
                                <PlusIcon className="w-4 h-4" /> {t('addPhoneNumber') || 'Add Phone Number'}
                            </Button>
                        </div>
                        {phoneNumbers.length === 0 ? (
                            <div>
                                <PhoneInput 
                                    id="phone" 
                                    placeholder={t('enterPhoneNumber')} 
                                    value={formState.phone} 
                                    onChange={(value) => setFormState(prev => ({ ...prev, phone: value }))}
                                    defaultCountry="IQ"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t('orAddMultiplePhones') || 'Or add multiple phone numbers below'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {phoneNumbers.map((pn, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-12 sm:col-span-6">
                                            <PhoneInput
                                                placeholder={t('enterPhoneNumber')}
                                                value={pn.phone_number}
                                                onChange={(value) => handlePhoneNumberChange(index, 'phone_number', value)}
                                                defaultCountry="IQ"
                                            />
                                        </div>
                                        <div className="col-span-6 sm:col-span-2">
                                            <Select
                                                id={`phone_type_${index}`}
                                                value={pn.phone_type}
                                                onChange={(e) => handlePhoneNumberChange(index, 'phone_type', e.target.value)}
                                            >
                                                <option value="mobile">{t('mobile') || 'Mobile'}</option>
                                                <option value="home">{t('home') || 'Home'}</option>
                                                <option value="work">{t('work') || 'Work'}</option>
                                                <option value="other">{t('other') || 'Other'}</option>
                                            </Select>
                                        </div>
                                        <div className="col-span-4 sm:col-span-3">
                                            <Checkbox
                                                id={`is_primary_${index}`}
                                                checked={pn.is_primary}
                                                onChange={(e) => handlePhoneNumberChange(index, 'is_primary', e.target.checked)}
                                                label={t('primary') || 'Primary'}
                                                labelClassName="text-xs"
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePhoneNumber(index)}
                                                className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                title={t('delete') || 'Delete'}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                     <div>
                        <Label htmlFor="assignedTo">{t('assignedTo')}</Label>
                        <Select id="assignedTo" value={formState.assignedTo} onChange={handleChange}>
                            <option value="">{t('selectEmployee') || 'Select Employee'}</option>
                            {userOptions.map(user => {
                                const off = isUserOnWeeklyDayOff(user, companyTz);
                                return (
                                    <option key={user.id} value={user.id.toString()} disabled={off}>
                                        {(user.name || user.username || user.email || `User ${user.id}`)
                                            + (off ? ` (${t('weeklyDayOff')})` : '')}
                                    </option>
                                );
                            })}
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
                        <Select id="communicationWay" value={formState.communicationWay || ''} onChange={handleChange}>
                            <option value="">{t('selectChannel') || 'Select Channel'}</option>
                            {(channels || []).length > 0 ? (
                                (channels || []).map(channel => (
                                    <option key={channel.id} value={channel.name}>
                                        {channel.name}
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>{t('noChannelsAvailable') || 'No channels available'}</option>
                            )}
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
                        <Select id="status" value={formState.status || ''} onChange={handleChange}>
                            <option value="">{t('selectStatus') || 'Select Status'}</option>
                            {(statuses || []).length > 0 ? (
                                (statuses || [])
                                    .filter(s => !s.isHidden) // Only show non-hidden statuses
                                    .map(status => (
                                        <option key={status.id} value={status.name}>
                                            {status.name}
                                        </option>
                                    ))
                            ) : (
                                <option value="" disabled>{t('noStatusesAvailable') || 'No statuses available'}</option>
                            )}
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading} loading={loading}>{t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};

