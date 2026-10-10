
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Input, Button, NumberInput, PhoneInput, Checkbox, PageBackButton, PageLoadingState, FieldError, IconButton, Select } from '../components/index';
import { Channel, Lead, PhoneNumber, Status, Tag } from '../types';
import { PlusIcon, TrashIcon } from '../components/icons';
import { useUsers, useStatuses, useChannels, useTags, usePatchLead } from '../hooks/useQueries';
import { TagMultiSelect } from '../components/leads/TagMultiSelect';
import { goToPreviousPage } from '../utils/routing';
import { getAssignmentBlockReason, ASSIGNMENT_BLOCK_LABEL_KEY } from '../utils/weekOff';
import { buildLeadAssigneePickerOptions } from '../utils/roles';
import { LeadInterestInventoryFields } from '../components/LeadInterestInventoryFields';
import { LeadLocationMapPicker } from '../components/LeadLocationMapPicker';
import { parseLeadCoordinate } from '../utils/leadLocation';
import { mapApiLeadToDisplayLead, normalizeLead } from '../utils/normalizeLead';
import { mapLeadApiErrorToFieldErrors } from '../utils/leadFormValidation';
import { catalogFieldErrors, serverFieldErrors } from '../forms';
import { scrollToFirstFieldError } from '../utils/formFieldErrors';
import { Alert } from '../components/Alert';
import { LeadUrgentToggle } from '../components/LeadUrgentToggle';

