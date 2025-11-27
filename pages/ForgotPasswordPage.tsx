import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Input, MoonIcon, SunIcon } from '../components/index';
import { forgotPasswordAPI } from '../services/api';

export const ForgotPasswordPage = () => {
    const { setCurrentPage, t, language, setLanguage, theme, setTheme } = useAppContext();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCodeLoading, setIsCodeLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [useCode, setUseCode] = useState(false);

    const handleForgotPassword = async () => {
        setError('');
        setSuccess(false);
        
        if (!email.trim()) {
            setError(t('pleaseEnterEmail') || 'Please enter your email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError(t('invalidEmailFormat') || 'Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        
        try {
            await forgotPasswordAPI(email);
            setSuccess(true);
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to send password reset email';
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
                    <h2 className="text-4xl font-bold">{t('forgotPassword') || 'Forgot Password?'}</h2>
                    <p className="mt-2 text-primary-200 max-w-md">
                        {t('forgotPasswordDescription') || 'No worries! Enter your email address and we\'ll send you a link to reset your password.'}
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
                            {t('forgotPassword') || 'Forgot Password?'}
                        </h2>
                        <p className="mt-2 text-center text-sm text-secondary">
                            {t('forgotPasswordSubtitle') || 'Enter your email address and we\'ll send you a reset link'}
                        </p>
                    </div>
                    <div className="space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}
                        {success ? (
                            <>
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 px-4 py-3 rounded-md text-sm">
                                    {t('passwordResetEmailSent') || 'If the email exists, a password reset link has been sent to your email address. Please check your inbox.'}
                                </div>
                                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-center">
                                        <p className="text-sm text-secondary mb-4">
                                            {t('chooseResetMethod') || 'You can either click the link in your email or enter the code below:'}
                                        </p>
                                    </div>
                                    <div>
                                        <label htmlFor="code" className="sr-only">{t('resetCode') || 'Reset Code'}</label>
                                        <Input 
                                            id="code" 
                                            placeholder={t('resetCode') || 'Enter reset code from email'}
                                            value={code}
                                            onChange={(e) => {
                                                setCode(e.target.value);
                                                setError('');
                                            }}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && code.trim().length === 6) {
                                                    window.location.href = `/reset-password?email=${encodeURIComponent(email)}&code=${code.trim()}`;
                                                }
                                            }}
                                            maxLength={6}
                                        />
                                        <p className="mt-2 text-xs text-secondary text-center">
                                            {t('enterCodeFromEmail') || 'Enter the 6-digit code sent to your email'}
                                        </p>
                                    </div>
                                    <div>
                                        <Button 
                                            onClick={() => {
                                                if (!code.trim()) {
                                                    setError(t('pleaseEnterCode') || 'Please enter the reset code');
                                                    return;
                                                }
                                                if (code.trim().length !== 6) {
                                                    setError(t('codeMustBe6Digits') || 'Code must be 6 digits');
                                                    return;
                                                }
                                                setIsCodeLoading(true);
                                                window.location.href = `/reset-password?email=${encodeURIComponent(email)}&code=${code.trim()}`;
                                            }}
                                            className="w-full"
                                            loading={isCodeLoading}
                                            disabled={!code.trim() || code.trim().length !== 6 || isCodeLoading}
                                        >
                                            {t('continueWithCode') || 'Continue with Code'}
                                        </Button>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-secondary">
                                            {t('orClickLinkInEmail') || 'Or click the link in your email to continue'}
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : (
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
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleForgotPassword();
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <Button onClick={handleForgotPassword} className="w-full" loading={isLoading} disabled={isLoading}>
                                        {t('sendResetLink') || 'Send Reset Link'}
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

