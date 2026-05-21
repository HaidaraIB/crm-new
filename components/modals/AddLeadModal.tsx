
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
import { useCreateLead, useUsers, useStatuses, useChannels } from '../../hooks/useQueries';
import { isUserOnWeeklyDayOff } from '../../utils/weekOff';
import { buildLeadAssigneePickerOptions, isDataEntryOnlyRole } from '../../utils/roles';
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

export const AddLeadModal = () => {
    const { isAddLeadModalOpen, setIsAddLeadModalOpen, t, currentUser, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const isDataEntryUser = isDataEntryOnlyRole(currentUser?.role);
    
    // Fetch data using React Query
    const { data: usersResponse } = useUsers();
    const users = usersResponse?.results || [];

    // Ensure admin (current user) is included in the options even if not in the users list
    const userOptions = React.useMemo(
        () => buildLeadAssigneePickerOptions(users, currentUser),
        [users, currentUser]
    );

    const { data: statusesData } = useStatuses();
    const statuses = Array.isArray(statusesData)
        ? statusesData
        : (statusesData?.results || []);

    const { data: channelsData } = useChannels();
    const channels = Array.isArray(channelsData)
        ? channelsData
        : (channelsData?.results || []);
    const companyTz = currentUser?.company?.timezone ?? 'UTC';

    // Create lead mutation
    const createLeadMutation = useCreateLead();
    const isLoading = createLeadMutation.isPending;
    
    // Get default status from settings (first non-hidden status or first status)
    const getDefaultStatus = () => {
        if (!Array.isArray(statuses) || statuses.length === 0) return undefined;
        const defaultStatus = statuses.find((s: { isDefault?: boolean; is_default?: boolean; isHidden?: boolean }) => (s.isDefault ?? s.is_default) && !s.isHidden) || 
                             statuses.find((s: { isHidden?: boolean }) => !s.isHidden) || 
                             statuses[0];
        return defaultStatus ? defaultStatus.name as Lead['status'] : undefined;
    };
    
    // Get default channel from settings (first default or first channel)
    const getDefaultChannel = () => {
        if (!Array.isArray(channels) || channels.length === 0) return undefined;
        const defaultChannel = channels.find((c: { isDefault?: boolean; is_default?: boolean }) => c.isDefault ?? c.is_default) || channels[0];
        return defaultChannel ? defaultChannel.name : undefined;
    };
    
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        budget: '',
        budgetMax: '',
        assignedTo: '',
        type: '' as Lead['type'],
        communicationWay: getDefaultChannel() ?? '',
        priority: '' as Lead['priority'],
        status: getDefaultStatus() ?? '',
        leadCompanyName: '',
        profession: '',
        residence: '',
        notes: '',
        interestedDeveloper: '',
        interestedProject: '',
        interestedUnit: '',
    });
    
    const [phoneNumbers, setPhoneNumbers] = useState<Array<Omit<PhoneNumber, 'id' | 'created_at' | 'updated_at'>>>([]);

    // Set default assignedTo to current user when modal opens or users load
    useEffect(() => {
        if (isDataEntryUser) return;
        if (isAddLeadModalOpen && userOptions.length > 0) {
            const defaultUserId =
                userOptions.find((u) => u.id === currentUser?.id)?.id ?? userOptions[0]?.id;
            if (defaultUserId) {
                setFormState(prev => {
                    if (!prev.assignedTo) {
                        return { ...prev, assignedTo: defaultUserId.toString() };
                    }
                    return prev;
                });
            }
        }
    }, [isAddLeadModalOpen, userOptions, currentUser?.id]);
    
    // Update default status and channel when settings change
    useEffect(() => {
        if (isAddLeadModalOpen) {
            setFormState(prev => ({
                ...prev,
                status: getDefaultStatus(),
                communicationWay: getDefaultChannel(),
            }));
        }
    }, [isAddLeadModalOpen, statuses, channels]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
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
        if (!formState.name) {
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
            // At least one phone number is required
            return;
        }
        
        try {
            const channelId = formState.communicationWay
                ? (channels.find((c: { id?: number; name?: string }) =>
                    c.id?.toString() === formState.communicationWay || c.name === formState.communicationWay)?.id ?? null)
                : null;
            const statusId = formState.status
                ? (statuses.find((s: { id?: number; name?: string }) =>
                    s.id?.toString() === formState.status || s.name === formState.status)?.id ?? null)
                : null;

            const priorityValue = formState.priority
                ? (formState.priority.toLowerCase() as 'low' | 'medium' | 'high')
                : null;
            const typeValue = formState.type
                ? (formState.type.toLowerCase() as 'fresh' | 'hot' | 'cold')
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

            const leadData: Record<string, unknown> = {
                name: formState.name,
                phone_numbers: finalPhoneNumbers,
                budget: formState.budget ? Number(formState.budget) : null,
                budget_max: formState.budgetMax?.trim() ? Number(formState.budgetMax) : null,
                type: typeValue,
                communication_way: channelId,
                priority: priorityValue,
                status: statusId,
                company: companyId,
                lead_company_name: formState.leadCompanyName?.trim() || null,
                profession: formState.profession?.trim() || null,
                residence: formState.residence?.trim() || null,
                notes: formState.notes?.trim() ? formState.notes.trim() : null,
                ...buildInterestedInventoryApiBody(currentUser?.company?.specialization, {
                    interestedDeveloper: formState.interestedDeveloper,
                    interestedProject: formState.interestedProject,
                    interestedUnit: formState.interestedUnit,
                }),
            };
            if (primaryPhone) {
                leadData.phone_number = primaryPhone;
            }
            if (!isDataEntryUser) {
                leadData.assigned_to = formState.assignedTo ? Number(formState.assignedTo) : null;
            }

            await createLeadMutation.mutateAsync(leadData);

            // Reset form
            const defaultUserId = isDataEntryUser ? '' : (currentUser?.id || users[0]?.id || '');
            setFormState({
                name: '', phone: '', budget: '', budgetMax: '', assignedTo: defaultUserId.toString(),
                type: '', communicationWay: getDefaultChannel() ?? '', priority: '', status: getDefaultStatus() ?? '', leadCompanyName: '', profession: '', residence: '', notes: '',
                interestedDeveloper: '', interestedProject: '', interestedUnit: '',
            });
            setPhoneNumbers([]);
            
            // Close modal immediately and show success modal
            setIsAddLeadModalOpen(false);
            setSuccessMessage(t('leadCreatedSuccessfully') || 'Lead created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating lead:', error);
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
            alert(error?.message || t('errorCreatingLead') || 'Failed to create lead. Please try again.');
        }
    };

    return (
        <Modal isOpen={isAddLeadModalOpen} onClose={() => {
            setIsAddLeadModalOpen(false);
        }} title={t('addNewLead')}>
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
                    <div>
                        <Label htmlFor="residence">{t('residence')}</Label>
                        <Input id="residence" placeholder={t('enterResidence')} value={formState.residence} onChange={handleChange} />
                    </div>
                    <LeadInterestInventoryFields
                        className="md:col-span-2"
                        idPrefix="add-lead-inv"
                        value={{
                            interestedDeveloper: formState.interestedDeveloper,
                            interestedProject: formState.interestedProject,
                            interestedUnit: formState.interestedUnit,
                        }}
                        onChange={(inv) => setFormState((prev) => ({ ...prev, ...inv }))}
                    />
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
                     {!isDataEntryUser && (
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
                     )}
                    <div>
                        <Label htmlFor="type">{t('type')}</Label>
                        <Select id="type" value={formState.type} onChange={handleChange}>
                            <option value="Fresh">{t('fresh')}</option>
                            <option value="Hot">{t('hot')}</option>
                            <option value="Cold">{t('cold')}</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="communicationWay">{t('communicationWay')}</Label>
                        <Select id="communicationWay" value={formState.communicationWay} onChange={handleChange}>
                            {(channels || []).length > 0 ? (
                                (channels || []).map(channel => (
                                    <option key={channel.id} value={channel.name}>
                                        {channel.name}
                                    </option>
                                ))
                            ) : (
                                <option value="">{t('noChannelsAvailable') || 'No channels available'}</option>
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
                        <Select id="status" value={formState.status} onChange={handleChange}>
                            {(statuses || []).length > 0 ? (
                                (statuses || [])
                                    .filter(s => !s.isHidden) // Only show non-hidden statuses
                                    .map(status => (
                                        <option key={status.id} value={status.name}>
                                            {status.name}
                                        </option>
                                    ))
                            ) : (
                                <option value="">{t('noStatusesAvailable') || 'No statuses available'}</option>
                            )}
                        </Select>
                    </div>
                </div>
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
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setIsAddLeadModalOpen(false)} disabled={isLoading}>
                        {t('cancel')}
                    </Button>
                    <Button type="submit" loading={isLoading} disabled={isLoading}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
