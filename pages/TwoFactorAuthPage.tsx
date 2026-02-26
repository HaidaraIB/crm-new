import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Input, MoonIcon, SunIcon } from '../components/index';
import { requestTwoFactorAuthAPI, verifyTwoFactorAuthAPI, getCurrentUserAPI } from '../services/api';

export const TwoFactorAuthPage = () => {
    const { setIsLoggedIn, setCurrentUser, setCurrentPage, t, language, setLanguage, theme, setTheme, isLoggedIn, setIsCompanySubscriptionInactive } = useAppContext();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [countdown, setCountdown] = useState(() => {
        // Load cooldown from localStorage on mount
        const stored = localStorage.getItem('2faResendCooldown');
        if (stored) {
            try {
                const { timestamp, username: storedUsername } = JSON.parse(stored);
                // Check if cooldown is still valid (60 seconds)
                const elapsed = Math.floor((Date.now() - timestamp) / 1000);
                const remaining = Math.max(0, 60 - elapsed);
                // Only use cooldown if it's for the same username
                const currentUsername = sessionStorage.getItem('2fa_username');
                if (remaining > 0 && storedUsername === currentUsername) {
                    return remaining;
                } else {
                    // Clear expired or different username cooldown
                    localStorage.removeItem('2faResendCooldown');
                }
            } catch (e) {
                // Invalid data, clear it
                localStorage.removeItem('2faResendCooldown');
            }
        }
        return 0;
    });
    const [token, setToken] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [subscriptionId, setSubscriptionId] = useState<number | null>(null);

    // Get username and password from sessionStorage (set by LoginPage)
    useEffect(() => {
        const storedUsername = sessionStorage.getItem('2fa_username');
        const storedPassword = sessionStorage.getItem('2fa_password');
        const storedToken = sessionStorage.getItem('2fa_token');
        
        if (storedUsername) {
            setUsername(storedUsername);
            // Load cooldown from localStorage when username is available
            const stored = localStorage.getItem('2faResendCooldown');
            if (stored) {
                try {
                    const { timestamp, username: cooldownUsername } = JSON.parse(stored);
                    // Check if cooldown is still valid (60 seconds) and for same username
                    if (cooldownUsername === storedUsername) {
                        const elapsed = Math.floor((Date.now() - timestamp) / 1000);
                        const remaining = Math.max(0, 60 - elapsed);
                        setCountdown(remaining);
                    } else {
                        // Different username, clear cooldown
                        localStorage.removeItem('2faResendCooldown');
                        setCountdown(0);
                    }
                } catch (e) {
                    // Invalid data, clear it
                    localStorage.removeItem('2faResendCooldown');
                    setCountdown(0);
                }
            }
        }
        if (storedPassword) setPassword(storedPassword);
        if (storedToken) setToken(storedToken);
    }, []);

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                const newCountdown = countdown - 1;
                setCountdown(newCountdown);
                // Update localStorage with remaining cooldown
                const stored = localStorage.getItem('2faResendCooldown');
                if (stored) {
                    try {
                        const { username: storedUsername } = JSON.parse(stored);
                        if (newCountdown > 0) {
                            localStorage.setItem('2faResendCooldown', JSON.stringify({
                                timestamp: Date.now() - (60 - newCountdown) * 1000,
                                username: storedUsername
                            }));
                        } else {
                            localStorage.removeItem('2faResendCooldown');
                        }
                    } catch (e) {
                        localStorage.removeItem('2faResendCooldown');
                    }
                }
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            // Clear from localStorage when cooldown expires
            localStorage.removeItem('2faResendCooldown');
        }
    }, [countdown]);

    const handleRequestCode = async () => {
        setError('');
        setSuccess('');
        
        if (!username.trim()) {
            setError(t('pleaseEnterCredentials') || 'Please enter username');
            return;
        }

        // Check cooldown from localStorage first (more reliable than state)
        const stored = localStorage.getItem('2faResendCooldown');
        if (stored) {
            try {
                const { timestamp, username: storedUsername } = JSON.parse(stored);
                // Check if cooldown is still valid and for same username
                if (storedUsername === username.trim()) {
                    const elapsed = Math.floor((Date.now() - timestamp) / 1000);
                    const remaining = Math.max(0, 60 - elapsed);
                    if (remaining > 0) {
                        // Cooldown is still active, update state and return
                        setCountdown(remaining);
                        setError(language === 'ar' 
                            ? `يرجى الانتظار ${remaining} ثانية قبل إعادة الإرسال`
                            : `Please wait ${remaining} seconds before resending`);
                        return;
                    }
                }
            } catch (e) {
                // Invalid data, clear it
                localStorage.removeItem('2faResendCooldown');
            }
        }

        // Also check state cooldown as backup
        if (countdown > 0) {
            return;
        }

        setIsRequesting(true);
        
        try {
            // Get password from sessionStorage if not in state
            const passwordToUse = password || sessionStorage.getItem('2fa_password') || '';
            if (!passwordToUse) {
                setError(t('passwordRequired') || 'Password is required to resend code');
                setIsRequesting(false);
                return;
            }
            const response = await requestTwoFactorAuthAPI(username, passwordToUse, language);
            setToken(response.token);
            sessionStorage.setItem('2fa_token', response.token);
            setSuccess(t('twoFactorCodeSent') || 'Two-factor authentication code has been sent to your email');
            // Set cooldown to 60 seconds (1 minute) after successful send
            setCountdown(60);
            // Store cooldown in localStorage with timestamp and username
            localStorage.setItem('2faResendCooldown', JSON.stringify({
                timestamp: Date.now(),
                username: username.trim()
            }));
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
            
            // Get tokens from response (API already saves them to localStorage)
            const accessToken = response.access || localStorage.getItem('accessToken');
            const refreshToken = response.refresh || localStorage.getItem('refreshToken');
            
            if (!accessToken || !refreshToken) {
                throw new Error('No tokens received from server');
            }
            
            // Get full user data
            let userData;
            try {
                userData = await getCurrentUserAPI();
            } catch (err: any) {
                // If getCurrentUserAPI fails, try to use response.user if available
                if (response.user) {
                    userData = response.user;
                } else {
                    throw err;
                }
            }
            
            // Note: Subscription check is now done in backend before returning tokens
            // If we reach here, the user has an active subscription or is super admin
            
            // Reset subscription inactive flag since user passed backend check
            setIsCompanySubscriptionInactive(false);
            localStorage.removeItem('isCompanySubscriptionInactive');
            
            // Convert user data from API to Frontend format
            const frontendUser = {
                id: userData.id,
                name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
                username: userData.username,
                email: userData.email,
                role: userData.role === 'admin' ? 'Owner' : userData.role === 'supervisor' ? 'Supervisor' : 'Employee',
                phone: userData.phone || '',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`,
                company: userData.company ? {
                    id: typeof userData.company === 'object' ? userData.company.id : userData.company,
                    name: userData.company_name || (typeof userData.company === 'object' ? userData.company.name : 'Unknown Company'),
                    domain: userData.company_domain || (typeof userData.company === 'object' ? userData.company.domain : undefined),
                    specialization: (userData.company_specialization || (typeof userData.company === 'object' ? userData.company.specialization : 'real_estate')) as 'real_estate' | 'services' | 'products',
                } : undefined,
            };
            
            // Reset subscription inactive flag since user passed backend check
            setIsCompanySubscriptionInactive(false);
            localStorage.removeItem('isCompanySubscriptionInactive');
            
            if (!accessToken || !refreshToken) {
                throw new Error('No tokens received from server');
            }
            
            // Save tokens first
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            
            // Clear session storage and cooldown
            sessionStorage.removeItem('2fa_username');
            sessionStorage.removeItem('2fa_password');
            sessionStorage.removeItem('2fa_token');
            localStorage.removeItem('2faResendCooldown');
            
            // Clear old user data before setting new user
            localStorage.removeItem('currentUser');
            
            // Save user data to localStorage
            localStorage.setItem('currentUser', JSON.stringify(frontendUser));
            localStorage.setItem('isLoggedIn', 'true');
            
            // Update context state immediately BEFORE navigation
            setCurrentUser(frontendUser);
            setIsLoggedIn(true);
            setCurrentPage('Dashboard');
            
            // Use window.location for immediate redirect to ensure state is applied
            window.location.href = '/dashboard';
        } catch (error: any) {
            const errorMessage = error.message || '';
            // Check if it's an account temporarily inactive error (for employees)
            if (error.code === 'ACCOUNT_TEMPORARILY_INACTIVE' || errorMessage === 'ACCOUNT_TEMPORARILY_INACTIVE') {
                setError('ACCOUNT_TEMPORARILY_INACTIVE');
            } 
            // Check if it's a subscription inactive error (for admins)
            else if (error.code === 'SUBSCRIPTION_INACTIVE' || errorMessage === 'SUBSCRIPTION_INACTIVE') {
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

    const handleDigitChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, '').slice(0, 1);
        const newCode = code.split('');
        newCode[index] = digit;
        const updatedCode = newCode.join('').slice(0, 6);
        setCode(updatedCode);
        setError('');

        // Auto-focus next input
        if (digit && index < 5) {
            const nextInput = document.getElementById(`code-input-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`code-input-${index - 1}`);
            prevInput?.focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            const prevInput = document.getElementById(`code-input-${index - 1}`);
            prevInput?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            const nextInput = document.getElementById(`code-input-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData) {
            setCode(pastedData);
            setError('');
            // Focus the next empty input or the last one
            const nextIndex = Math.min(pastedData.length, 5);
            const nextInput = document.getElementById(`code-input-${nextIndex}`);
            nextInput?.focus();
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
                        src="/logo_white.png" 
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
                            src="/logo_purple.png" 
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
                                    {error === 'ACCOUNT_TEMPORARILY_INACTIVE' ? (
                                        t('accountTemporarilyInactive') || 'Your account is temporarily inactive'
                                    ) : error === 'SUBSCRIPTION_INACTIVE' && subscriptionId ? (
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('twoFactorCodeLabel')}
                            </label>
                            {/* حاوية الرمز LTR دائماً: أول خانة يسار، آخر خانة يمين (حتى في العربية) */}
                            <div 
                                className="flex gap-2 justify-center"
                                dir="ltr"
                                onPaste={handlePaste}
                            >
                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                    <input
                                        key={index}
                                        id={`code-input-${index}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={code[index] || ''}
                                        onChange={(e) => handleDigitChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && code.length === 6) {
                                                handleVerify();
                                            }
                                        }}
                                        className="w-14 h-14 text-center text-2xl font-bold font-mono bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                        dir="ltr"
                                        autoFocus={index === 0 && !code}
                                        onFocus={(e) => e.target.setSelectionRange(0, 0)}
                                    />
                                ))}
                            </div>
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

