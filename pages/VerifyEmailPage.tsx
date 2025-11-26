
import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, MoonIcon, SunIcon } from '../components/index';
import { verifyEmailAPI, getCurrentUserAPI } from '../services/api';

export const VerifyEmailPage = () => {
    const { setCurrentPage, t, language, setLanguage, theme, setTheme, isLoggedIn, setCurrentUser } = useAppContext();
    const [isVerifying, setIsVerifying] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const hasVerified = useRef(false);
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Set currentPage to VerifyEmail on mount to ensure routing consistency
    useEffect(() => {
        setCurrentPage('VerifyEmail');
    }, [setCurrentPage]);

    useEffect(() => {
        // Prevent multiple verification attempts
        if (hasVerified.current) {
            return;
        }

        // Get token and email from URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get('token');
        const email = urlParams.get('email');

        // Decode token in case it was URL-encoded
        if (token) {
            try {
                token = decodeURIComponent(token);
            } catch (e) {
                // If decoding fails, use original token
                console.warn('Failed to decode token:', e);
            }
        }

        if (!token || !email) {
            setStatus({
                type: 'error',
                message: t('verificationLinkInvalid') || 'Invalid verification link. Please check your email and try again.'
            });
            return;
        }

        // Mark as verifying to prevent re-runs
        hasVerified.current = true;

        // Automatically verify when component mounts
        const verifyEmail = async () => {
            setIsVerifying(true);
            try {
                await verifyEmailAPI({ email, token });
                
                // If user is logged in, refresh their user data to get updated email_verified status
                if (isLoggedIn) {
                    try {
                        const userData = await getCurrentUserAPI();
                        const frontendUser = {
                            id: userData.id,
                            name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
                            username: userData.username,
                            email: userData.email,
                            role: userData.role === 'admin' ? 'Owner' : 'Employee',
                            phone: userData.phone || '',
                            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`,
                            company: userData.company ? {
                                id: userData.company,
                                name: userData.company_name || 'Unknown Company',
                                specialization: 'real_estate' as const,
                            } : undefined,
                        };
                        setCurrentUser(frontendUser);
                    } catch (err) {
                        console.error('Failed to refresh user data:', err);
                    }
                }
                
                setStatus({
                    type: 'success',
                    message: t('emailVerifiedSuccessfully') || 'Your email has been verified successfully!'
                });
                
                // Redirect based on login status - use a single redirect
                redirectTimeoutRef.current = setTimeout(() => {
                    if (isLoggedIn) {
                        // If logged in, go to dashboard
                        window.history.replaceState({}, '', '/');
                        setCurrentPage('Dashboard');
                    } else {
                        // If logged out, go to login
                        window.history.replaceState({}, '', '/login');
                        setCurrentPage('Login');
                    }
                }, 2000);
            } catch (error: any) {
                const errorMessage = error.message || error.detail || error.error || 'Verification failed';
                setStatus({
                    type: 'error',
                    message: errorMessage
                });
                // Reset the flag on error so user can retry
                hasVerified.current = false;
            } finally {
                setIsVerifying(false);
            }
        };

        verifyEmail();

        // Cleanup function to clear timeout if component unmounts
        return () => {
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
            }
        };
    }, []); // Empty dependency array - only run once on mount

    return (
        <div className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
            <div className="absolute top-4 right-4 flex gap-2">
                <button
                    onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                    className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
                >
                    {language === 'ar' ? 'EN' : 'ع'}
                </button>
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                </button>
            </div>

            <div className="w-full max-w-md p-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {t('verifyEmailTitle') || 'Verify Email'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {t('verifyingEmail') || 'Verifying your email address...'}
                        </p>
                    </div>

                    {isVerifying && (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                            <p className="mt-4 text-gray-600 dark:text-gray-400">
                                {t('verifying') || 'Verifying...'}
                            </p>
                        </div>
                    )}

                    {status && !isVerifying && (
                        <div className={`p-4 rounded-lg mb-4 ${
                            status.type === 'success' 
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}>
                            <p className={`text-sm ${
                                status.type === 'success' 
                                    ? 'text-green-800 dark:text-green-200' 
                                    : 'text-red-800 dark:text-red-200'
                            }`}>
                                {status.message}
                            </p>
                        </div>
                    )}

                    {status?.type === 'success' && (
                        <div className="text-center">
                            <Button
                                onClick={() => {
                                    // Clear any redirect timeout
                                    if (redirectTimeoutRef.current) {
                                        clearTimeout(redirectTimeoutRef.current);
                                        redirectTimeoutRef.current = null;
                                    }
                                    
                                    if (isLoggedIn) {
                                        // Clear URL parameters and navigate to dashboard
                                        window.history.replaceState({}, '', '/');
                                        setCurrentPage('Dashboard');
                                    } else {
                                        // Clear URL parameters and navigate to login
                                        window.history.replaceState({}, '', '/login');
                                        setCurrentPage('Login');
                                    }
                                }}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {isLoggedIn 
                                    ? (t('goToDashboard') || 'Go to Dashboard')
                                    : (t('goToLogin') || 'Go to Login')
                                }
                            </Button>
                        </div>
                    )}

                    {status?.type === 'error' && (
                        <div className="text-center space-y-4">
                            <Button
                                onClick={() => {
                                    if (isLoggedIn) {
                                        // Clear URL parameters and navigate to dashboard
                                        window.history.replaceState({}, '', '/');
                                        setCurrentPage('Dashboard');
                                    } else {
                                        // Clear URL parameters and navigate to login
                                        window.history.replaceState({}, '', '/login');
                                        setCurrentPage('Login');
                                    }
                                }}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {isLoggedIn 
                                    ? (t('goToDashboard') || 'Go to Dashboard')
                                    : (t('goToLogin') || 'Go to Login')
                                }
                            </Button>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('verificationHelpText') || 'If you continue to experience issues, please contact support or request a new verification email.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

