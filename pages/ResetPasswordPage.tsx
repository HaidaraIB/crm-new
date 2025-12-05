import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Input, EyeIcon, EyeOffIcon, MoonIcon, SunIcon } from '../components/index';
import { resetPasswordAPI } from '../services/api';

export const ResetPasswordPage = () => {
    const { setCurrentPage, t, language, setLanguage, theme, setTheme } = useAppContext();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    // Link both password fields visibility together
    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Get token, code, and email from URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const codeParam = urlParams.get('code');
        const emailParam = urlParams.get('email');

        if (emailParam) {
            setEmail(emailParam);
        }

        if (codeParam) {
            setCode(codeParam);
        }
    }, []);

    const handleResetPassword = async () => {
        setError('');
        setSuccess(false);
        
        // Get token from URL if available
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!email.trim()) {
            setError(t('pleaseEnterEmail') || 'Please enter your email address');
            return;
        }

        // Must have either token (from link) or code (from manual entry)
        if (!token && !code.trim()) {
            setError(t('pleaseEnterCodeOrToken') || 'Please enter the reset code or use the reset link');
            return;
        }

        if (!newPassword.trim()) {
            setError(t('pleaseEnterNewPassword') || 'Please enter a new password');
            return;
        }

        if (newPassword.length < 8) {
            setError(t('passwordTooShort') || 'Password must be at least 8 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t('passwordsDoNotMatch') || 'Passwords do not match');
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
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } catch (error: any) {
            const errorMessage = error.message || error.detail || error.error || 'Failed to reset password';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex ${language === 'ar' ? 'font-arabic' : 'font-sans'} relative`}>
            {/* Theme and Language Toggle Buttons */}
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
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-700 to-primary-500 text-white p-12 flex-col justify-between">
                <div>
                    <img 
                        src="/logo.png" 
                        alt="LOOP CRM Logo" 
                        className="h-20 w-auto object-contain mb-6" 
                    />
                    <p className="mt-4 text-primary-200">{t('crmWelcome') || 'Welcome to LOOP CRM'}</p>
                </div>
                <div>
                    <h2 className="text-4xl font-bold">{t('resetPassword') || 'Reset Password'}</h2>
                    <p className="mt-2 text-primary-200 max-w-md">
                        {t('resetPasswordDescription') || 'Enter your new password below to complete the reset process.'}
                    </p>
                </div>
            </div>
            <div className="w-full lg:w-1/2 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="flex flex-col items-center">
                        <img 
                            src="/logo.png" 
                            alt="LOOP CRM Logo" 
                            className="h-12 w-auto object-contain mb-4 lg:hidden" 
                        />
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
                            {t('resetPassword') || 'Reset Password'}
                        </h2>
                        <p className="mt-2 text-center text-sm text-secondary">
                            {t('enterNewPasswordBelow') || 'Enter your new password below'}
                        </p>
                    </div>
                    <div className="space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 px-4 py-3 rounded-md text-sm">
                                {t('passwordResetSuccess') || 'Password has been reset successfully! Redirecting to login...'}
                            </div>
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
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setError('');
                                        }}
                                        disabled={!!new URLSearchParams(window.location.search).get('email')}
                                    />
                                </div>
                                <div className="relative">
                                    <label htmlFor="newPassword" className="sr-only">{t('newPassword') || 'New Password'}</label>
                                    <Input 
                                        id="newPassword" 
                                        type={passwordVisible ? 'text' : 'password'}
                                        placeholder={t('newPassword') || 'New password'} 
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            setError('');
                                        }}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleResetPassword();
                                            }
                                        }}
                                    />
                                    <button 
                                        type="button"
                                        className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400"
                                        onClick={togglePasswordVisibility}
                                    >
                                        {passwordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                    </button>
                                </div>
                                <div className="relative">
                                    <label htmlFor="confirmPassword" className="sr-only">{t('confirmPassword') || 'Confirm Password'}</label>
                                    <Input 
                                        id="confirmPassword" 
                                        type={passwordVisible ? 'text' : 'password'}
                                        placeholder={t('confirmPassword') || 'Confirm password'} 
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setError('');
                                        }}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleResetPassword();
                                            }
                                        }}
                                    />
                                    <button 
                                        type="button"
                                        className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400"
                                        onClick={togglePasswordVisibility}
                                    >
                                        {passwordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                    </button>
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

