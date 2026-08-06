
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { isMedicalSpecialization } from '../../utils/medicalTranslationOverrides';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { PhoneInput } from '../PhoneInput';
import { Button } from '../Button';
import { EyeIcon, EyeOffIcon } from '../icons';
import { useUpdateUser } from '../../hooks/useQueries';
import { normalizeRoleForApi } from '../../utils/roles';
import { validateEmailField, validatePhoneField, validatePasswordField, validateNameField } from '../../utils/formValidation';
import { scrollToFirstFieldError } from '../../utils/formFieldErrors';
import { buildUpdateDiff } from '../../utils/buildUpdateDiff';
import { toHtmlTimeValue } from '../../utils/weekOff';

const EDIT_USER_DOM_ID_MAP: Record<string, string> = {
    name: 'edit-user-name',
    phone: 'edit-user-phone',
    email: 'edit-user-email',
    password: 'edit-user-password',
    role: 'edit-user-role',
};

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <select id={id} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100">
        {children}
    </select>
);

export const EditUserModal = () => {
    const { isEditUserModalOpen, setIsEditUserModalOpen, selectedUser, t, currentUser, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();

    const isMedicalCompany = useMemo(
        () => isMedicalSpecialization(currentUser?.company?.specialization),
        [currentUser?.company?.specialization]
    );
    
    // Update user mutation
    const updateUserMutation = useUpdateUser();
    const loading = updateUserMutation.isPending;
    const initialPayloadRef = useRef<Record<string, unknown> | null>(null);

    const buildPayload = (
        state: typeof formState,
        user: NonNullable<typeof selectedUser>
    ): Record<string, unknown> => {
        const nameParts = state.name.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const currentRole = normalizeRoleForApi(user.role);
        const isAdmin = currentRole === 'admin';
        const roleToSend = isAdmin ? 'admin' : (state.role?.toLowerCase() || 'employee');

        const payload: Record<string, unknown> = {
            first_name: firstName,
            last_name: lastName,
            username: user.username || '',
            phone: state.phone,
            email: state.email,
            role: roleToSend,
        };

        if (state.password) {
            payload.password = state.password;
        }

        if (
            roleToSend === 'employee' ||
            roleToSend === 'data_entry' ||
            roleToSend === 'doctor' ||
            roleToSend === 'reception'
        ) {
            payload.weekly_day_off =
                state.weeklyDayOff === '' ? null : parseInt(state.weeklyDayOff, 10);
        }
        if (roleToSend === 'employee' || roleToSend === 'doctor') {
            payload.can_delete_clients = state.canDeleteClients;
            const start = state.workStartTime.trim();
            const end = state.workEndTime.trim();
            payload.work_start_time = start || null;
            payload.work_end_time = end || null;
        }

        return payload;
    };

    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        role: 'employee' as string,
        weeklyDayOff: '' as string,
        workStartTime: '' as string,
        workEndTime: '' as string,
        canDeleteClients: false,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [passwordVisible, setPasswordVisible] = useState(false);

    // Helper function to get user display name
    const getUserDisplayName = (user: any): string => {
        if (user.name) return user.name;
        if (user.first_name || user.last_name) {
            return [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        }
        return user.username || user.email || t('unknown') || 'Unknown';
    };

    // Initialize form state when modal opens or selectedUser changes
    useEffect(() => {
        if (selectedUser && isEditUserModalOpen) {
            const normalizedRole = normalizeRoleForApi(selectedUser.role);
            
            // Medical: doctor/reception only. Non-medical: employee/data_entry only (no clinic role labels).
            let roleForForm = normalizedRole;
            if (isMedicalCompany) {
                if (normalizedRole === 'data_entry' || normalizedRole === 'reception') {
                    roleForForm = 'reception';
                } else if (normalizedRole === 'employee' || normalizedRole === 'doctor') {
                    roleForForm = 'doctor';
                }
            } else {
                if (normalizedRole === 'doctor') {
                    roleForForm = 'employee';
                } else if (normalizedRole === 'reception') {
                    roleForForm = 'data_entry';
                }
            }
            
            // Get name from first_name + last_name or fallback to name
            const fullName = selectedUser.first_name || selectedUser.last_name
                ? [selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ').trim()
                : selectedUser.name || '';
            
            const wdo = (selectedUser as { weekly_day_off?: number | null }).weekly_day_off;
            const workStart = toHtmlTimeValue(selectedUser.work_start_time);
            const workEnd = toHtmlTimeValue(selectedUser.work_end_time);
            setFormState({
                name: fullName,
                phone: selectedUser.phone || '',
                email: selectedUser.email || '',
                password: '',
                role: roleForForm,
                weeklyDayOff:
                    wdo !== undefined && wdo !== null ? String(wdo) : '',
                workStartTime: workStart,
                workEndTime: workEnd,
                canDeleteClients: Boolean(selectedUser.can_delete_clients),
            });
            initialPayloadRef.current = buildPayload({
                name: fullName,
                phone: selectedUser.phone || '',
                email: selectedUser.email || '',
                password: '',
                role: roleForForm,
                weeklyDayOff:
                    wdo !== undefined && wdo !== null ? String(wdo) : '',
                workStartTime: workStart,
                workEndTime: workEnd,
                canDeleteClients: Boolean(selectedUser.can_delete_clients),
            }, selectedUser);
            setPasswordVisible(false);
        } else {
            initialPayloadRef.current = null;
        }
    }, [selectedUser, isEditUserModalOpen, isMedicalCompany]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        const nameError = validateNameField(formState.name, t, { minLength: 2 });
        if (nameError) newErrors.name = nameError;

        const emailError = validateEmailField(formState.email, t);
        if (emailError) newErrors.email = emailError;

        const phoneError = validatePhoneField(formState.phone, t);
        if (phoneError) newErrors.phone = phoneError;

        // Password is optional on edit - only validate if provided
        const passwordError = validatePasswordField(formState.password, t, { required: false });
        if (passwordError) newErrors.password = passwordError;

        if (formState.role === 'employee' || formState.role === 'doctor') {
            const start = formState.workStartTime.trim();
            const end = formState.workEndTime.trim();
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
            scrollToFirstFieldError(newErrors, EDIT_USER_DOM_ID_MAP);
            return false;
        }
        return true;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        const field = id.replace('edit-user-', '');
        setFormState(prev => ({ ...prev, [field]: value }));
        
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handlePhoneChange = (value: string) => {
        setFormState(prev => ({ ...prev, phone: value }));
        
        // Clear phone error when user starts typing
        if (errors.phone) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.phone;
                return newErrors;
            });
        }
    };

    const handleClose = () => {
        setIsEditUserModalOpen(false);
        setFormState({
            name: '',
            phone: '',
            email: '',
            password: '',
            role: isMedicalCompany ? 'doctor' : 'employee',
            weeklyDayOff: '',
            workStartTime: '',
            workEndTime: '',
            canDeleteClients: false,
        });
        setErrors({});
        setPasswordVisible(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        // Validate form before submission
        if (!validateForm()) {
            return;
        }

        setErrors({});

        try {
            const payload = buildPayload(formState, selectedUser);
            const patch = buildUpdateDiff(initialPayloadRef.current || {}, payload);
            if (Object.keys(patch).length === 0) {
                handleClose();
                return;
            }

            await updateUserMutation.mutateAsync({
                id: selectedUser.id,
                data: patch as any,
            });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('employeeUpdatedSuccessfully') || 'Employee updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating user:', error);
            
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
            } else if (lowerMessage.includes('phone') && (lowerMessage.includes('already exists') || lowerMessage.includes('already exist'))) {
                setErrors({ phone: t('phoneAlreadyExists') || 'This phone number is already registered' });
            } else if (errorFields.username) {
                const usernameError = Array.isArray(errorFields.username) ? errorFields.username[0] : errorFields.username;
                setErrors({ username: usernameError || t('usernameRequired') || 'Username is required' });
            } else {
                // Generic error - show at top
                setErrors({ 
                    _general: errorMessage || t('errorUpdatingEmployee') || 'Failed to update employee. Please try again.' 
                });
            }
        }
    };

    if (!selectedUser) return null;

    const displayName = getUserDisplayName(selectedUser);

    return (
        <Modal isOpen={isEditUserModalOpen} onClose={handleClose} title={`${t('editEmployee')}: ${displayName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="edit-user-name">{t('name')} *</Label>
                    <Input 
                        id="edit-user-name" 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <Label htmlFor="edit-user-phone">{t('phone')} *</Label>
                    <PhoneInput 
                        id="edit-user-phone" 
                        value={formState.phone} 
                        onChange={handlePhoneChange}
                        placeholder={t('enterPhone') || 'Enter phone number'}
                        error={!!errors.phone}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                    <Label htmlFor="edit-user-email">{t('email')} *</Label>
                    <Input 
                        id="edit-user-email" 
                        type="email" 
                        value={formState.email} 
                        onChange={handleChange}
                        className={errors.email ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                    <Label htmlFor="edit-user-password">{t('newUserPassword')}</Label>
                    <div className="relative">
                        <Input 
                            id="edit-user-password" 
                            type={passwordVisible ? 'text' : 'password'}
                            value={formState.password} 
                            onChange={handleChange} 
                            placeholder={t('leaveBlankPassword')}
                            autoComplete="new-password"
                            className={`pr-10 ${errors.password ? 'border-red-500 dark:border-red-500' : ''}`}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            onClick={() => setPasswordVisible((v) => !v)}
                            aria-label={passwordVisible ? (t('hidePassword') || 'Hide password') : (t('showPassword') || 'Show password')}
                        >
                            {passwordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                    {!errors.password && formState.password && (
                        <p className="text-gray-500 text-xs mt-1">{t('leaveBlankPassword') || 'Leave blank to keep current password'}</p>
                    )}
                </div>
                {normalizeRoleForApi(selectedUser.role) !== 'admin' && (
                    <div>
                        <Label htmlFor="edit-user-role">{t('role')}</Label>
                        <Select id="edit-user-role" value={formState.role} onChange={handleChange}>
                            {isMedicalCompany ? (
                                <>
                                    <option value="doctor">{t('doctor')}</option>
                                    <option value="reception">{t('reception')}</option>
                                </>
                            ) : (
                                <>
                                    <option value="employee">{t('employee')}</option>
                                    <option value="data_entry">{t('dataEntry')}</option>
                                </>
                            )}
                        </Select>
                        {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                    </div>
                )}
                {normalizeRoleForApi(selectedUser.role) !== 'admin' &&
                    (formState.role === 'employee' || formState.role === 'data_entry' || formState.role === 'doctor' || formState.role === 'reception') && (
                    <div>
                        <Label htmlFor="edit-user-weeklyDayOff">{t('weeklyDayOff')}</Label>
                        <Select
                            id="edit-user-weeklyDayOff"
                            value={formState.weeklyDayOff}
                            onChange={handleChange}
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
                {normalizeRoleForApi(selectedUser.role) !== 'admin' &&
                    (formState.role === 'employee' || formState.role === 'doctor') && (
                    <div>
                        <Label htmlFor="edit-user-workStartTime">{t('workingHours')}</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="edit-user-workStartTime" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {t('workingHoursFrom')}
                                </label>
                                <Input
                                    id="edit-user-workStartTime"
                                    type="time"
                                    value={formState.workStartTime}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="edit-user-workEndTime" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {t('workingHoursTo')}
                                </label>
                                <Input
                                    id="edit-user-workEndTime"
                                    type="time"
                                    value={formState.workEndTime}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('workingHoursHelp')}</p>
                        {errors.workEndTime && (
                            <p className="text-red-500 text-xs mt-1">{errors.workEndTime}</p>
                        )}
                    </div>
                )}
                {normalizeRoleForApi(selectedUser.role) !== 'admin' &&
                    (formState.role === 'employee' || formState.role === 'doctor') && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <input
                                id="edit-user-canDeleteClients"
                                type="checkbox"
                                checked={formState.canDeleteClients}
                                onChange={(e) =>
                                    setFormState((prev) => ({ ...prev, canDeleteClients: e.target.checked }))
                                }
                                className="rounded"
                            />
                            <label
                                htmlFor="edit-user-canDeleteClients"
                                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                {t('canDeleteClients')}
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 ps-6">{t('canDeleteClientsHelp')}</p>
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={handleClose} 
                        disabled={loading}
                    >
                        {t('cancel')}
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={loading}
                        loading={loading}
                    >
                        {t('saveChanges')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
