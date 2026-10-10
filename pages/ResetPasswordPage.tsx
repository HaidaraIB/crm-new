import React, { useState, useEffect } from 'react';
import { Alert } from '../components/Alert';
import { useAppContext } from '../context/AppContext';
import { AuthHero } from '../components/AuthHero';
import { Button, Input, EyeIcon, EyeOffIcon, MoonIcon, SunIcon } from '../components/index';
import { resetPasswordAPI } from '../services/api';
import { catalogFieldErrors, serverFieldErrors } from '../forms';

export const ResetPasswordPage = () => {
    const { setCurrentPage, t, language, setLanguage, theme, setTheme } = useAppContext();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const codeParam = urlParams.get('code');
        const emailParam = urlParams.get('email');

        if (emailParam) {
            setEmail(emailParam);
        }

        if (codeParam) {
            setCode(codeParam);
        }
    }, []);

    const translate = (key: string) => {
        const value = t(key as never);
        return value && value !== key ? value : undefined;
    };

    const resetValues = (nextEmail = email, nextPassword = newPassword, nextConfirm = confirmPassword) => ({
        email: nextEmail,
        new_password: nextPassword,
        confirm_password: nextConfirm,
        password: nextPassword,
        confirmPassword: nextConfirm,
    });

    const mirrorResetErrors = (raw: Record<string, string>) => {
        const next = { ...raw };
        if (next._general && !next.general) next.general = next._general;
        if (next.password && !next.newPassword) next.newPassword = next.password;
        if (next.newPassword && !next.password) next.password = next.newPassword;
        if (next.new_password && !next.newPassword) next.newPassword = next.new_password;
        if (next.confirm_password && !next.confirmPassword) next.confirmPassword = next.confirm_password;
        return next;
    };

    const collectResetErrors = (nextEmail = email, nextPassword = newPassword, nextConfirm = confirmPassword) => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const next = mirrorResetErrors(
            catalogFieldErrors('auth.reset_password', resetValues(nextEmail, nextPassword, nextConfirm), translate),
        );
        if (!token && !code.trim()) {
            next.code = t('pleaseEnterCodeOrToken') || 'Please enter the reset code or use the reset link';
        }
        return next;
    };

    const showResetField = (
        field: 'email' | 'newPassword' | 'confirmPassword',
        nextEmail = email,
        nextPassword = newPassword,
        nextConfirm = confirmPassword,
    ) => {
        const next = collectResetErrors(nextEmail, nextPassword, nextConfirm);
        const keys = field === 'newPassword' ? ['newPassword', 'password', 'new_password'] : [field];
        setErrors((prev) => {
            const updated = { ...prev };
            for (const key of keys) {
                if (next[key]) updated[key] = next[key];
                else delete updated[key];
            }
            return updated;
        });
    };

    const handleResetPassword = async () => {
        setSuccess(false);

        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        const next = collectResetErrors();
        setErrors(next);
        if (Object.keys(next).length > 0) {
            return;
        }

        setIsLoading(true);

        try {
            await resetPasswordAPI({
                email,
                code: code.trim() || undefined,
                token: token || undefined,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            setSuccess(true);

            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } catch (error: any) {
            const server = mirrorResetErrors(serverFieldErrors(error, 'auth.reset_password', translate));
            const errorMessage = error.message || error.detail || error.error || 'Failed to reset password';
            setErrors({
                ...server,
                general: server.general || server._general || errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex ${language === 'ar' ? 'font-arabic' : 'font-sans'} relative`}>
            <div className={`absolute top-4 end-4 z-10 flex ${language === 'ar' ? 'gap-4' : 'gap-2'}`}>
                <button
                    onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    aria-label={`Switch to ${language === 'ar' ? 'English' : 'Arabic'}`}
                >
                    <span className="font-bold text-sm">{language === 'ar' ? 'EN' : 'AR'}</span>
                </button>
                <Button variant="ghost" className="p-2 h-auto" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                </Button>
            </div>
            <AuthHero />
            <div className="w-full lg:w-1/2 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="flex flex-col items-center">
                        <img
                            src="/logo_purple.png"
                            alt="LOOP CRM Logo"
                            className="h-12 w-auto object-contain mb-4 lg:hidden"
                        />
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-heading">
                            {t('resetPassword') || 'Reset Password'}
                        </h2>
                        <p className="mt-2 text-center text-sm text-secondary">
                            {t('enterNewPasswordBelow') || 'Enter your new password below'}
                        </p>
                    </div>
                    <div className="space-y-6">
                        {errors.general && (
                            <Alert variant="error">{errors.general}</Alert>
                        )}
                        {errors.code && (
                            <Alert variant="error">{errors.code}</Alert>
                        )}
                        {success && (
                            <Alert variant="success">{t('passwordResetSuccess') || 'Password has been reset successfully! Redirecting to login...'}</Alert>
                        )}
                        {!success && (
                            <>
                                <div>
                                    <label htmlFor="email" className="sr-only">{t('emailAddress') || 'Email'}</label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={t('emailAddress') || 'Email address'}
                                        value={email}
                                        className={errors.email ? 'border-red-500' : ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setEmail(value);
                                            if (errors.email) showResetField('email', value, newPassword, confirmPassword);
                                        }}
                                        onBlur={() => showResetField('email')}
                                        disabled={!!new URLSearchParams(window.location.search).get('email')}
                                    />
                                    {errors.email && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="newPassword" className="sr-only">{t('newPassword') || 'New Password'}</label>
                                    <Input
                                        id="newPassword"
                                        type={passwordVisible ? 'text' : 'password'}
                                        placeholder={t('newPassword') || 'New password'}
                                        value={newPassword}
                                        className={errors.newPassword ? 'border-red-500' : ''}
                                        endAdornment={
                                          <button
                                            type="button"
                                            className="text-gray-400"
                                            onClick={togglePasswordVisibility}
                                          >
                                            {passwordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                          </button>
                                        }
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setNewPassword(value);
                                            if (errors.newPassword || errors.password) {
                                                showResetField('newPassword', email, value, confirmPassword);
                                            }
                                        }}
                                        onBlur={() => showResetField('newPassword')}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleResetPassword();
                                            }
                                        }}
                                    />
                                    {errors.newPassword && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.newPassword}</p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="sr-only">{t('confirmPassword') || 'Confirm Password'}</label>
                                    <Input
                                        id="confirmPassword"
                                        type={passwordVisible ? 'text' : 'password'}
                                        placeholder={t('confirmPassword') || 'Confirm password'}
                                        value={confirmPassword}
                                        className={errors.confirmPassword ? 'border-red-500' : ''}
                                        endAdornment={
                                          <button
                                            type="button"
                                            className="text-gray-400"
                                            onClick={togglePasswordVisibility}
                                          >
                                            {passwordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                          </button>
                                        }
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setConfirmPassword(value);
                                            if (errors.confirmPassword) showResetField('confirmPassword', email, newPassword, value);
                                        }}
                                        onBlur={() => showResetField('confirmPassword')}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleResetPassword();
                                            }
                                        }}
                                    />
                                    {errors.confirmPassword && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                                    )}
                                </div>
                                <div>
                                    <Button onClick={handleResetPassword} className="w-full" loading={isLoading} disabled={isLoading}>
                                        {t('resetPassword') || 'Reset Password'}
                                    </Button>
                                </div>
                            </>
                        )}
                        <div className="text-center">
                            <p className="text-sm text-secondary">
                                {t('rememberPassword') || 'Remember your password?'}{' '}
                                <button
                                    onClick={() => {
                                        window.location.href = '/login';
                                    }}
                                    className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                                >
                                    {t('signIn') || 'Sign In'}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