/** Error key -> DOM id, for scrolling to the first invalid field on submit. */
const LEAD_FIELD_DOM_IDS: Record<string, string> = {
    name: 'name',
    phone: 'phone',
    communicationWay: 'communicationWay',
    status: 'status',
    priority: 'priority',
    type: 'type',
    leadCompanyName: 'leadCompanyName',
    notes: 'notes',
};
import { buildLeadUpdateDiff, buildLeadUpdatePayload } from '../utils/leadUpdatePayload';
import { StatusChangeReasonModal } from '../components/modals/StatusChangeReasonModal';
import { useStatusChangeReason } from '../hooks/useStatusChangeReason';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const EditLeadPage = () => {
    const { t, setCurrentPage, editingLead, setEditingLead, setSelectedLead, currentUser } = useAppContext();
    const goLeads = () => {
        window.history.pushState({}, '', '/leads');
        setCurrentPage('Leads');
    };
    const goBack = () => {
        if (!editingLead) {
            goToPreviousPage(goLeads);
            return;
        }
        setSelectedLead(editingLead);
        goToPreviousPage(() => {
            window.history.pushState({}, '', `/view-lead/${editingLead.id}`);
            setCurrentPage('ViewLead');
        });
    };

    const isMedicalCompany = useMemo(
        () => String(currentUser?.company?.specialization || '').toLowerCase() === 'medical',
        [currentUser?.company?.specialization],
    );
    
    // Fetch data using React Query hooks
    const { data: usersResponse } = useUsers();
    const users = usersResponse?.results || [];
    
    const userOptions = React.useMemo(
        () => buildLeadAssigneePickerOptions(users, currentUser),
        [users, currentUser]
    );

    const companyTz = currentUser?.company?.timezone ?? 'UTC';
    
    const { data: statusesData } = useStatuses();
    // Handle both array response and object with results property
    const statuses: Status[] = Array.isArray(statusesData)
        ? statusesData
        : (statusesData?.results || []);

    const { requestStatusChange, reasonModalProps } = useStatusChangeReason(statuses);

    const { data: channelsData } = useChannels();
    // Handle both array response and object with results property
    const channels: Channel[] = Array.isArray(channelsData)
        ? channelsData
        : (channelsData?.results || []);

    const { data: tagsData } = useTags();
    const tags: Tag[] = Array.isArray(tagsData) ? tagsData : (tagsData?.results || []);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    
    // Sparse PATCH so only real field changes hit the API / timeline
    const updateLeadMutation = usePatchLead();
    const isSaving = updateLeadMutation.isPending;
    const initialPayloadRef = useRef<Record<string, unknown> | null>(null);

    const [pageLoading, setPageLoading] = useState(true);
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        budget: '',
        budgetMax: '',
        assignedTo: '',
        type: '' as 'fresh' | 'hot' | 'cold' | '',
        communicationWay: '',
        priority: '' as 'low' | 'medium' | 'high' | '',
        isUrgent: false,
        status: '',
        leadCompanyName: '',
        profession: '',
        residence: '',
        locationLatitude: '',
        locationLongitude: '',
        notes: '',
        interestedDeveloper: '',
        interestedProject: '',
        interestedUnit: '',
    });
    const [phoneNumbers, setPhoneNumbers] = useState<Array<Omit<PhoneNumber, 'id' | 'created_at' | 'updated_at'> | PhoneNumber>>([]);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const timer = setTimeout(() => setPageLoading(false), 100);
        return () => clearTimeout(timer);
    }, []);

    const translate = (key: string) => {
        const value = t(key as never);
        return value && value !== key ? value : undefined;
    };

    const leadCatalogValues = (
        state = formState,
        phones: PhoneNumber[] = phoneNumbers,
    ) => {
        const filled = phones.filter((pn) => (pn.phone_number || '').trim() !== '');
        const phone = filled[0]?.phone_number || state.phone;
        return {
            name: state.name,
            phone,
            phone_number: phone,
            ...(filled.length ? { phoneNumbers: filled, phone_numbers: filled } : {}),
            communicationWay: state.communicationWay,
            communication_way: state.communicationWay,
            status: state.status,
            priority: state.priority,
            type: state.type,
            leadCompanyName: state.leadCompanyName,
            lead_company_name: state.leadCompanyName,
            notes: state.notes,
        };
    };

    const mirrorLeadErrors = (raw: Record<string, string>) => {
        const next = { ...raw };
        if (next._general && !next.general) next.general = next._general;
        if (next.companyId && !next.company) next.company = next.companyId;
        if (next.company && !next.companyId) next.companyId = next.company;
        if (next.phoneNumbers && !next.phone) next.phone = next.phoneNumbers;
        if (next.phone_number && !next.phone) next.phone = next.phone_number;
        for (const [key, message] of Object.entries(raw)) {
            if ((key.startsWith('phone_numbers') || key.startsWith('phoneNumbers')) && !next.phone) {
                next.phone = message;
            }
        }
        return next;
    };

    const showLeadField = (
        field: string,
        state = formState,
        phones: PhoneNumber[] = phoneNumbers,
    ) => {
        const next = mirrorLeadErrors(catalogFieldErrors('lead.upsert', leadCatalogValues(state, phones), translate));
        const keys = new Set<string>([field]);
        if (field === 'phone' || field === 'phoneNumbers') {
            keys.add('phone');
            keys.add('phoneNumbers');
            keys.add('phone_number');
        }
        setErrors((prev) => {
            const updated = { ...prev };
            for (const key of keys) {
                if (next[key]) updated[key] = next[key];
                else delete updated[key];
            }
            return updated;
        });
    };

    const validateForm = (): boolean => {
        const next = mirrorLeadErrors(catalogFieldErrors('lead.upsert', leadCatalogValues(), translate));
        setErrors(next);
        if (Object.keys(next).length > 0) {
            requestAnimationFrame(() => scrollToFirstFieldError(next, LEAD_FIELD_DOM_IDS));
            return false;
        }
        return true;
    };

    // Initialize form state when editingLead changes
    useEffect(() => {
        if (editingLead) {
            // Set selectedLead to ensure ViewLeadPage has the lead data
            setSelectedLead(editingLead);
            
            // Convert type and priority to lowercase for form state
            const typeValue: 'fresh' | 'hot' | 'cold' | '' = editingLead.type
                ? (editingLead.type.toLowerCase() as 'fresh' | 'hot' | 'cold')
                : '';
            const priorityValue: 'low' | 'medium' | 'high' | '' = editingLead.priority
                ? (editingLead.priority.toLowerCase() as 'low' | 'medium' | 'high')
                : '';
            
            // Find channel and status IDs from names
            // API may return names, but we need IDs for the form
            let channelId = '';
            let statusId = '';
            
            if (editingLead.communicationWay) {
                // Try to find by name first (for backward compatibility)
                const channel = channels.find(c => c.name === editingLead.communicationWay);
                if (channel) {
                    channelId = channel.id.toString();
                } else {
                    // If not found by name, assume it's already an ID
                    channelId = editingLead.communicationWay;
                }
            }
            
            if (editingLead.status) {
                // Try to find by name first (for backward compatibility)
                const status = statuses.find(s => s.name === editingLead.status);
                if (status) {
                    statusId = status.id.toString();
                } else {
                    // If not found by name, assume it's already an ID
                    statusId = editingLead.status;
                }
            }
            
            // Preserve real assignee id even if not in the picker (do not invent currentUser)
            const assignedToField = editingLead.assignedTo ? String(editingLead.assignedTo) : '';

            const nextForm = {
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
                type: typeValue,
                // Keep empty when lead has no channel/status — do not invent defaults on edit
                communicationWay: channelId,
                priority: priorityValue,
                isUrgent: Boolean(
                    (editingLead as Lead).isUrgent ?? (editingLead as any).is_urgent
                ),
                status: statusId,
                leadCompanyName: editingLead.leadCompanyName ?? (editingLead as any).lead_company_name ?? '',
                profession: editingLead.profession ?? (editingLead as any).profession ?? '',
                residence: (editingLead as Lead).residence ?? (editingLead as any).residence ?? '',
                locationLatitude: (() => {
                    const v = parseLeadCoordinate(
                        (editingLead as Lead).locationLatitude ??
                            (editingLead as any).location_latitude
                    );
                    return v != null ? String(v) : '';
                })(),
                locationLongitude: (() => {
                    const v = parseLeadCoordinate(
                        (editingLead as Lead).locationLongitude ??
                            (editingLead as any).location_longitude
                    );
                    return v != null ? String(v) : '';
                })(),
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
            };
            setFormState(nextForm);
            
            // Initialize phone numbers from editingLead
            let nextPhones: Array<Omit<PhoneNumber, 'id' | 'created_at' | 'updated_at'> | PhoneNumber> = [];
            if (editingLead.phoneNumbers && editingLead.phoneNumbers.length > 0) {
                nextPhones = editingLead.phoneNumbers.map(pn => ({
                    ...pn,
                    phone_number: pn.phone_number,
                }));
            } else if (editingLead.phone) {
                nextPhones = [{
                    phone_number: editingLead.phone,
                    phone_type: 'mobile',
                    is_primary: true,
                    notes: '',
                }];
            }
            setPhoneNumbers(nextPhones);

            const nextTagIds: number[] = Array.isArray((editingLead as Lead).tags)
                ? ((editingLead as Lead).tags as number[])
                : ((editingLead as Lead).tagsDetail ?? []).map((tag) => tag.id);
            setSelectedTagIds(nextTagIds);

            const companyId = currentUser?.company?.id;
            if (companyId) {
                initialPayloadRef.current = buildLeadUpdatePayload({
                    formState: nextForm,
                    phoneNumbers: nextPhones,
                    channels,
                    statuses,
                    tagIds: nextTagIds,
                    companyId,
                    specialization: currentUser?.company?.specialization,
                });
            } else {
                initialPayloadRef.current = null;
            }
        }
    }, [editingLead, setSelectedLead, channels, statuses, currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        const nextState = { ...formState, [id]: value };
        setFormState(nextState);
        if (errors[id]) showLeadField(id, nextState, phoneNumbers);
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
        if (field === 'phone_number' && errors.phone) {
            const nextPhones = phoneNumbers.map((pn, i) => (i === index ? { ...pn, phone_number: String(value) } : pn));
            showLeadField('phone', formState, nextPhones);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLead) return;
        
        // Clear previous errors
        setErrors({});
        
        // Validate form before submission
        if (!validateForm()) {
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

        const companyId = currentUser?.company?.id;
        if (!companyId) {
            setErrors({
                general: t('companyRequired') || 'Company is required. Please log in again.'
            });
            return;
        }

        const submitPatch = async (patchData: Record<string, unknown>, reason?: string) => {
            try {
                const updatedLead = await updateLeadMutation.mutateAsync({
                    id: editingLead.id,
                    data: reason ? { ...patchData, status_change_reason: reason } : patchData,
                });

                // Update selectedLead with the updated data
                if (updatedLead) {
                    const transformedLead = mapApiLeadToDisplayLead(updatedLead);
                    setSelectedLead(transformedLead);
                    setEditingLead(transformedLead);
                    initialPayloadRef.current = buildLeadUpdatePayload({
                        formState,
                        phoneNumbers: finalPhoneNumbers,
                        channels,
                        statuses,
                        companyId,
                        specialization: currentUser?.company?.specialization,
                    });
                }

                // Navigate to ViewLead page to see the updated lead
                window.history.pushState({}, '', `/view-lead/${editingLead.id}`);
                setCurrentPage('ViewLead');
            } catch (error: any) {
                console.error('Error updating lead:', error);
                const server = mirrorLeadErrors(serverFieldErrors(error, 'lead.upsert', translate));
                const fallback = mapLeadApiErrorToFieldErrors(error, t, 'errorUpdatingLead');
                const next = Object.keys(server).length > 0 ? { ...fallback, ...server } : fallback;
                setErrors(next);
                requestAnimationFrame(() => scrollToFirstFieldError(next, LEAD_FIELD_DOM_IDS));
            }
        };

        try {
            const updateData = buildLeadUpdatePayload({
                formState,
                phoneNumbers: finalPhoneNumbers,
                channels,
                statuses,
                tagIds: selectedTagIds,
                companyId,
                specialization: currentUser?.company?.specialization,
            });

            const initial = initialPayloadRef.current;
            const patchData = initial
                ? buildLeadUpdateDiff(initial, updateData)
                : updateData;

            if (Object.keys(patchData).length === 0) {
                window.history.pushState({}, '', `/view-lead/${editingLead.id}`);
                setCurrentPage('ViewLead');
                return;
            }

            // A `status` key in the sparse diff means the status actually changed, so
            // a flagged target status prompts for its reason before the patch goes out.
            const nextStatusId = patchData.status != null ? Number(patchData.status) : null;
            if (nextStatusId != null && Number.isFinite(nextStatusId)) {
                requestStatusChange(nextStatusId, (reason) => submitPatch(patchData, reason));
                return;
            }

            await submitPatch(patchData);
        } catch (error: any) {
            console.error('Error updating lead:', error);
            const server = mirrorLeadErrors(serverFieldErrors(error, 'lead.upsert', translate));
            const fallback = mapLeadApiErrorToFieldErrors(error, t, 'errorUpdatingLead');
            const next = Object.keys(server).length > 0 ? { ...fallback, ...server } : fallback;
            setErrors(next);
            requestAnimationFrame(() => scrollToFirstFieldError(next, LEAD_FIELD_DOM_IDS));
        }
    };

    if (!editingLead) {
        return (
            <PageWrapper title={
                <div className="flex min-w-0 items-center gap-3">
                    <PageBackButton onClick={goBack} />
                    <span className="truncate">{t('editLead')}</span>
                </div>
            }>
                <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">{t('noLeadSelected')}</p>
                    <Button variant="secondary" onClick={goBack} className="mt-4">
                        {t('back')}
                    </Button>
                </div>
            </PageWrapper>
        );
    }

    if (pageLoading) {
        return (
            <PageWrapper title={
                <div className="flex min-w-0 items-center gap-3">
                    <PageBackButton onClick={goBack} />
                    <span className="truncate">{t('editLead')}</span>
                </div>
            }>
                <PageLoadingState label={t('loading') || 'Loading'} />
            </PageWrapper>
        );
    }

    return (
        <PageWrapper 
            title={
                <div className="flex min-w-0 items-center gap-3">
                    <PageBackButton onClick={goBack} />
                    <span className="truncate">{t('editLead')}</span>
                </div>
            }
        >
            <form onSubmit={handleSubmit}>
                <Card>
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b pb-3 dark:border-gray-700">
                        <h3 className="text-lg font-semibold">
                            {t('leadInformation') || 'Lead Information'}
                        </h3>
                        <LeadUrgentToggle
                            enabled={formState.isUrgent}
                            setEnabled={(enabled) =>
                                setFormState((prev) => ({ ...prev, isUrgent: enabled }))
                            }
                            candidateUsers={userOptions}
                            companyTimeZone={companyTz}
                        />
                    </div>
                    {errors.general && (
                        <Alert variant="error" className="mb-4">{errors.general}</Alert>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="md:col-span-2 lg:col-span-1">
                            <Label htmlFor="name">{t('clientName')} <span className="text-red-500">*</span></Label>
                            <Input 
                                id="name" 
                                placeholder={t('enterClientName')} 
                                value={formState.name} 
                                onChange={handleChange}
                                onBlur={() => showLeadField('name')}
                                className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                            />
                            <FieldError>{errors.name}</FieldError>
                        </div>
                        <div>
                            <Label htmlFor="leadCompanyName">{t('leadCompanyName')}</Label>
                            <Input
                                id="leadCompanyName"
                                placeholder={t('enterLeadCompanyName')}
                                value={formState.leadCompanyName}
                                onChange={handleChange}
                                onBlur={() => showLeadField('leadCompanyName')}
                                className={errors.leadCompanyName ? 'border-red-500 dark:border-red-500' : ''}
                            />
                            <FieldError>{errors.leadCompanyName}</FieldError>
                        </div>
                        <div>
                            <Label htmlFor="profession">{t('profession')}</Label>
                            <Input
                                id="profession"
                                placeholder={t('enterProfession')}
                                value={formState.profession}
                                onChange={handleChange}
                            />
                        </div>
                        {isMedicalCompany && (
                            <>
                                <div>
                                    <Label htmlFor="residence">{t('residence')}</Label>
                                    <Input
                                        id="residence"
                                        placeholder={t('enterResidence')}
                                        value={formState.residence}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="patientFileDisplay">{t('patientFileNumber')}</Label>
                                    <Input
                                        id="patientFileDisplay"
                                        readOnly
                                        className="bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                                        value={String(
                                            normalizeLead(editingLead).patientFileNumber ?? '',
                                        )}
                                    />
                                </div>
                            </>
                        )}
                        <div className="md:col-span-2 lg:col-span-3">
                            <LeadLocationMapPicker
                                latitude={formState.locationLatitude}
                                longitude={formState.locationLongitude}
                                onChange={(lat, lng) => {
                                    setFormState((prev) => ({
                                        ...prev,
                                        locationLatitude: lat != null ? String(lat) : '',
                                        locationLongitude: lng != null ? String(lng) : '',
                                    }));
                                }}
                            />
                        </div>
                        <LeadInterestInventoryFields
                            className="md:col-span-2 lg:col-span-3"
                            idPrefix="edit-lead-inv"
                            value={{
                                interestedDeveloper: formState.interestedDeveloper,
                                interestedProject: formState.interestedProject,
                                interestedUnit: formState.interestedUnit,
                            }}
                            onChange={(inv) => setFormState((prev) => ({ ...prev, ...inv }))}
                        />
                        <div className="md:col-span-2 lg:col-span-3">
                            <Label htmlFor="notes">{t('notes')}</Label>
                            <textarea
                                id="notes"
                                rows={3}
                                value={formState.notes}
                                onChange={handleChange}
                                onBlur={() => showLeadField('notes')}
                                placeholder={t('enterNotes') || 'Enter notes...'}
                                className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${errors.notes ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            />
                            <FieldError>{errors.notes}</FieldError>
                        </div>
                        <div>
                            <Label htmlFor="budget">{t('budget')}</Label>
                            <NumberInput id="budget" name="budget" value={formState.budget} onChange={handleChange} placeholder={t('enterBudget')} min={0} step={1} />
                        </div>
                        <div>
                            <Label htmlFor="budgetMax">{t('budgetMaxOptional')}</Label>
                            <NumberInput id="budgetMax" name="budgetMax" value={formState.budgetMax} onChange={handleChange} placeholder={t('enterBudgetMax')} min={0} step={1} />
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                            <div className="flex items-center justify-between mb-2">
                                <Label htmlFor="phoneNumbers">{t('phoneNumbers') || 'Phone Numbers'} <span className="text-red-500">*</span></Label>
                                <Button type="button" variant="secondary" onClick={handleAddPhoneNumber} className="text-xs">
                                    <PlusIcon className="w-4 h-4" /> {t('addPhoneNumber') || 'Add Phone Number'}
                                </Button>
                            </div>
                            {phoneNumbers.length === 0 ? (
                                <div>
                                    <div onBlur={() => showLeadField('phone')}>
                                    <PhoneInput 
                                        id="phone" 
                                        placeholder={t('enterPhoneNumber')} 
                                        value={formState.phone} 
                                        onChange={(value) => {
                                            const nextState = { ...formState, phone: value };
                                            setFormState(nextState);
                                            if (errors.phone) showLeadField('phone', nextState, phoneNumbers);
                                        }}
                                        defaultCountry="IQ"
                                        error={!!errors.phone}
                                    />
                                    </div>
                                    <FieldError>{errors.phone}</FieldError>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('orAddMultiplePhones') || 'Or add multiple phone numbers below'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {phoneNumbers.map((pn, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-3 items-center">
                                            <div className="col-span-12 md:col-span-5">
                                                <div onBlur={() => showLeadField('phone')}>
                                                <PhoneInput
                                                    placeholder={t('enterPhoneNumber')}
                                                    value={pn.phone_number}
                                                    onChange={(value) => handlePhoneNumberChange(index, 'phone_number', value)}
                                                    defaultCountry="IQ"
                                                    error={!!errors.phone}
                                                />
                                                </div>
                                            </div>
                                            <div className="col-span-6 md:col-span-2">
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
                                            <div className="col-span-4 md:col-span-3">
                                                <Checkbox
                                                    id={`is_primary_${index}`}
                                                    checked={pn.is_primary}
                                                    onChange={(e) => handlePhoneNumberChange(index, 'is_primary', e.target.checked)}
                                                    label={t('primary') || 'Primary'}
                                                    labelClassName="text-xs"
                                                />
                                            </div>
                                            <div className="col-span-2 md:col-span-2 flex justify-end">
                                                <IconButton size="md" tone="danger" icon={<TrashIcon className="h-4 w-4" />} label={t('delete')} onClick={() => handleRemovePhoneNumber(index)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {phoneNumbers.length > 0 && <FieldError>{errors.phone}</FieldError>}
                        </div>
                        <div>
                            <Label htmlFor="assignedTo">{t('assignedTo')}</Label>
                            <Select id="assignedTo" value={formState.assignedTo} onChange={handleChange}>
                                <option value="">{t('selectEmployee') || 'Select Employee'}</option>
                                {userOptions.map(user => {
                                    const blockReason = getAssignmentBlockReason(user, companyTz);
                                    return (
                                        <option key={user.id} value={user.id.toString()} disabled={!!blockReason}>
                                            {(user.name || user.username || user.email || `User ${user.id}`) +
                                                (blockReason ? ` (${t(ASSIGNMENT_BLOCK_LABEL_KEY[blockReason])})` : '')}
                                        </option>
                                    );
                                })}
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="type">{t('type')} <span className="text-red-500">*</span></Label>
                            <Select 
                                id="type" 
                                value={formState.type} 
                                onChange={handleChange}
                                className={errors.type ? 'border-red-500 dark:border-red-500' : ''}
                            >
                                <option value="">{t('selectType') || 'Select Type'}</option>
                                <option value="fresh">{t('fresh')}</option>
                                <option value="hot">{t('hot')}</option>
                                <option value="cold">{t('cold')}</option>
                            </Select>
                            <FieldError>{errors.type}</FieldError>
                        </div>
                        <div>
                            <Label htmlFor="communicationWay">{t('communicationWay')} <span className="text-red-500">*</span></Label>
                            <Select 
                                id="communicationWay" 
                                value={formState.communicationWay || ''} 
                                onChange={handleChange}
                                className={errors.communicationWay ? 'border-red-500 dark:border-red-500' : ''}
                            >
                                <option value="">{t('selectChannel') || 'Select Channel'}</option>
                                {channels.length > 0 ? (
                                    channels.map(channel => (
                                        <option key={channel.id} value={channel.id.toString()}>
                                            {channel.name}
                                        </option>
                                    ))
                                ) : (
                                    <option value="" disabled>{t('noChannelsAvailable') || 'No channels available'}</option>
                                )}
                            </Select>
                            <FieldError>{errors.communicationWay}</FieldError>
                        </div>
                        <div>
                            <Label htmlFor="priority">{t('priority')} <span className="text-red-500">*</span></Label>
                            <Select 
                                id="priority" 
                                value={formState.priority} 
                                onChange={handleChange}
                                className={errors.priority ? 'border-red-500 dark:border-red-500' : ''}
                            >
                                <option value="">{t('selectPriority') || 'Select Priority'}</option>
                                <option value="high">{t('high')}</option>
                                <option value="medium">{t('medium')}</option>
                                <option value="low">{t('low')}</option>
                            </Select>
                            <FieldError>{errors.priority}</FieldError>
                        </div>
                        <div>
                            <Label htmlFor="status">{t('status')} <span className="text-red-500">*</span></Label>
                            <Select 
                                id="status" 
                                value={formState.status || ''} 
                                onChange={handleChange}
                                className={errors.status ? 'border-red-500 dark:border-red-500' : ''}
                            >
                                <option value="">{t('selectStatus') || 'Select Status'}</option>
                                {statuses.length > 0 ? (
                                    statuses
                                        .filter(s => !s.isHidden)
                                        .map(status => (
                                            <option key={status.id} value={status.id.toString()}>
                                                {status.name}
                                            </option>
                                        ))
                                ) : (
                                    <option value="" disabled>{t('noStatusesAvailable') || 'No statuses available'}</option>
                                )}
                            </Select>
                            <FieldError>{errors.status}</FieldError>
                        </div>
                        {tags.length > 0 && (
                            <div>
                                <Label htmlFor="tags">{t('tags')}</Label>
                                <TagMultiSelect
                                    id="tags"
                                    tags={tags}
                                    value={selectedTagIds}
                                    onChange={setSelectedTagIds}
                                />
                            </div>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={goBack} disabled={isSaving}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={isSaving} loading={isSaving}>
                            {t('saveChanges')}
                        </Button>
                    </div>
                </Card>
            </form>

            <StatusChangeReasonModal {...reasonModalProps} />
        </PageWrapper>
    );
};

