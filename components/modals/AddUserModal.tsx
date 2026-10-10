import { Alert } from '../Alert';

import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { isMedicalSpecialization } from '../../utils/medicalTranslationOverrides';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { PhoneInput } from '../PhoneInput';
import { Button } from '../Button';
import { EyeIcon, EyeOffIcon } from '../icons';
import { useCreateUser } from '../../hooks/useQueries';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';
import { scrollToFirstFieldError } from '../../utils/formFieldErrors';
import { roleShowsLeadAvailability } from '../../utils/roles';

const ADD_USER_DOM_ID_MAP: Record<string, string> = {
    name: 'add-user-name',
    username: 'add-user-username',
    email: 'add-user-email',
    password: 'add-user-password',
    phone: 'add-user-phone',
    role: 'add-user-role',
    workEndTime: 'add-user-work-end',
};

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

const Select = ({ id, children, value, onChange }: { id: string; children?: React.ReactNode; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <select id={id} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
        {children}
    </select>
);

export const AddUserModal = () => {
    const { isAddUserModalOpen, setIsAddUserModalOpen, t, currentUser, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();

    const isMedicalCompany = useMemo(
        () => isMedicalSpecialization(currentUser?.company?.specialization),
        [currentUser?.company?.specialization]
    );
    const defaultStaffRole = isMedicalCompany ? 'doctor' : 'employee';
    
    // Create user mutation
    const createUserMutation = useCreateUser();
    const isLoading = createUserMutation.isPending;

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        phone: '',
        role: 'employee',
        weeklyDayOff: '' as string,
        workStartTime: '' as string,
        workEndTime: '' as string,
        canDeleteClients: false,
        whatsappChatEnabled: true,
        whatsappCallEnabled: true,
    });

    useEffect(() => {
        if (!isAddUserModalOpen) return;
        setFormData((prev) => ({ ...prev, role: defaultStaffRole }));
    }, [isAddUserModalOpen, defaultStaffRole]);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const translate = (key: string) => {
        const value = t(key as never);
        return value && value !== key ? value : undefined;
    };

    const userCatalogValues = (): Record<string, unknown> => {
        const parts = formData.name.trim().split(/\s+/).filter(Boolean);
        return {
            first_name: parts[0] || '',
            last_name: parts.slice(1).join(' '),
            email: formData.email,
            username: formData.username,
            phone: formData.phone,
            password: formData.password,
            role: formData.role,
        };
    };

    const applyUserCatalog = (values: Record<string, unknown>) => {
        const next = catalogFieldErrors('user.upsert', values, translate);
        if (next.firstName || next.lastName) next.name = next.firstName || next.lastName;
        return next;
    };

    const validateForm = () => {
        const next = applyUserCatalog(userCatalogValues());

        if (roleShowsLeadAvailability(formData.role)) {
            const start = formData.workStartTime.trim();
            const end = formData.workEndTime.trim();
            if ((start && !end) || (!start && end)) {
                next.workEndTime =
                    t('workingHoursHelp') ||
                    'Both working hours are required together, or clear both.';
            } else if (start && end && start === end) {
                next.workEndTime =
                    t('workingHoursHelp') || 'End time must differ from start time.';
            }
        }

        setErrors(next);
        if (Object.keys(next).length > 0) {
            scrollToFirstFieldError(next, ADD_USER_DOM_ID_MAP);
            return false;
        }
        return true;
    };

    const blurField = (field: string) => {
        const next = applyUserCatalog(userCatalogValues());
        setErrors((prev) => {
            const updated = { ...prev };
            if (next[field]) updated[field] = next[field];
            else delete updated[field];
            return updated;
        });
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setErrors({});

        try {
            // Split name into first_name and last_name
            const nameParts = formData.name.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Get company ID - ensure it's a number
            const companyId = currentUser?.company?.id;
            if (!companyId) {
                console.error('Company ID is missing. Current user:', currentUser);
                setErrors({ _general: t('companyRequired') || 'Company information is required. Please refresh the page and try again.' });
                return;
            }
            
            // Ensure companyId is a number
            const companyIdNumber = typeof companyId === 'number' ? companyId : parseInt(companyId, 10);
            if (isNaN(companyIdNumber)) {
                console.error('Company ID is not a valid number:', companyId);
                setErrors({ _general: t('companyRequired') || 'Company information is invalid. Please refresh the page and try again.' });
                return;
            }
            
            // Include company ID in the request
            // Send as 'company_id' which the serializer accepts for writes
            // The backend will also set it from request user's company as a fallback
            const userData: any = {
                first_name: firstName,
                last_name: lastName,
                username: formData.username,
                email: formData.email,
                password: formData.password,
                phone: formData.phone,
                role: formData.role,
                company_id: companyIdNumber,
            };
            if (roleShowsLeadAvailability(formData.role)) {
                userData.weekly_day_off =
                    formData.weeklyDayOff === '' ? null : parseInt(formData.weeklyDayOff, 10);
                const start = formData.workStartTime.trim();
                const end = formData.workEndTime.trim();
                userData.work_start_time = start || null;
                userData.work_end_time = end || null;
            }
            if (formData.role === 'employee' || formData.role === 'doctor') {
                userData.can_delete_clients = formData.canDeleteClients;
                userData.whatsapp_chat_enabled = formData.whatsappChatEnabled;
                userData.whatsapp_call_enabled = formData.whatsappCallEnabled;
            }

            await createUserMutation.mutateAsync(userData);

            // Reset form
            setFormData({
                name: '',
                username: '',
                email: '',
                password: '',
                phone: '',
                role: defaultStaffRole,
                weeklyDayOff: '',
                workStartTime: '',
                workEndTime: '',
                canDeleteClients: false,
                whatsappChatEnabled: true,
                whatsappCallEnabled: true,
            });
            setErrors({});
            
            // Close modal immediately and show success modal
            setIsAddUserModalOpen(false);
            setSuccessMessage(t('employeeCreatedSuccessfully') || 'Employee created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating user:', error);
            const serverErrors = serverFieldErrors(error, 'user.upsert', translate);
            if (serverErrors.firstName || serverErrors.lastName) serverErrors.name = serverErrors.firstName || serverErrors.lastName;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('errorCreatingEmployee') || 'Failed to create employee. Please try again.' });
        }
    };

    const handleChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (typeof value !== 'boolean' && errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            username: '',
            email: '',
            password: '',
            phone: '',
            role: defaultStaffRole,
            weeklyDayOff: '',
            workStartTime: '',
            workEndTime: '',
            canDeleteClients: false,
            whatsappChatEnabled: true,
            whatsappCallEnabled: true,
        });
        setErrors({});
    };

    return (
        <Modal isOpen={isAddUserModalOpen} onClose={() => {
            setIsAddUserModalOpen(false);
            resetForm();
        }} title={t('createEmployee')}>
            <div className="space-y-4">
                {errors._general && (
                    <Alert variant="error">{errors._general}</Alert>
                )}
                <div>
                    <Label htmlFor="add-user-name">{t('name')} *</Label>
                    <Input 
                        id="add-user-name" 
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        onBlur={() => blurField('name')}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-username">{t('username')} *</Label>
                    <Input 
                        id="add-user-username" 
                        value={formData.username}
                        onChange={(e) => handleChange('username', e.target.value)}
                        onBlur={() => blurField('username')}
                    />
                    {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-email">{t('email')} *</Label>
                    <Input 
                        id="add-user-email" 
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        onBlur={() => blurField('email')}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                    <div>
                    <Label htmlFor="add-user-password">{t('password')} *</Label>
                        <Input 
                            id="add-user-password" 
                            type={passwordVisible ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            onBlur={() => blurField('password')}
                            endAdornment={
                              <button 
                                type="button"
                                className="text-gray-400"
                                onClick={() => setPasswordVisible(!passwordVisible)}
                              >
                                {passwordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                              </button>
                            }
                        />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-phone">{t('phone')} *</Label>
                    <PhoneInput 
                        id="add-user-phone" 
                        value={formData.phone}
                        onChange={(value) => handleChange('phone', value)}
                        onBlur={() => blurField('phone')}
                        placeholder={t('enterPhone') || 'Enter phone number'}
                        error={!!errors.phone}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-role">{t('role')} *</Label>
                    <Select 
                        id="add-user-role" 
                        value={formData.role}
                        onChange={(e) => handleChange('role', e.target.value)}
                    >
                        {isMedicalCompany ? (
                            <>
                                <option value="doctor">{t('doctor')}</option>
                                <option value="reception">{t('reception')}</option>
                                <option value="call_center">{t('callCenterRole')}</option>
                            </>
                        ) : (
                            <>
                                <option value="employee">{t('employee')}</option>
                                <option value="data_entry">{t('dataEntry')}</option>
                                <option value="call_center">{t('callCenterRole')}</option>
                            </>
                        )}
                    </Select>
                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                </div>
                {roleShowsLeadAvailability(formData.role) && (
                    <div>
                        <Label htmlFor="add-user-weekly-day-off">{t('weeklyDayOff')}</Label>
                        <Select
                            id="add-user-weekly-day-off"
                            value={formData.weeklyDayOff}
                            onChange={(e) => handleChange('weeklyDayOff', e.target.value)}
                        >
                            <option value="">{t('dayOffNone')}</option>
                            <option value="0">{t('dayOffMonday')}</option>
                            <option value="1">{t('dayOffTuesday')}</option>
                            <option value="2">{t('dayOffWednesday')}</option>
                            <option value="3">{t('dayOffThursday')}</option>
                            <option value="4">{t('dayOffFriday')}</option>
                            <option value="5">{t('dayOffSaturday')}</option>
                            <option value="6">{t('dayOffSunday')}</option>
                        </Select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('weeklyDayOffHelp')}</p>
                    </div>
                )}
                {roleShowsLeadAvailability(formData.role) && (
                    <div>
                        <Label htmlFor="add-user-work-start">{t('workingHours')}</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="add-user-work-start" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {t('workingHoursFrom')}
                                </label>
                                <Input
                                    id="add-user-work-start"
                                    type="time"
                                    value={formData.workStartTime}
                                    onChange={(e) => handleChange('workStartTime', e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="add-user-work-end" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {t('workingHoursTo')}
                                </label>
                                <Input
                                    id="add-user-work-end"
                                    type="time"
                                    value={formData.workEndTime}
                                    onChange={(e) => handleChange('workEndTime', e.target.value)}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('workingHoursHelp')}</p>
                        {(errors.workStartTime || errors.workEndTime) && (
                            <p className="text-red-500 text-xs mt-1">{errors.workStartTime || errors.workEndTime}</p>
                        )}
                    </div>
                )}
                {(formData.role === 'employee' || formData.role === 'doctor') && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <input
                                id="add-user-can-delete-clients"
                                type="checkbox"
                                checked={formData.canDeleteClients}
                                onChange={(e) => handleChange('canDeleteClients', e.target.checked)}
                                className="rounded"
                            />
                            <label htmlFor="add-user-can-delete-clients" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('canDeleteClients')}
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 ps-6">{t('canDeleteClientsHelp')}</p>
                    </div>
                )}
                {(formData.role === 'employee' || formData.role === 'doctor') && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <input
                                id="add-user-whatsapp-chat-enabled"
                                type="checkbox"
                                checked={formData.whatsappChatEnabled}
                                onChange={(e) => handleChange('whatsappChatEnabled', e.target.checked)}
                                className="rounded"
                            />
                            <label htmlFor="add-user-whatsapp-chat-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('whatsappChatEnabled')}
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 ps-6">{t('whatsappChatEnabledHelp')}</p>
                    </div>
                )}
                {(formData.role === 'employee' || formData.role === 'doctor') && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <input
                                id="add-user-whatsapp-call-enabled"
                                type="checkbox"
                                checked={formData.whatsappCallEnabled}
                                onChange={(e) => handleChange('whatsappCallEnabled', e.target.checked)}
                                className="rounded"
                            />
                            <label htmlFor="add-user-whatsapp-call-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('whatsappCallEnabled')}
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 ps-6">{t('whatsappCallEnabledHelp')}</p>
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        variant="secondary" 
                        onClick={() => {
                            setIsAddUserModalOpen(false);
                            resetForm();
                            setSuccessMessage('');
                        }}
                        disabled={isLoading}
                    >
                        {t('cancel')}
                    </Button>
                    <Button 
                        onClick={handleSubmit}
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        {t('createEmployee')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
