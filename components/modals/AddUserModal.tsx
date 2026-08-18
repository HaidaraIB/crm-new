
import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { isMedicalSpecialization } from '../../utils/medicalTranslationOverrides';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { PhoneInput } from '../PhoneInput';
import { Button } from '../Button';
import { EyeIcon, EyeOffIcon } from '../icons';
import { useCreateUser } from '../../hooks/useQueries';
import {
    validateEmailField,
    validatePhoneField,
    validatePasswordField,
    validateUsernameField,
    validateNameField,
} from '../../utils/formValidation';
import { scrollToFirstFieldError } from '../../utils/formFieldErrors';

const ADD_USER_DOM_ID_MAP: Record<string, string> = {
    name: 'add-user-name',
    username: 'add-user-username',
    email: 'add-user-email',
    password: 'add-user-password',
    phone: 'add-user-phone',
    role: 'add-user-role',
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

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        const nameError = validateNameField(formData.name, t, { minLength: 2 });
        if (nameError) newErrors.name = nameError;

        const usernameError = validateUsernameField(formData.username, t);
        if (usernameError) newErrors.username = usernameError;

        const emailError = validateEmailField(formData.email, t);
        if (emailError) newErrors.email = emailError;

        const passwordError = validatePasswordField(formData.password, t);
        if (passwordError) newErrors.password = passwordError;

        const phoneError = validatePhoneField(formData.phone, t);
        if (phoneError) newErrors.phone = phoneError;

        // Role validation
        if (!formData.role) {
            newErrors.role = t('roleRequired') || 'Role is required';
        }

        if (formData.role === 'employee' || formData.role === 'doctor') {
            const start = formData.workStartTime.trim();
            const end = formData.workEndTime.trim();
            if ((start && !end) || (!start && end)) {
                newErrors.workEndTime =
                    t('workingHoursHelp') ||
                    'Both working hours are required together, or clear both.';
            } else if (start && end && start === end) {
                newErrors.workEndTime =
                    t('workingHoursHelp') || 'End time must differ from start time.';
            }
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            scrollToFirstFieldError(newErrors, ADD_USER_DOM_ID_MAP);
            return false;
        }
        return true;
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
            if (
                formData.role === 'employee' ||
                formData.role === 'data_entry' ||
                formData.role === 'doctor' ||
                formData.role === 'reception'
            ) {
                userData.weekly_day_off =
                    formData.weeklyDayOff === '' ? null : parseInt(formData.weeklyDayOff, 10);
            }
            if (formData.role === 'employee' || formData.role === 'doctor') {
                userData.can_delete_clients = formData.canDeleteClients;
                userData.whatsapp_chat_enabled = formData.whatsappChatEnabled;
                userData.whatsapp_call_enabled = formData.whatsappCallEnabled;
                const start = formData.workStartTime.trim();
                const end = formData.workEndTime.trim();
                userData.work_start_time = start || null;
                userData.work_end_time = end || null;
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
            
            // Handle API errors - Django REST Framework returns errors in specific format
            const errorMessage = error?.message || '';
            const errorFields = error?.fields || {};
            const lowerMessage = errorMessage.toLowerCase();
            
            // Check for field-specific errors first (from API response)
            if (errorFields.email) {
                const emailError = Array.isArray(errorFields.email) ? errorFields.email[0] : errorFields.email;
                if (typeof emailError === 'string' && (emailError.toLowerCase().includes('already exists') || emailError.toLowerCase().includes('already exist'))) {
                    setErrors({ email: t('emailAlreadyExists') || 'This email is already registered' });
                } else {
                    setErrors({ email: emailError || t('invalidEmail') || 'Invalid email format' });
                }
            } else if (errorFields.username) {
                const usernameError = Array.isArray(errorFields.username) ? errorFields.username[0] : errorFields.username;
                if (typeof usernameError === 'string' && (usernameError.toLowerCase().includes('already exists') || usernameError.toLowerCase().includes('already exist'))) {
                    setErrors({ username: t('usernameAlreadyExists') || 'This username is already taken' });
                } else {
                    setErrors({ username: usernameError || t('usernameRequired') || 'Username is required' });
                }
            } else if (errorFields.phone) {
                const phoneError = Array.isArray(errorFields.phone) ? errorFields.phone[0] : errorFields.phone;
                if (typeof phoneError === 'string' && (phoneError.toLowerCase().includes('already exists') || phoneError.toLowerCase().includes('already exist'))) {
                    setErrors({ phone: t('phoneAlreadyExists') || 'This phone number is already registered' });
                } else {
                    setErrors({ phone: phoneError || t('invalidPhone') || 'Invalid phone number' });
                }
            } else if (errorFields.password) {
                const passwordError = Array.isArray(errorFields.password) ? errorFields.password[0] : errorFields.password;
                setErrors({ password: passwordError || t('passwordRequired') || 'Password is required' });
            } else if (errorFields.role) {
                const roleError = Array.isArray(errorFields.role) ? errorFields.role[0] : errorFields.role;
                setErrors({ role: roleError || t('invalidRole') || 'Invalid role' });
            } else if (lowerMessage.includes('email') && (lowerMessage.includes('already exists') || lowerMessage.includes('already exist'))) {
                setErrors({ email: t('emailAlreadyExists') || 'This email is already registered' });
            } else if (lowerMessage.includes('username') && (lowerMessage.includes('already exists') || lowerMessage.includes('already exist'))) {
                setErrors({ username: t('usernameAlreadyExists') || 'This username is already taken' });
            } else if (lowerMessage.includes('phone') && (lowerMessage.includes('already exists') || lowerMessage.includes('already exist'))) {
                setErrors({ phone: t('phoneAlreadyExists') || 'This phone number is already registered' });
            } else {
                // Generic error - show at top
                setErrors({ 
                    _general: errorMessage || t('errorCreatingEmployee') || 'Failed to create employee. Please try again.' 
                });
            }
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
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="add-user-name">{t('name')} *</Label>
                    <Input 
                        id="add-user-name" 
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-username">{t('username')} *</Label>
                    <Input 
                        id="add-user-username" 
                        value={formData.username}
                        onChange={(e) => handleChange('username', e.target.value)}
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
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-password">{t('password')} *</Label>
                    <div className="relative">
                        <Input 
                            id="add-user-password" 
                            type={passwordVisible ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className="pr-10"
                        />
                        <button 
                            type="button"
                            className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400"
                            onClick={() => setPasswordVisible(!passwordVisible)}
                        >
                            {passwordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                        </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-phone">{t('phone')} *</Label>
                    <PhoneInput 
                        id="add-user-phone" 
                        value={formData.phone}
                        onChange={(value) => handleChange('phone', value)}
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
                                <option value="call_center">{t('callCenter')}</option>
                            </>
                        ) : (
                            <>
                                <option value="employee">{t('employee')}</option>
                                <option value="data_entry">{t('dataEntry')}</option>
                                <option value="call_center">{t('callCenter')}</option>
                            </>
                        )}
                    </Select>
                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                </div>
                {(formData.role === 'employee' || formData.role === 'data_entry' || formData.role === 'doctor' || formData.role === 'reception') && (
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
                {(formData.role === 'employee' || formData.role === 'doctor') && (
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
