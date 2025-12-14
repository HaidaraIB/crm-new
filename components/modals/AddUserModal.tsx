
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { PhoneInput } from '../PhoneInput';
import { Button } from '../Button';
import { EyeIcon, EyeOffIcon } from '../icons';
import { useCreateUser } from '../../hooks/useQueries';

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
    });
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

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

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = t('nameMinLength') || 'Name must be at least 2 characters';
        }
        
        // Username validation
        if (!formData.username.trim()) {
            newErrors.username = t('usernameRequired') || 'Username is required';
        } else if (formData.username.trim().length < 3) {
            newErrors.username = t('usernameMinLength') || 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
            newErrors.username = t('usernameInvalidChars') || 'Username can only contain letters, numbers, and underscores';
        }
        
        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = t('emailRequired') || 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            newErrors.email = t('invalidEmail') || 'Invalid email format';
        }
        
        // Password validation
        if (!formData.password.trim()) {
            newErrors.password = t('passwordRequired') || 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = t('passwordMinLength') || 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = t('passwordComplexity') || 'Password must contain at least one letter and one number';
        }
        
        // Phone validation
        const phoneError = validatePhone(formData.phone);
        if (phoneError) {
            newErrors.phone = phoneError;
        }
        
        // Role validation
        if (!formData.role) {
            newErrors.role = t('roleRequired') || 'Role is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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
            
            
            await createUserMutation.mutateAsync(userData);

            // Reset form
            setFormData({
                name: '',
                username: '',
                email: '',
                password: '',
                phone: '',
                role: 'employee',
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

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    return (
        <Modal isOpen={isAddUserModalOpen} onClose={() => {
            setIsAddUserModalOpen(false);
            setFormData({
                name: '',
                username: '',
                email: '',
                password: '',
                phone: '',
                role: 'employee',
            });
            setErrors({});
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
                        <option value="employee">{t('employee')}</option>
                    </Select>
                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button 
                        variant="secondary" 
                        onClick={() => {
                            setIsAddUserModalOpen(false);
                            setFormData({
                                name: '',
                                username: '',
                                email: '',
                                password: '',
                                phone: '',
                                role: 'employee',
                            });
                            setErrors({});
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

