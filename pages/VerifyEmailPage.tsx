
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, MoonIcon, SunIcon, Input } from '../components/index';
import { AuthHero } from '../components/AuthHero';
import {
    verifyEmailAPI,
    getCurrentUserAPI,
    preLoginEmailResendAPI,
    preLoginEmailChangeAPI,
} from '../services/api';
import { navigateToCompanyRoute } from '../utils/routing';

const PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY = 'preLoginVerifyEmailResendCooldown';
const RESEND_COOLDOWN_SEC = 60;

function readEmailResendCooldownRemaining(preloginUsername: string | null): number {
    if (!preloginUsername || typeof window === 'undefined') return 0;
    const raw = localStorage.getItem(PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY);
    if (!raw) return 0;
    try {
        const { timestamp, username: storedUser } = JSON.parse(raw) as { timestamp: number; username: string };
        if (storedUser !== preloginUsername) {
            localStorage.removeItem(PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY);
            return 0;
        }
        const elapsed = Math.floor((Date.now() - timestamp) / 1000);
        return Math.max(0, RESEND_COOLDOWN_SEC - elapsed);
    } catch {
        localStorage.removeItem(PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY);
        return 0;
    }
}

export const VerifyEmailPage = () => {
    const { setCurrentPage, t, language, setLanguage, theme, setTheme, isLoggedIn, setCurrentUser, currentUser } =
        useAppContext();
    const [isVerifying, setIsVerifying] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [manualEmail, setManualEmail] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [changeEmailLoading, setChangeEmailLoading] = useState(false);
    const [showChangeEmail, setShowChangeEmail] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);
    const [verifiedForRedirect, setVerifiedForRedirect] = useState(false);
    const hasVerified = useRef(false);
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const preloginUsername = typeof window !== 'undefined' ? sessionStorage.getItem('prelogin_username') : null;
    const preloginPassword = typeof window !== 'undefined' ? sessionStorage.getItem('prelogin_password') : null;
    const canPreLogin = !!(preloginUsername && preloginPassword);

    useEffect(() => {
        if (!canPreLogin) return;
        const remaining = readEmailResendCooldownRemaining(preloginUsername);
        setResendCountdown(remaining);
    }, [canPreLogin, preloginUsername, manualEmail]);

    useEffect(() => {
        if (resendCountdown <= 0) return;
        const timer = setTimeout(() => {
            setResendCountdown((c) => {
                const next = c - 1;
                const raw = localStorage.getItem(PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY);
                if (raw && preloginUsername) {
                    try {
                        const { username: storedUser } = JSON.parse(raw) as { username: string };
                        if (next > 0 && storedUser === preloginUsername) {
                            localStorage.setItem(
                                PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY,
                                JSON.stringify({
                                    timestamp: Date.now() - (RESEND_COOLDOWN_SEC - next) * 1000,
                                    username: storedUser,
                                }),
                            );
                        } else if (next <= 0) {
                            localStorage.removeItem(PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY);
                        }
                    } catch {
                        localStorage.removeItem(PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY);
                    }
                }
                return next;
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [resendCountdown, preloginUsername]);

    const schedulePostVerifyRedirect = useCallback(() => {
        redirectTimeoutRef.current = setTimeout(() => {
            if (isLoggedIn) {
                navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Dashboard');
                setCurrentPage('Dashboard');
            } else {
                sessionStorage.removeItem('prelogin_username');
                sessionStorage.removeItem('prelogin_password');
                window.history.replaceState({}, '', '/login');
                setCurrentPage('Login');
            }
        }, 2000);
    }, [isLoggedIn, currentUser?.company?.name, currentUser?.company?.domain, setCurrentPage]);

    const refreshUserIfLoggedIn = useCallback(async () => {
        if (!isLoggedIn) return;
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
                emailVerified: userData.email_verified || userData.is_email_verified || false,
                company: userData.company
                    ? {
                          id: typeof userData.company === 'object' ? userData.company.id : userData.company,
                          name:
                              userData.company_name ||
                              (typeof userData.company === 'object' ? userData.company.name : 'Unknown Company'),
                          domain:
                              userData.company_domain ||
                              (typeof userData.company === 'object' ? userData.company.domain : undefined),
                          specialization: (typeof userData.company === 'object'
                              ? userData.company.specialization
                              : 'real_estate') as 'real_estate' | 'services' | 'products',
                      }
                    : undefined,
            };
            localStorage.removeItem('currentUser');
            localStorage.setItem('currentUser', JSON.stringify(frontendUser));
            setCurrentUser(frontendUser);
        } catch (err) {
            console.error('Failed to refresh user data:', err);
        }
    }, [isLoggedIn, setCurrentUser]);

    useEffect(() => {
        setCurrentPage('VerifyEmail');
    }, [setCurrentPage]);

    useEffect(() => {
        if (hasVerified.current) {
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get('token');
        const email = urlParams.get('email');

        if (token) {
            try {
                token = decodeURIComponent(token);
            } catch (e) {
                console.warn('Failed to decode token:', e);
            }
        }

        if (email && !token) {
            setManualEmail(email);
            return;
        }

        if (!email || !token) {
            setStatus({
                type: 'error',
                message:
                    t('verificationLinkInvalid') ||
                    'Invalid verification link. Please check your email and try again.',
            });
            return;
        }

        hasVerified.current = true;

        const verifyEmail = async () => {
            setIsVerifying(true);
            try {
                await verifyEmailAPI({ email, token });
                await refreshUserIfLoggedIn();
                sessionStorage.removeItem('prelogin_username');
                sessionStorage.removeItem('prelogin_password');
                localStorage.removeItem(PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY);
                setVerifiedForRedirect(true);
                setStatus({
                    type: 'success',
                    message: t('emailVerifiedSuccessfully') || 'Your email has been verified successfully!',
                });
                schedulePostVerifyRedirect();
            } catch (error: unknown) {
                const err = error as { message?: string; detail?: string; error?: string };
                const errorMessage = err.message || err.detail || err.error || 'Verification failed';
                setStatus({
                    type: 'error',
                    message: errorMessage,
                });
                hasVerified.current = false;
            } finally {
                setIsVerifying(false);
            }
        };

        verifyEmail();

        return () => {
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- URL-driven, run once on mount
    }, []);

    const handleManualVerify = async () => {
        if (!manualEmail) return;
        if (manualCode.trim().length < 4) {
            setStatus({
                type: 'error',
                message: t('verificationCodeRequired') || 'Please enter the verification code from your email.',
            });
            return;
        }
        setIsVerifying(true);
        setStatus(null);
        try {
            await verifyEmailAPI({ email: manualEmail, code: manualCode.trim() });
            await refreshUserIfLoggedIn();
            sessionStorage.removeItem('prelogin_username');
            sessionStorage.removeItem('prelogin_password');
            localStorage.removeItem(PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY);
            setVerifiedForRedirect(true);
            setStatus({
                type: 'success',
                message: t('emailVerifiedSuccessfully') || 'Your email has been verified successfully!',
            });
            schedulePostVerifyRedirect();
        } catch (error: unknown) {
            const err = error as { message?: string; detail?: string; error?: string };
            const errorMessage = err.message || err.detail || err.error || 'Verification failed';
            setStatus({
                type: 'error',
                message: errorMessage,
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePreLoginResend = async () => {
        if (!canPreLogin || !preloginUsername || !preloginPassword) {
            setStatus({ type: 'error', message: t('preLoginCredentialsMissingHint') });
            return;
        }
        const remaining = readEmailResendCooldownRemaining(preloginUsername);
        if (remaining > 0) {
            setResendCountdown(remaining);
            setStatus({
                type: 'error',
                message:
                    language === 'ar'
                        ? `يرجى الانتظار ${remaining} ثانية قبل إعادة الإرسال`
                        : `Please wait ${remaining} seconds before resending`,
            });
            return;
        }
        if (resendCountdown > 0) return;

        setResendLoading(true);
        setStatus(null);
        try {
            await preLoginEmailResendAPI(preloginUsername, preloginPassword);
            setResendCountdown(RESEND_COOLDOWN_SEC);
            localStorage.setItem(
                PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY,
                JSON.stringify({ timestamp: Date.now(), username: preloginUsername }),
            );
            setStatus({ type: 'success', message: t('preLoginVerificationEmailResent') });
        } catch (error: unknown) {
            const err = error as { message?: string };
            setStatus({ type: 'error', message: err.message || 'Failed to resend' });
        } finally {
            setResendLoading(false);
        }
    };

    const handlePreLoginChangeEmail = async () => {
        if (!canPreLogin || !preloginUsername || !preloginPassword) {
            setStatus({ type: 'error', message: t('preLoginCredentialsMissingHint') });
            return;
        }
        const trimmed = newEmail.trim().toLowerCase();
        if (!trimmed || !trimmed.includes('@')) {
            setStatus({ type: 'error', message: t('pleaseEnterCredentials') });
            return;
        }
        setChangeEmailLoading(true);
        setStatus(null);
        try {
            await preLoginEmailChangeAPI(preloginUsername, preloginPassword, trimmed);
            setManualEmail(trimmed);
            setManualCode('');
            setNewEmail('');
            setShowChangeEmail(false);
            const params = new URLSearchParams(window.location.search);
            params.set('email', trimmed);
            params.delete('token');
            window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
            localStorage.removeItem(PRE_LOGIN_EMAIL_RESEND_COOLDOWN_KEY);
            setResendCountdown(0);
            setStatus({ type: 'success', message: t('preLoginEmailUpdated') });
        } catch (error: unknown) {
            const err = error as { message?: string };
            setStatus({ type: 'error', message: err.message || 'Failed to update email' });
        } finally {
            setChangeEmailLoading(false);
        }
    };

    const finishRedirect = () => {
        if (redirectTimeoutRef.current) {
            clearTimeout(redirectTimeoutRef.current);
            redirectTimeoutRef.current = null;
        }
        if (isLoggedIn) {
            navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Dashboard');
            setCurrentPage('Dashboard');
        } else {
            sessionStorage.removeItem('prelogin_username');
            sessionStorage.removeItem('prelogin_password');
            window.history.replaceState({}, '', '/login');
            setCurrentPage('Login');
        }
    };

    return (
        <div className={`min-h-screen flex ${language === 'ar' ? 'font-arabic' : 'font-sans'} relative`}>
            <div className={`absolute top-4 z-10 flex gap-2 ${language === 'ar' ? 'left-4' : 'right-4'}`}>
                <button
                    type="button"
                    onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
                >
                    <span className="font-bold text-sm">{language === 'ar' ? 'EN' : 'AR'}</span>
                </button>
                <Button variant="ghost" className="p-2 h-auto" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                </Button>
            </div>

            <AuthHero />
            <div className="w-full lg:w-1/2 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-6 md:p-8 min-h-screen">
                <div className="max-w-md w-full space-y-6">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 md:p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold text-primary">{t('verifyEmailTitle')}</h1>
                            <p className="text-sm text-secondary">
                                {manualEmail
                                    ? t('verifyEmailManualIntro')
                                    : t('verifyingEmail') || 'Verifying your email address...'}
                            </p>
                        </div>

                        {manualEmail && !canPreLogin ? (
                            <p className="text-sm text-secondary text-center leading-relaxed">{t('preLoginCredentialsMissingHint')}</p>
                        ) : null}

                        {manualEmail && canPreLogin ? (
                            <div className="space-y-3 border-t border-gray-200 dark:border-gray-600 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => setShowChangeEmail((v) => !v)}
                                >
                                    {t('preLoginChangeEmailTitle')}
                                </Button>
                                {showChangeEmail ? (
                                    <div className="space-y-2">
                                        <Input
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            placeholder={t('preLoginNewEmailPlaceholder')}
                                            type="email"
                                            autoComplete="email"
                                        />
                                        <Button
                                            type="button"
                                            className="w-full"
                                            loading={changeEmailLoading}
                                            disabled={changeEmailLoading || resendLoading}
                                            onClick={handlePreLoginChangeEmail}
                                        >
                                            {t('preLoginSubmitChangeEmail')}
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {manualEmail ? (
                            <div className="space-y-4">
                                <p className="text-sm text-center text-secondary">{t('verifyEmailManualHint')}</p>
                                <Input
                                    value={manualCode}
                                    onChange={(e) => {
                                        setManualCode(e.target.value);
                                        setStatus(null);
                                    }}
                                    placeholder={t('verificationCodePlaceholder') || '6-digit code'}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleManualVerify();
                                        }
                                    }}
                                />
                                {canPreLogin ? (
                                    <div className="text-start mt-1.5">
                                        <button
                                            type="button"
                                            onClick={handlePreLoginResend}
                                            disabled={resendLoading || resendCountdown > 0}
                                            className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                                        >
                                            {resendCountdown > 0
                                                ? t('resendEmailCountdown').replace('{countdown}', String(resendCountdown))
                                                : t('resendEmail')}
                                        </button>
                                    </div>
                                ) : null}
                                <Button
                                    onClick={handleManualVerify}
                                    className="w-full"
                                    loading={isVerifying}
                                    disabled={isVerifying}
                                >
                                    {t('verify')}
                                </Button>
                            </div>
                        ) : null}

                        {!manualEmail && isVerifying ? (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
                                <p className="mt-4 text-secondary">{t('verifying')}</p>
                            </div>
                        ) : null}

                        {status && (!isVerifying || manualEmail) ? (
                            <div
                                className={`p-4 rounded-lg ${
                                    status.type === 'success'
                                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                }`}
                            >
                                <p
                                    className={`text-sm ${
                                        status.type === 'success'
                                            ? 'text-green-800 dark:text-green-200'
                                            : 'text-red-800 dark:text-red-200'
                                    }`}
                                >
                                    {status.message}
                                </p>
                            </div>
                        ) : null}

                        {status?.type === 'success' && verifiedForRedirect ? (
                            <Button onClick={finishRedirect} className="w-full">
                                {isLoggedIn ? t('goToDashboard') : t('goToLogin')}
                            </Button>
                        ) : null}

                        {status?.type === 'error' && !manualEmail ? (
                            <div className="text-center space-y-4">
                                <Button onClick={finishRedirect} className="w-full">
                                    {isLoggedIn ? t('goToDashboard') : t('goToLogin')}
                                </Button>
                                <p className="text-sm text-secondary">{t('verificationHelpText')}</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};
