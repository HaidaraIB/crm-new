
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Input, Button, NumberInput, PhoneInput, Checkbox, Loader, ArrowLeftIcon } from '../components/index';
import { Lead, PhoneNumber } from '../types';
import { PlusIcon, TrashIcon } from '../components/icons';
import { useUsers, useStatuses, useChannels, useCreateLead } from '../hooks/useQueries';

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

export const CreateLeadPage = () => {
    const { t, setCurrentPage, currentUser } = useAppContext();

    // جلب البيانات عبر React Query بدلاً من السياق
    const { data: usersResponse } = useUsers();
    const users = usersResponse?.results || [];
    const userOptions = (users && users.length > 0)
        ? users
        : (currentUser ? [currentUser] : []);

    const { data: statusesData } = useStatuses();
    const statuses = Array.isArray(statusesData)
        ? statusesData
        : (statusesData?.results || []);

    const { data: channelsData } = useChannels();
    const channels = Array.isArray(channelsData)
        ? channelsData
        : (channelsData?.results || []);

    const createLeadMutation = useCreateLead();

    const [loading, setLoading] = useState(true);
    
    // Get default status from settings (first non-hidden status or first status)
    const defaultStatus = useMemo(() => {
        if (!Array.isArray(statuses)) return undefined;
        const status = statuses.find(s => s.isDefault && !s.isHidden) || 
                      statuses.find(s => !s.isHidden) || 
                      statuses[0];
        return status ? status.id : undefined;
    }, [statuses]);
    
    // Get default channel from settings (first channel)
    const defaultChannel = useMemo(() => {
        if (!Array.isArray(channels)) return undefined;
        const channel = channels[0];
        return channel ? channel.id : undefined;
    }, [channels]);
    
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        budget: '',
        assignedTo: currentUser?.id ? currentUser.id.toString() : '',
        type: 'fresh' as 'fresh' | 'cold' | '',
        communicationWay: '',
        priority: 'medium' as 'low' | 'medium' | 'high' | '',
        status: '',
    });
    
    const [phoneNumbers, setPhoneNumbers] = useState<Array<Omit<PhoneNumber, 'id' | 'created_at' | 'updated_at'>>>([]);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const hasUserInteracted = useRef(false);
    const formInitialized = useRef(false);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 100);
        return () => clearTimeout(timer);
    }, []);

    // Initialize form with defaults only once when component mounts and data is available
    // This should NOT run when data updates from polling - only on initial mount
    useEffect(() => {
        // Only initialize if form is completely empty and hasn't been initialized yet
        // AND user hasn't interacted with the form
        // AND form fields are actually empty (to prevent reset during polling)
        if (!formInitialized.current && !hasUserInteracted.current && defaultStatus && defaultChannel) {
            // Double check that form is actually empty - if any field has data, don't initialize
        if (!formState.name && !formState.phone && phoneNumbers.length === 0 && 
            !formState.budget && !formState.assignedTo) {
                formInitialized.current = true;
                setFormState(prev => ({
                    ...prev,
                    status: defaultStatus.toString(),
                    communicationWay: defaultChannel.toString(),
                }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array - only run on mount, ignore data updates from polling

    // Separate effect to initialize defaults when data becomes available (but only if form is still empty)
    // This will run when data loads, but will NOT run again when polling updates the data
    useEffect(() => {
        // Only run if form hasn't been initialized yet and data is available
        // AND user hasn't interacted with the form
        // AND form is completely empty (to prevent reset during polling)
        if (!formInitialized.current && !hasUserInteracted.current && defaultStatus && defaultChannel) {
            // Double check that form is actually empty - if ANY field has data, don't initialize
            // This prevents reset when polling updates data
            const isFormEmpty = !formState.name && !formState.phone && phoneNumbers.length === 0 && 
                               !formState.budget && !formState.assignedTo;
            
            if (isFormEmpty) {
                // Only set defaults if they're not already set
                if (!formState.status || !formState.communicationWay) {
                    formInitialized.current = true;
                    setFormState(prev => ({
                        ...prev,
                        status: prev.status || (defaultStatus ? defaultStatus.toString() : ''),
                        communicationWay: prev.communicationWay || (defaultChannel ? defaultChannel.toString() : ''),
                    }));
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultStatus, defaultChannel]); // Depend on defaults, but check form state before updating

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
        }

        // Check phone numbers
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
            newErrors.phone = t('phoneNumberRequired') || 'At least one phone number is required';
        }

        if (!formState.communicationWay) {
            newErrors.communicationWay = t('communicationWayRequired') || 'Communication channel is required';
        }

        if (!formState.status) {
            newErrors.status = t('statusRequired') || 'Status is required';
        }

        if (!formState.priority) {
            newErrors.priority = t('priorityRequired') || 'Priority is required';
        }

        if (!formState.type) {
            newErrors.type = t('typeRequired') || 'Type is required';
        }

        if (!currentUser?.company?.id) {
            newErrors.company = t('companyRequired') || 'Company is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Set default assignedTo to current user when users load (only if not already set and user hasn't interacted)
    // This should NOT run when data updates from polling - only on initial mount
    const assignedToInitialized = useRef(false);
    useEffect(() => {
        // Only set if form is completely empty and user hasn't interacted
        // AND form hasn't been initialized yet
        if (!assignedToInitialized.current && !hasUserInteracted.current && !formInitialized.current && 
            userOptions.length > 0 && !formState.assignedTo && 
            !formState.name && !formState.phone && phoneNumbers.length === 0 && !formState.budget) {
            const defaultUserId = currentUser?.id || userOptions[0]?.id;
            if (defaultUserId) {
                assignedToInitialized.current = true;
                setFormState(prev => ({ ...prev, assignedTo: defaultUserId.toString() }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userOptions, currentUser, formState, phoneNumbers.length]); // Re-run when users load initially
    

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        if (!hasUserInteracted.current) {
            hasUserInteracted.current = true;
        }
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
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
        hasUserInteracted.current = true;
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
        
        try {
            // Find channel and status IDs from names/IDs stored in formState
            const channelId = formState.communicationWay 
                ? (channels.find(c => c.id.toString() === formState.communicationWay || c.name === formState.communicationWay)?.id || null)
                : null;
            const statusId = formState.status 
                ? (statuses.find(s => s.id.toString() === formState.status || s.name === formState.status)?.id || null)
                : null;
            
            // Convert priority and type to lowercase for API
            const priorityValue = formState.priority ? (formState.priority.toLowerCase() as 'low' | 'medium' | 'high') : null;
            const typeValue = formState.type ? (formState.type.toLowerCase() as 'fresh' | 'cold') : null;
            
            // Prepare phone_number for backward compatibility (only if we have phone numbers)
            const primaryPhone = finalPhoneNumbers.find(pn => pn.is_primary)?.phone_number || finalPhoneNumbers[0]?.phone_number || '';
            
            const leadData: any = {
                name: formState.name,
                phone_numbers: finalPhoneNumbers,
                budget: formState.budget ? Number(formState.budget) : null,
                assigned_to: formState.assignedTo ? Number(formState.assignedTo) : (currentUser?.id ?? null),
                type: typeValue,
                communication_way: channelId,
                priority: priorityValue,
                status: statusId,
                company: currentUser?.company?.id || null,
            };
            
            // Add phone_number for backward compatibility if we have phone numbers
            if (primaryPhone) {
                leadData.phone_number = primaryPhone;
            }
            
            await createLeadMutation.mutateAsync(leadData);
            window.history.pushState({}, '', '/leads');
            setCurrentPage('Leads');
        } catch (error: any) {
            console.error('Error creating lead:', error);
            
            // Display field-specific errors if available
            if (error.fields) {
                const fieldErrors: { [key: string]: string } = {};
                const fieldLabels: { [key: string]: string } = {
                    name: t('clientName') || 'Name',
                    phone: t('phoneNumbers') || 'Phone Numbers',
                    phone_number: t('phoneNumbers') || 'Phone Numbers',
                    phone_numbers: t('phoneNumbers') || 'Phone Numbers',
                    budget: t('budget') || 'Budget',
                    assigned_to: t('assignedTo') || 'Assigned To',
                    type: t('type') || 'Type',
                    communication_way: t('communicationWay') || 'Communication Way',
                    priority: t('priority') || 'Priority',
                    status: t('status') || 'Status',
                    company: t('company') || 'Company',
                };
                
                Object.keys(error.fields).forEach(field => {
                    const fieldError = error.fields[field];
                    let errorMessage = '';
                    if (Array.isArray(fieldError)) {
                        errorMessage = fieldError[0];
                    } else {
                        errorMessage = String(fieldError);
                    }
                    
                    // Add field label to error message
                    const fieldLabel = fieldLabels[field] || field;
                    fieldErrors[field] = `${fieldLabel}: ${errorMessage}`;
                });
                setErrors(fieldErrors);
            } else {
                // Show general error message
                setErrors({ 
                    general: error.message || t('errorCreatingLead') || 'Failed to create lead. Please try again.' 
                });
            }
        }
    };

    if (loading) {
        return (
            <PageWrapper title={t('createNewLead') || 'Create New Lead'}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper 
            title={
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            window.history.pushState({}, '', '/leads');
                            setCurrentPage('Leads');
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        title={t('back') || 'Back'}
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <span>{t('createNewLead') || 'Create New Lead'}</span>
                </div>
            }
        >
            <form onSubmit={handleSubmit}>
                <Card>
                    <h3 className="text-lg font-semibold mb-6 border-b pb-3 dark:border-gray-700">{t('leadInformation') || 'Lead Information'}</h3>
                    {(errors.general || Object.keys(errors).filter(key => key !== 'general').length > 0) && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                            {errors.general && (
                                <p className="text-sm text-red-600 dark:text-red-400 mb-2 font-medium">{errors.general}</p>
                            )}
                            {Object.keys(errors).filter(key => key !== 'general').length > 0 && (
                                <div className="text-sm text-red-600 dark:text-red-400">
                                    {!errors.general && (
                                        <p className="font-medium mb-2">{t('pleaseFixErrors') || 'Please fix the following errors:'}</p>
                                    )}
                                    <ul className="list-disc list-inside space-y-1">
                                        {Object.keys(errors).filter(key => key !== 'general').map(key => (
                                            <li key={key} className="font-medium">{errors[key]}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="md:col-span-2 lg:col-span-1">
                            <Label htmlFor="name">{t('clientName')} <span className="text-red-500">*</span></Label>
                            <Input 
                                id="name" 
                                placeholder={t('enterClientName')} 
                                value={formState.name} 
                                onChange={handleChange}
                                className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="budget">{t('budget')}</Label>
                            <NumberInput id="budget" name="budget" value={formState.budget} onChange={handleChange} placeholder={t('enterBudget')} min={0} step={1} />
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
                                    <PhoneInput 
                                        id="phone" 
                                        placeholder={t('enterPhoneNumber')} 
                                        value={formState.phone} 
                                        onChange={(value) => {
                                            hasUserInteracted.current = true;
                                            setFormState(prev => ({ ...prev, phone: value }));
                                            clearError('phone');
                                        }}
                                        defaultCountry="SY"
                                        error={!!errors.phone}
                                    />
                                    {errors.phone && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('orAddMultiplePhones') || 'Or add multiple phone numbers below'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {phoneNumbers.map((pn, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-3 items-center">
                                            <div className="col-span-12 md:col-span-5">
                                                <PhoneInput
                                                    placeholder={t('enterPhoneNumber')}
                                                    value={pn.phone_number}
                                                    onChange={(value) => handlePhoneNumberChange(index, 'phone_number', value)}
                                                    defaultCountry="SY"
                                                />
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
                                {userOptions.map(user => (
                                    <option key={user.id} value={user.id}>{user.name || user.username || user.email}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="type">{t('type')}</Label>
                            <Select id="type" value={formState.type} onChange={handleChange}>
                                <option value="">{t('selectType') || 'Select Type'}</option>
                                <option value="fresh">{t('fresh')}</option>
                                <option value="cold">{t('cold')}</option>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="communicationWay">{t('communicationWay')}</Label>
                            <Select id="communicationWay" value={formState.communicationWay} onChange={handleChange}>
                                <option value="">{t('selectChannel') || 'Select Channel'}</option>
                                {channels.length > 0 ? (
                                    channels.map(channel => (
                                        <option key={channel.id} value={channel.id.toString()}>
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
                                <option value="">{t('selectPriority') || 'Select Priority'}</option>
                                <option value="high">{t('high')}</option>
                                <option value="medium">{t('medium')}</option>
                                <option value="low">{t('low')}</option>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="status">{t('status')}</Label>
                            <Select id="status" value={formState.status} onChange={handleChange}>
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
                                    <option value="">{t('noStatusesAvailable') || 'No statuses available'}</option>
                                )}
                            </Select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => {
                            window.history.pushState({}, '', '/leads');
                            setCurrentPage('Leads');
                        }}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit">
                            {t('createLead') || 'Create Lead'}
                        </Button>
                    </div>
                </Card>
            </form>
        </PageWrapper>
    );
};

