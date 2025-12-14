
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { PhoneInput } from '../PhoneInput';
import { Button } from '../Button';
import { useUpdateUser } from '../../hooks/useQueries';

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
    const { isEditUserModalOpen, setIsEditUserModalOpen, selectedUser, t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    
    // Update user mutation
    const updateUserMutation = useUpdateUser();
    const loading = updateUserMutation.isPending;

    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        role: 'Employee' as string,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

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
            // Normalize role: API returns 'admin' or 'employee', but might also return 'Owner' from old data
            const normalizedRole = selectedUser.role?.toLowerCase() === 'admin' || selectedUser.role === 'Owner' ? 'admin' : 'employee';
            
            // Get name from first_name + last_name or fallback to name
            const fullName = selectedUser.first_name || selectedUser.last_name
                ? [selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ').trim()
                : selectedUser.name || '';
            
            setFormState({
                name: fullName,
                phone: selectedUser.phone || '',
                email: selectedUser.email || '',
                password: '',
                role: normalizedRole,
            });
        }
    }, [selectedUser, isEditUserModalOpen]);

    const validatePhone = (phone: string): string | null => {
        if (!phone.trim()) {
            return t('phoneRequired') || 'Phone is required';
        }
        
        // Phone should start with + (dial code)
        if (!phone.startsWith('+')) {
            return t('invalidPhoneFormat') || 'Phone number must include country code (e.g., +966...)';
        }
        
        // Remove + and check if remaining digits are valid (at least 7 digits for phone number)
        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.length < 8) {
            return t('invalidPhoneLength') || 'Phone number is too short';
        }
        
        if (digitsOnly.length > 15) {
            return t('invalidPhoneLength') || 'Phone number is too long';
        }
        
        return null;
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        
        // Name validation
        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
        } else if (formState.name.trim().length < 2) {
            newErrors.name = t('nameMinLength') || 'Name must be at least 2 characters';
        }
        
        // Email validation
        if (!formState.email.trim()) {
            newErrors.email = t('emailRequired') || 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
            newErrors.email = t('invalidEmail') || 'Invalid email format';
        }
        
        // Phone validation
        const phoneError = validatePhone(formState.phone);
        if (phoneError) {
            newErrors.phone = phoneError;
        }
        
        // Password validation (only if provided)
        if (formState.password.trim()) {
            if (formState.password.length < 8) {
                newErrors.password = t('passwordMinLength') || 'Password must be at least 8 characters';
            } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formState.password)) {
                newErrors.password = t('passwordComplexity') || 'Password must contain at least one letter and one number';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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
            role: 'employee',
        });
        setErrors({});
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
            // Split name into first_name and last_name
            const nameParts = formState.name.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Normalize role to lowercase for API (API expects 'admin' or 'employee')
            const currentRole = selectedUser.role?.toLowerCase();
            const isAdmin = currentRole === 'admin' || selectedUser.role === 'Owner';
            const roleToSend = isAdmin ? 'admin' : formState.role.toLowerCase();
            
            await updateUserMutation.mutateAsync({
                id: selectedUser.id,
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    username: selectedUser.username || '', // Include username (required by API)
                    phone: formState.phone,
                    email: formState.email,
                    password: formState.password || undefined,
                    role: roleToSend,
                }
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
                    <Input 
                        id="edit-user-password" 
                        type="password" 
                        value={formState.password} 
                        onChange={handleChange} 
                        placeholder={t('leaveBlankPassword')}
                        className={errors.password ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                    {!errors.password && formState.password && (
                        <p className="text-gray-500 text-xs mt-1">{t('leaveBlankPassword') || 'Leave blank to keep current password'}</p>
                    )}
                </div>
                {(selectedUser.role?.toLowerCase() !== 'admin' && selectedUser.role !== 'Owner') && (
                    <div>
                        <Label htmlFor="edit-user-role">{t('role')}</Label>
                        <Select id="edit-user-role" value={formState.role} onChange={handleChange}>
                            <option value="employee">{t('employee')}</option>
                        </Select>
                        {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
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
