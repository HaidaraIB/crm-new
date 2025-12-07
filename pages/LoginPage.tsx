import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
// FIX: Corrected component import path to avoid conflict with `components.tsx`.
import { Button, Input, EyeIcon, EyeOffIcon, MoonIcon, SunIcon } from '../components/index';
import { loginAPI, getCurrentUserAPI, requestTwoFactorAuthAPI } from '../services/api';

export const LoginPage = () => {
    // Check if this is a logout redirect and clear any remaining data
    // Also check for payment success message
    const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
    
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('logout') === 'true') {
            // Clear all data to ensure clean logout
            localStorage.removeItem('currentUser');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('pendingUserData');
            sessionStorage.clear();
            
            // Clean URL
            window.history.replaceState({}, '', '/login');
        }
        
        // Check for payment success message
        if (urlParams.get('payment_success') === 'true') {
            const storedMessage = localStorage.getItem('paymentSuccessMessage');
            if (storedMessage) {
                try {
                    const messageData = JSON.parse(storedMessage);
                    setPaymentSuccessMessage(messageData.message);
                    // Clean URL
                    window.history.replaceState({}, '', '/login');
                } catch (e) {
                    console.error('Error parsing payment success message:', e);
                }
            }
        } else {
            // Also check localStorage for payment success message (in case URL param was removed)
            const storedMessage = localStorage.getItem('paymentSuccessMessage');
            if (storedMessage) {
                try {
                    const messageData = JSON.parse(storedMessage);
                    // Only show if message is recent (within last 5 minutes)
                    const messageAge = Date.now() - messageData.timestamp;
                    if (messageAge < 5 * 60 * 1000) {
                        setPaymentSuccessMessage(messageData.message);
                    } else {
                        localStorage.removeItem('paymentSuccessMessage');
                    }
                } catch (e) {
                    console.error('Error parsing payment success message:', e);
                }
            }
        }
    }, []);
    const { setIsLoggedIn, setCurrentUser, setCurrentPage, t, language, setLanguage, theme, setTheme } = useAppContext();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

    // Check for pending subscription ID on mount
    useEffect(() => {
        const pendingSubId = localStorage.getItem('pendingSubscriptionId');
        if (pendingSubId) {
            setSubscriptionId(pendingSubId);
            // Only show error if payment_success is not in URL (to avoid showing error after successful payment)
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('payment_success') !== 'true') {
                // Set a flag error that will trigger the link display
                setError('SUBSCRIPTION_INACTIVE');
            }
            // Clear it after showing
            localStorage.removeItem('pendingSubscriptionId');
        }
    }, [t]);

    const translateLoginError = (errorMessage: string): string => {
        const lowerMessage = errorMessage.toLowerCase();
        
        if (lowerMessage.includes('no active account') || lowerMessage.includes('active account')) {
            return t('loginErrorNoActiveAccount') || 'No active account found with the given credentials';
        }
        if (lowerMessage.includes('unable to log in') || lowerMessage.includes('unable to login')) {
            return t('loginErrorUnableToLogin') || 'Unable to log in with provided credentials';
        }
        if (lowerMessage.includes('account is inactive') || lowerMessage.includes('inactive')) {
            return t('loginErrorAccountInactive') || 'Account is inactive';
        }
        if (lowerMessage.includes('invalid') || lowerMessage.includes('incorrect')) {
            return t('loginErrorInvalidCredentials') || 'Invalid username or password';
        }
        
        // Default fallback
        return t('invalidCredentials') || 'Invalid username or password';
    };

    const handleLogin = async () => {
        setError('');
        
        if (!username.trim() || !password.trim()) {
            setError(t('pleaseEnterCredentials') || 'Please enter username and password');
            return;
        }

        setIsLoading(true);
        
        try {
            console.log('🔐 Starting login process for:', username);
            // Request 2FA code (this will verify user exists and is active)
            const twoFAResponse = await requestTwoFactorAuthAPI(username, language);
            console.log('✅ 2FA request successful, navigating to 2FA page');
            
            // Store username, password, and token in sessionStorage for 2FA page
            sessionStorage.setItem('2fa_username', username);
            sessionStorage.setItem('2fa_password', password);
            sessionStorage.setItem('2fa_token', twoFAResponse.token);
            
            // Navigate to 2FA page (password will be verified there)
            window.history.replaceState({}, '', '/2fa');
            setCurrentPage('TwoFactorAuth');
            setIsLoading(false);
        } catch (error: any) {
            console.error('❌ Login error:', error);
            const errorMessage = error.message || '';
            console.error('❌ Error message:', errorMessage);
            console.error('❌ Error status:', error.status);
            console.error('❌ Full error:', error);
            
            // Check if it's a subscription inactive error
            if (error.code === 'SUBSCRIPTION_INACTIVE' || errorMessage === 'SUBSCRIPTION_INACTIVE') {
                const subId = error.subscriptionId || localStorage.getItem('pendingSubscriptionId');
                if (subId) {
                    setSubscriptionId(subId);
                    setError('SUBSCRIPTION_INACTIVE');
                } else {
                    setError(t('noActiveSubscription'));
                }
            } else {
                const translatedError = translateLoginError(errorMessage);
                console.error('❌ Translated error:', translatedError);
                setError(translatedError);
            }
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
                    <p className="mt-4 text-primary-200">{t('crmWelcome')}</p>
                </div>
                <div>
                    <h2 className="text-4xl font-bold">{t('hello')}</h2>
                    <p className="mt-2 text-primary-200 max-w-md">{t('crmDescription')}</p>
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
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">{t('welcomeBack')}</h2>
                        <p className="mt-2 text-center text-sm text-secondary">{t('signInToContinue')}</p>
                    </div>
                    <div className="space-y-6">
                        {paymentSuccessMessage && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 px-4 py-3 rounded-md text-sm">
                                <div>
                                    {paymentSuccessMessage}
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                                <div>
                                    {error === 'SUBSCRIPTION_INACTIVE' && subscriptionId ? (
                                        <>
                                            {t('noActiveSubscriptionBeforeLink')}
                                            <a
                                                href={`/payment?subscription_id=${subscriptionId}`}
                                                className="underline font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 ml-1"
                                            >
                                                {t('completePayment')}
                                            </a>
                                            {t('noActiveSubscriptionMiddleLink')}
                                            <a
                                                href={`/change-plan${subscriptionId ? `?subscription_id=${subscriptionId}` : ''}`}
                                                className="underline font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 ml-1"
                                            >
                                                {t('changePlan')}
                                            </a>
                                            {t('noActiveSubscriptionAfterLink')}
                                        </>
                                    ) : (
                                        error
                                    )}
                                </div>
                            </div>
                        )}
                        <div>
                            <label htmlFor="username" className="sr-only">{t('username')}</label>
                            <Input 
                                id="username" 
                                placeholder={t('usernameOrEmail') || 'Username or Email'}
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value);
                                    setError('');
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleLogin();
                                    }
                                }}
                            />
                        </div>
                        <div className="relative">
                           <label htmlFor="password" className="sr-only">{t('password')}</label>
                           <Input 
                                id="password" 
                                type={passwordVisible ? 'text' : 'password'}
                                placeholder={t('password')} 
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError('');
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleLogin();
                                    }
                                }}
                           />
                           <button 
                                type="button"
                                className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400"
                                onClick={() => setPasswordVisible(!passwordVisible)}
                           >
                            {passwordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                           </button>
                        </div>
                        <div>
                            <Button onClick={handleLogin} className="w-full" loading={isLoading} disabled={isLoading}>
                                {t('signIn')}
                            </Button>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-sm text-secondary">
                                <button
                                    onClick={() => {
                                        window.location.href = '/forgot-password';
                                    }}
                                    className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                                >
                                    {t('forgotPassword') || 'Forgot Password?'}
                                </button>
                            </p>
                            <p className="text-sm text-secondary">
                                {t('dontHaveAccount') || "Don't have an account?"}{' '}
                                <button
                                    onClick={() => {
                                        window.location.href = '/register';
                                    }}
                                    className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                                >
                                    {t('register') || 'Register'}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};