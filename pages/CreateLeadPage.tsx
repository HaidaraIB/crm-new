
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Input, Button, NumberInput, PhoneInput, Checkbox, Loader, ArrowLeftIcon } from '../components/index';
import { Lead, PhoneNumber } from '../types';
import { PlusIcon, TrashIcon } from '../components/icons';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange, className }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string; }) => (
    <select id={id} value={value} onChange={onChange} className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${className || ''}`}>
        {children}
    </select>
);

export const CreateLeadPage = () => {
    const { t, setCurrentPage, addLead, users, currentUser, statuses, channels } = useAppContext();
    const [loading, setLoading] = useState(true);
    
    // Get default status from settings (first non-hidden status or first status)
    const getDefaultStatus = () => {
        const defaultStatus = statuses.find(s => s.isDefault && !s.isHidden) || 
                             statuses.find(s => !s.isHidden) || 
                             statuses[0];
        return defaultStatus ? defaultStatus.name as Lead['status'] : 'Untouched';
    };
    
    // Get default channel from settings (first channel or 'Call')
    const getDefaultChannel = () => {
        const defaultChannel = channels.find(c => c.name === 'Call') || channels[0];
        return defaultChannel ? defaultChannel.name : 'Call';
    };
    
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        budget: '',
        assignedTo: '',
        type: 'Fresh' as Lead['type'],
        communicationWay: getDefaultChannel(),
        priority: 'Medium' as Lead['priority'],
        status: getDefaultStatus(),
    });
    
    const [phoneNumbers, setPhoneNumbers] = useState<Array<Omit<PhoneNumber, 'id' | 'created_at' | 'updated_at'>>>([]);
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

    // Set default assignedTo to current user when users load
    useEffect(() => {
        if (users.length > 0) {
            const defaultUserId = currentUser?.id || users[0]?.id;
            if (defaultUserId && !formState.assignedTo) {
                setFormState(prev => ({ ...prev, assignedTo: defaultUserId.toString() }));
            }
        }
    }, [users.length, currentUser?.id]);
    
    // Update default status and channel when settings change
    useEffect(() => {
        setFormState(prev => ({
            ...prev,
            status: getDefaultStatus(),
            communicationWay: getDefaultChannel(),
        }));
    }, [statuses, channels]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
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
            await addLead({
                name: formState.name,
                phone: finalPhoneNumbers.find(pn => pn.is_primary)?.phone_number || finalPhoneNumbers[0]?.phone_number || '',
                phoneNumbers: finalPhoneNumbers,
                budget: Number(formState.budget) || 0,
                assignedTo: formState.assignedTo ? Number(formState.assignedTo) : 0,
                type: formState.type,
                communicationWay: formState.communicationWay,
                priority: formState.priority,
                status: formState.status,
            });
            setCurrentPage('Leads');
        } catch (error) {
            console.error('Error creating lead:', error);
            alert(t('errorCreatingLead') || 'Failed to create lead. Please try again.');
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
                        onClick={() => setCurrentPage('Leads')}
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
                                {channels.length > 0 ? (
                                    channels.map(channel => (
                                        <option key={channel.id} value={channel.name}>
                                            {channel.name}
                                        </option>
                                    ))
                                ) : (
                                    <>
                                        <option value="Call">{t('call')}</option>
                                        <option value="WhatsApp">{t('whatsapp')}</option>
                                    </>
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
                                {statuses.length > 0 ? (
                                    statuses
                                        .filter(s => !s.isHidden)
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
                    <div className="mt-6 flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setCurrentPage('Leads')}>
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

