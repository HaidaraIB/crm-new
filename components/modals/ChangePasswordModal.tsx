
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { EyeIcon, EyeOffIcon } from '../icons';
import { changePasswordAPI } from '../../services/api';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';
import { scrollToFirstFieldError } from '../../utils/formFieldErrors';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const ChangePasswordModal = () => {
    const { isChangePasswordModalOpen, setIsChangePasswordModalOpen, t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // Link new password and confirm password visibility - when one changes, update both
    const handleNewPasswordVisibilityToggle = () => {
        const newValue = !showNewPassword;
        setShowNewPassword(newValue);
        setShowConfirmPassword(newValue);
    };
    
    const handleConfirmPasswordVisibilityToggle = () => {
        const newValue = !showConfirmPassword;
        setShowNewPassword(newValue);
        setShowConfirmPassword(newValue);
    };
    
    // Refs to prevent auto-fill
    const currentPasswordRef = useRef<HTMLInputElement>(null);
    const newPasswordRef = useRef<HTMLInputElement>(null);
    const confirmPasswordRef = useRef<HTMLInputElement>(null);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isChangePasswordModalOpen) {
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            setErrors({});
            // Prevent auto-fill by making fields readonly initially
            setTimeout(() => {
                if (currentPasswordRef.current) {
                    currentPasswordRef.current.removeAttribute('readonly');
                }
                if (newPasswordRef.current) {
                    newPasswordRef.current.removeAttribute('readonly');
                }
                if (confirmPasswordRef.current) {
                    confirmPasswordRef.current.removeAttribute('readonly');
                }
            }, 100);
        }
    }, [isChangePasswordModalOpen]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const translate = (key: string) => {
        const value = t(key as never);
        return value && value !== key ? value : undefined;
    };

    const passwordCatalogValues = (): Record<string, unknown> => ({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword,
    });

    const applyPasswordCatalog = (values: Record<string, unknown>) => {
        const next = catalogFieldErrors('auth.change_password', values, translate);
        if (
            formData.currentPassword &&
            formData.newPassword &&
            formData.currentPassword === formData.newPassword
        ) {
            next.newPassword =
                t('newPasswordMustBeDifferent') || 'New password must be different from current password';
        }
        return next;
    };

    const validateForm = (): boolean => {
        const next = applyPasswordCatalog(passwordCatalogValues());
        setErrors(next);
        if (Object.keys(next).length > 0) {
            requestAnimationFrame(() =>
                scrollToFirstFieldError(next, {
                    currentPassword: 'currentPassword',
                    newPassword: 'newPassword',
                    confirmPassword: 'confirmPassword',
                })
            );
            return false;
        }
        return true;
    };

    const blurField = (field: string) => {
        const next = applyPasswordCatalog(passwordCatalogValues());
        setErrors((prev) => {
            const updated = { ...prev };
            if (next[field]) updated[field] = next[field];
            else delete updated[field];
            return updated;
        });
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            await changePasswordAPI(
                formData.currentPassword,
                formData.newPassword,
                formData.confirmPassword
            );
            
            // Reset form
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            
            // Close modal immediately and show success modal
            setIsChangePasswordModalOpen(false);
            setSuccessMessage(t('passwordChangedSuccessfully') || 'Password changed successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            const serverErrors = serverFieldErrors(error, 'auth.change_password', translate);
            if (serverErrors._general) serverErrors.general = serverErrors._general;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ general: error?.message || t('errorChangingPassword') || 'Error changing password' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isChangePasswordModalOpen} onClose={() => setIsChangePasswordModalOpen(false)} title={t('changePassword')}>
            <div className="space-y-4">
                {/* Hidden field to prevent auto-fill */}
                <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
                    tabIndex={-1}
                    readOnly
                />
                
                {errors.general && (
                    <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md">
                        {errors.general}
                    </div>
                )}

                <div>
                    <Label htmlFor="current-password">{t('currentPassword')}</Label>
                    <div className="relative">
                        <Input
                            ref={currentPasswordRef}
                            id="current-password"
                            type={showCurrentPassword ? 'text' : 'password'}
                            placeholder={t('enterCurrentPassword')}
                            value={formData.currentPassword}
                            onChange={(e) => handleChange('currentPassword', e.target.value)}
                            onBlur={() => blurField('currentPassword')}
                            autoComplete="current-password"
                            data-lpignore="true"
                            data-form-type="other"
                            readOnly
                            onFocus={(e) => e.target.removeAttribute('readonly')}
                            className={`pe-10 ${errors.currentPassword ? 'border-red-500' : ''}`}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                            {showCurrentPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    {errors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.currentPassword}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="new-password">{t('newPassword')}</Label>
                    <div className="relative">
                        <Input
                            ref={newPasswordRef}
                            id="new-password"
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder={t('enterNewPassword')}
                            value={formData.newPassword}
                            onChange={(e) => handleChange('newPassword', e.target.value)}
                            onBlur={() => blurField('newPassword')}
                            autoComplete="new-password"
                            data-lpignore="true"
                            data-form-type="other"
                            readOnly
                            onFocus={(e) => e.target.removeAttribute('readonly')}
                            className={`pe-10 ${errors.newPassword ? 'border-red-500' : ''}`}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400"
                            onClick={handleNewPasswordVisibilityToggle}
                        >
                            {showNewPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    {errors.newPassword && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.newPassword}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="confirm-new-password">{t('confirmNewPassword')}</Label>
                    <div className="relative">
                        <Input
                            ref={confirmPasswordRef}
                            id="confirm-new-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder={t('enterConfirmNewPassword')}
                            value={formData.confirmPassword}
                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                            onBlur={() => blurField('confirmPassword')}
                            autoComplete="new-password"
                            data-lpignore="true"
                            data-form-type="other"
                            readOnly
                            onFocus={(e) => e.target.removeAttribute('readonly')}
                            className={`pe-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400"
                            onClick={handleConfirmPasswordVisibilityToggle}
                        >
                            {showConfirmPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button 
                        variant="secondary" 
                        onClick={() => setIsChangePasswordModalOpen(false)}
                        disabled={isLoading}
                    >
                        {t('cancel')}
                    </Button>
                    <Button 
                        onClick={handleSubmit}
                        disabled={isLoading}
                        loading={isLoading}
                    >
                        {t('saveChanges')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
