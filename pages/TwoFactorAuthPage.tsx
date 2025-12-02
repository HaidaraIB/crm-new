import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Input, MoonIcon, SunIcon } from '../components/index';
import { requestTwoFactorAuthAPI, verifyTwoFactorAuthAPI, getCurrentUserAPI } from '../services/api';
import { navigateToCompanyRoute, getCompanySubdomainUrl } from '../utils/routing';

export const TwoFactorAuthPage = () => {
    const { setIsLoggedIn, setCurrentUser, setCurrentPage, t, language, setLanguage, theme, setTheme } = useAppContext();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [token, setToken] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [subscriptionId, setSubscriptionId] = useState<number | null>(null);

    // Get username and password from sessionStorage (set by LoginPage)
    useEffect(() => {
        const storedUsername = sessionStorage.getItem('2fa_username');
        const storedPassword = sessionStorage.getItem('2fa_password');
        const storedToken = sessionStorage.getItem('2fa_token');
        
        if (storedUsername) setUsername(storedUsername);
        if (storedPassword) setPassword(storedPassword);
        if (storedToken) setToken(storedToken);
    }, []);

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleRequestCode = async () => {
        setError('');
        setSuccess('');
        
        if (!username.trim()) {
            setError(t('pleaseEnterCredentials') || 'Please enter username');
            return;
        }

        setIsRequesting(true);
        
        try {
            const response = await requestTwoFactorAuthAPI(username, language);
            setToken(response.token);
            sessionStorage.setItem('2fa_token', response.token);
            setSuccess(t('twoFactorCodeSent') || 'Two-factor authentication code has been sent to your email');
            setCountdown(60); // 60 seconds cooldown
        } catch (error: any) {
            setError(error.message || t('twoFactorAuthRequestFailed') || 'Failed to request two-factor authentication code');
        } finally {
            setIsRequesting(false);
        }
    };

    const handleVerify = async () => {
        setError('');
        setSuccess('');
        
        if (!code.trim() || code.length !== 6) {
            setError(t('pleaseEnter2FACode') || 'Please enter the 6-digit two-factor authentication code');
            return;
        }

        setIsLoading(true);
        
        try {
            const response = await verifyTwoFactorAuthAPI({
                username,
                password,
                code: code.trim(),
                token: token || undefined,
            });
            
            // Get full user data
            const userData = await getCurrentUserAPI();
            
            // Check if user has an active subscription
            const hasActiveSubscription = userData.company?.subscription?.is_active === true;
            const subId = userData.company?.subscription?.id;
            
            if (!hasActiveSubscription) {
                // Clear tokens and session storage
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                sessionStorage.removeItem('2fa_username');
                sessionStorage.removeItem('2fa_password');
                sessionStorage.removeItem('2fa_token');
                
                // Store subscription ID for payment link (set it even if we need to show error)
                if (subId) {
                    setSubscriptionId(subId);
                    // Set a flag error that will trigger the link display
                    setError('SUBSCRIPTION_INACTIVE');
                } else {
                    // No subscription ID available, show plain error
                    setError(t('noActiveSubscription'));
                }
                setIsLoading(false);
                return;
            }
            
            // Convert user data from API to Frontend format
            const frontendUser = {
                id: userData.id,
                name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
                username: userData.username,
                email: userData.email,
                role: userData.role === 'admin' ? 'Owner' : 'Employee',
                phone: userData.phone || '',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`,
                company: userData.company ? {
                    id: typeof userData.company === 'object' ? userData.company.id : userData.company,
                    name: userData.company_name || (typeof userData.company === 'object' ? userData.company.name : 'Unknown Company'),
                    domain: userData.company_domain || (typeof userData.company === 'object' ? userData.company.domain : undefined),
                    specialization: (userData.company_specialization || (typeof userData.company === 'object' ? userData.company.specialization : 'real_estate')) as 'real_estate' | 'services' | 'products',
                } : undefined,
            };
            
            // Clear session storage
            sessionStorage.removeItem('2fa_username');
            sessionStorage.removeItem('2fa_password');
            sessionStorage.removeItem('2fa_token');
            
            // Clear old user data before setting new user
            localStorage.removeItem('currentUser');
            
            // Save tokens and user data to localStorage first
            localStorage.setItem('currentUser', JSON.stringify(frontendUser));
            localStorage.setItem('isLoggedIn', 'true');
            
            setCurrentUser(frontendUser);
            setIsLoggedIn(true);
            
            // If company has domain, redirect to subdomain with tokens in URL
            // localStorage is not shared between different subdomains, so we need to pass data via URL
            if (frontendUser.company?.domain) {
                const accessToken = localStorage.getItem('accessToken');
                const refreshToken = localStorage.getItem('refreshToken');
                
                // Encode tokens and user data to pass via URL
                const authData = {
                    access: accessToken,
                    refresh: refreshToken,
                    user: frontendUser
                };
                
                // Use sessionStorage to temporarily store data (it's cleared on redirect but we'll use URL params)
                // Actually, we'll use URL hash to pass the data securely
                const encodedData = btoa(JSON.stringify(authData));
                const subdomainUrl = getCompanySubdomainUrl(frontendUser.company.domain, 'Dashboard');
                const redirectUrl = `${subdomainUrl}?auth=${encodeURIComponent(encodedData)}`;
                
                console.log('🔄 Redirecting to company subdomain after login:', redirectUrl);
                // Use window.location.replace to avoid back button issues
                window.location.replace(redirectUrl);
            } else {
                // Wait a bit before navigating to ensure state is updated
                setTimeout(() => {
                    navigateToCompanyRoute(frontendUser.company?.name, frontendUser.company?.domain, 'Dashboard');
                    setCurrentPage('Dashboard');
                }, 100);
            }
        } catch (error: any) {
            const errorMessage = error.message || '';
            // Check if it's a subscription inactive error
            if (error.code === 'SUBSCRIPTION_INACTIVE' || errorMessage === 'SUBSCRIPTION_INACTIVE') {
                const subId = error.subscriptionId || localStorage.getItem('pendingSubscriptionId');
                if (subId) {
                    setSubscriptionId(parseInt(subId));
                    setError('SUBSCRIPTION_INACTIVE');
                } else {
                    setError(t('noActiveSubscription'));
                }
            } else if (errorMessage.includes('expired')) {
                setError(t('twoFactorCodeExpired') || 'Two-factor authentication code has expired. Please request a new one');
            } else if (errorMessage.includes('Invalid') || errorMessage.includes('invalid')) {
                setError(t('twoFactorCodeInvalid') || 'Invalid two-factor authentication code');
            } else {
                setError(errorMessage || t('twoFactorAuthFailed') || 'Failed to verify two-factor authentication code');
            }
            setIsLoading(false);
        }
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(value);
        setError('');
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
                    <h2 className="text-4xl font-bold">{t('twoFactorAuthTitle')}</h2>
                    <p className="mt-2 text-primary-200 max-w-md">
                        {t('twoFactorAuthDescription')}
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
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">{t('twoFactorAuthTitle')}</h2>
                        <p className="mt-2 text-center text-sm text-secondary">
                            {t('enter2FACode')}
                        </p>
                    </div>
                    <div className="space-y-6">
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
                        {success && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 px-4 py-3 rounded-md text-sm">
                                {success}
                            </div>
                        )}
                        <div>
                            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('twoFactorCodeLabel')}
                            </label>
                            <Input 
                                id="code" 
                                type="text"
                                inputMode="numeric"
                                placeholder={t('twoFactorCodePlaceholder')}
                                value={code}
                                onChange={handleCodeChange}
                                className="text-center text-2xl tracking-widest font-mono"
                                maxLength={6}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && code.length === 6) {
                                        handleVerify();
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <Button 
                                onClick={handleVerify} 
                                className="w-full" 
                                loading={isLoading} 
                                disabled={isLoading || code.length !== 6}
                            >
                                {t('verify')}
                            </Button>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-sm text-secondary">
                                {t('didntReceiveCode')}{' '}
                                <button
                                    onClick={handleRequestCode}
                                    disabled={isRequesting || countdown > 0}
                                    className="text-primary-600 dark:text-primary-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {countdown > 0 
                                        ? (language === 'ar' 
                                            ? `إعادة الإرسال (${countdown} ثانية)`
                                            : `Resend Code (${countdown} seconds)`)
                                        : t('resendCode')
                                    }
                                </button>
                            </p>
                            <p className="text-sm text-secondary">
                                <button
                                    onClick={() => {
                                        sessionStorage.removeItem('2fa_username');
                                        sessionStorage.removeItem('2fa_password');
                                        sessionStorage.removeItem('2fa_token');
                                        window.location.href = '/';
                                    }}
                                    className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                                >
                                    {t('backToLogin')}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

