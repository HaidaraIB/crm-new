
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Input, Button, NumberInput, PhoneInput, Checkbox, Loader, ArrowLeftIcon } from '../components/index';
import { Lead, PhoneNumber } from '../types';
import { PlusIcon, TrashIcon } from '../components/icons';
import { useUsers, useStatuses, useChannels, useUpdateLead } from '../hooks/useQueries';

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

export const EditLeadPage = () => {
    const { t, setCurrentPage, editingLead, setSelectedLead, currentUser } = useAppContext();
    
    // Fetch data using React Query hooks
    const { data: usersResponse } = useUsers();
    const users = usersResponse?.results || [];
    const userOptions = (users && users.length > 0)
        ? users
        : (currentUser ? [currentUser] : []);
    
    const { data: statusesData } = useStatuses();
    // Handle both array response and object with results property
    const statuses = Array.isArray(statusesData) 
        ? statusesData 
        : (statusesData?.results || []);
    
    const { data: channelsData } = useChannels();
    // Handle both array response and object with results property
    const channels = Array.isArray(channelsData) 
        ? channelsData 
        : (channelsData?.results || []);
    
    // Use React Query mutation for updating lead
    const updateLeadMutation = useUpdateLead();
    
    const [loading, setLoading] = useState(true);
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        budget: '',
        assignedTo: '',
        type: '' as 'fresh' | 'cold' | '',
        communicationWay: '',
        priority: '' as 'low' | 'medium' | 'high' | '',
        status: '',
    });
    const [phoneNumbers, setPhoneNumbers] = useState<Array<Omit<PhoneNumber, 'id' | 'created_at' | 'updated_at'> | PhoneNumber>>([]);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 100);
        return () => clearTimeout(timer);
    }, []);

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

        // Validate required fields for API
        if (!formState.communicationWay) {
            newErrors.communicationWay = t('communicationWayRequired') || 'Communication way is required';
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

    // Initialize form state when editingLead changes
    useEffect(() => {
        if (editingLead) {
            // Set selectedLead to ensure ViewLeadPage has the lead data
            setSelectedLead(editingLead);
            
            // Convert type and priority to lowercase for form state
            const typeValue = editingLead.type ? editingLead.type.toLowerCase() as 'fresh' | 'cold' : '';
            const priorityValue = editingLead.priority ? editingLead.priority.toLowerCase() as 'low' | 'medium' | 'high' : '';
            
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
            
            setFormState({
                name: editingLead.name || '',
                phone: editingLead.phone || '',
                budget: editingLead.budget?.toString() || '',
                assignedTo: editingLead.assignedTo?.toString() || (currentUser?.id ? currentUser.id.toString() : ''),
                type: typeValue,
                communicationWay: channelId,
                priority: priorityValue,
                status: statusId,
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
    }, [editingLead, setSelectedLead, channels, statuses, currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormState(prev => {
            return { ...prev, [id]: value };
        });
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
        
        // Clear previous errors
        setErrors({});
        
        // Validate form before submission
        if (!validateForm()) {
            setLoading(false);
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

        setLoading(true);
        try {
            // Find channel and status IDs from names/IDs stored in formState
            const channelId = formState.communicationWay 
                ? (channels.find(c => c.id.toString() === formState.communicationWay || c.name === formState.communicationWay)?.id || null)
                : null;
            const statusId = formState.status 
                ? (statuses.find(s => s.id.toString() === formState.status || s.name === formState.status)?.id || null)
                : null;
            
            // Convert priority and type to lowercase for API (already lowercase, but ensure)
            const priorityValue = formState.priority ? (formState.priority.toLowerCase() as 'low' | 'medium' | 'high') : null;
            const typeValue = formState.type ? (formState.type.toLowerCase() as 'fresh' | 'cold') : null;
            
            // Prepare phone_number for backward compatibility (only if we have phone numbers)
            const primaryPhone = finalPhoneNumbers.find(pn => pn.is_primary)?.phone_number || finalPhoneNumbers[0]?.phone_number || '';
            
            // Get company ID from current user
            const companyId = currentUser?.company?.id;
            if (!companyId) {
                setErrors({ 
                    general: t('companyRequired') || 'Company is required. Please log in again.' 
                });
                setLoading(false);
                return;
            }
            
            const updateData: any = {
                name: formState.name,
                phone_numbers: finalPhoneNumbers,
                budget: formState.budget ? Number(formState.budget) : null,
                assigned_to: formState.assignedTo ? Number(formState.assignedTo) : null,
                type: typeValue,
                communication_way: channelId,
                priority: priorityValue,
                status: statusId,
                company: companyId,
            };
            
            // Add phone_number for backward compatibility if we have phone numbers
            if (primaryPhone) {
                updateData.phone_number = primaryPhone;
            }
            
            const updatedLead = await updateLeadMutation.mutateAsync({ id: editingLead.id, data: updateData });
            
            // Update selectedLead with the updated data
            if (updatedLead) {
                // Transform API response to Lead format
                const transformedLead: Lead = {
                    id: updatedLead.id,
                    name: updatedLead.name,
                    phone: updatedLead.phone_number || updatedLead.phone || '',
                    phoneNumbers: updatedLead.phone_numbers || [],
                    status: updatedLead.status_name || updatedLead.status || '',
                    type: updatedLead.type || '',
                    assignedTo: updatedLead.assigned_to || 0,
                    budget: updatedLead.budget || 0,
                    communicationWay: updatedLead.communication_way_name || updatedLead.communication_way || '',
                    priority: updatedLead.priority || '',
                    createdAt: updatedLead.created_at || updatedLead.createdAt || '',
                };
                setSelectedLead(transformedLead);
            }
            
            // Navigate to ViewLead page to see the updated lead
            window.history.pushState({}, '', `/view-lead/${editingLead.id}`);
            setCurrentPage('ViewLead');
        } catch (error: any) {
            console.error('Error updating lead:', error);
            
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
                    general: error.message || t('errorUpdatingLead') || 'Failed to update lead. Please try again.' 
                });
            }
        } finally {
            setLoading(false);
        }
    };

    if (!editingLead) {
        return (
            <PageWrapper title={t('editLead') || 'Edit Lead'}>
                <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">{t('noLeadSelected') || 'No lead selected for editing'}</p>
                    <Button variant="secondary" onClick={() => {
 if (editingLead) {
                            setSelectedLead(editingLead);
                            window.history.pushState({}, '', `/view-lead/${editingLead.id}`);
                            setCurrentPage('ViewLead');
                        } else {
                            window.history.pushState({}, '', '/leads');
                            setCurrentPage('Leads');
                        }
                    }} className="mt-4">
                        {t('back') || 'Back'}
                    </Button>
                </div>
            </PageWrapper>
        );
    }

    if (loading) {
        return (
            <PageWrapper title={t('editLead') || 'Edit Lead'}>
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
                            setSelectedLead(editingLead);
                            window.history.pushState({}, '', `/view-lead/${editingLead.id}`);
                            setCurrentPage('ViewLead');
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        title={t('back') || 'Back'}
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <span>{t('editLead') || 'Edit Lead'}</span>
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
                                    <option key={user.id} value={user.id.toString()}>
                                        {user.name || user.username || user.email || `User ${user.id}`}
                                    </option>
                                ))}
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
                                <option value="cold">{t('cold')}</option>
                            </Select>
                            {errors.type && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.type}</p>
                            )}
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
                            {errors.communicationWay && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.communicationWay}</p>
                            )}
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
                            {errors.priority && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.priority}</p>
                            )}
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
                            {errors.status && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.status}</p>
                            )}
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => {
                            setSelectedLead(editingLead);
                            window.history.pushState({}, '', `/view-lead/${editingLead.id}`);
                            setCurrentPage('ViewLead');
                        }} disabled={loading}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? t('loading') || 'Loading...' : t('saveChanges')}
                        </Button>
                    </div>
                </Card>
            </form>
        </PageWrapper>
    );
};

