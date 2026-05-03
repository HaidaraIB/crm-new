
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, MoonIcon, SunIcon, Input } from '../components/index';
import { AuthHero } from '../components/AuthHero';
import {
    getCurrentUserAPI,
    preLoginPhoneSendOtpAPI,
    preLoginPhoneVerifyOtpAPI,
    preLoginPhoneChangeAPI,
} from '../services/api';
import { navigateToCompanyRoute } from '../utils/routing';

const PRE_LOGIN_PHONE_RESEND_COOLDOWN_KEY = 'preLoginVerifyPhoneResendCooldown';
const PHONE_RESEND_COOLDOWN_SEC = 60;

function readPhoneResendCooldownRemaining(preloginUsername: string | null): number {
    if (!preloginUsername || typeof window === 'undefined') return 0;
    const raw = localStorage.getItem(PRE_LOGIN_PHONE_RESEND_COOLDOWN_KEY);
    if (!raw) return 0;
    try {
        const { timestamp, username: storedUser } = JSON.parse(raw) as { timestamp: number; username: string };
        if (storedUser !== preloginUsername) {
            localStorage.removeItem(PRE_LOGIN_PHONE_RESEND_COOLDOWN_KEY);
            return 0;
        }
        const elapsed = Math.floor((Date.now() - timestamp) / 1000);
        return Math.max(0, PHONE_RESEND_COOLDOWN_SEC - elapsed);
    } catch {
        localStorage.removeItem(PRE_LOGIN_PHONE_RESEND_COOLDOWN_KEY);
        return 0;
    }
}

export const VerifyPhonePage = () => {
    const { setCurrentPage, t, language, setLanguage, theme, setTheme, isLoggedIn, setCurrentUser, currentUser } =
        useAppContext();
    const [code, setCode] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [otpChannel, setOtpChannel] = useState<string | null>(null);
    const [sendLoading, setSendLoading] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [changePhoneLoading, setChangePhoneLoading] = useState(false);
    const [showChangePhone, setShowChangePhone] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [verifiedOk, setVerifiedOk] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const preloginUsername = typeof window !== 'undefined' ? sessionStorage.getItem('prelogin_username') : null;
    const preloginPassword = typeof window !== 'undefined' ? sessionStorage.getItem('prelogin_password') : null;
    const canPreLogin = !!(preloginUsername && preloginPassword);

    useEffect(() => {
        if (!canPreLogin) return;
        const remaining = readPhoneResendCooldownRemaining(preloginUsername);
        setResendCountdown(remaining);
    }, [canPreLogin, preloginUsername]);

    useEffect(() => {
        if (resendCountdown <= 0) return;
        const timer = setTimeout(() => {
            setResendCountdown((c) => {
                const next = c - 1;
                const raw = localStorage.getItem(PRE_LOGIN_PHONE_RESEND_COOLDOWN_KEY);
                if (raw && preloginUsername) {
                    try {
                        const { username: storedUser } = JSON.parse(raw) as { username: string };
                        if (next > 0 && storedUser === preloginUsername) {
                            localStorage.setItem(
                                PRE_LOGIN_PHONE_RESEND_COOLDOWN_KEY,
                                JSON.stringify({
                                    timestamp: Date.now() - (PHONE_RESEND_COOLDOWN_SEC - next) * 1000,
                                    username: storedUser,
                                }),
                            );
                        } else if (next <= 0) {
                            localStorage.removeItem(PRE_LOGIN_PHONE_RESEND_COOLDOWN_KEY);
                        }
                    } catch {
                        localStorage.removeItem(PRE_LOGIN_PHONE_RESEND_COOLDOWN_KEY);
                    }
                }
                return next;
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [resendCountdown, preloginUsername]);

    const phoneHint = useMemo(() => {
        if (!otpChannel) return t('preLoginVerifyPhoneIntro');
        if (otpChannel === 'twilio_sms') return t('verifyPhoneSmsHint');
        return t('verifyPhoneWhatsAppHint');
    }, [otpChannel, t]);

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
        setCurrentPage('VerifyPhone');
    }, [setCurrentPage]);

    useEffect(() => {
        return () => {
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
            }
        };
    }, []);

    const handleSendCode = async () => {
        if (!canPreLogin || !preloginUsername || !preloginPassword) {
            setStatus({ type: 'error', message: t('preLoginCredentialsMissingHint') });
            return;
        }
        const remaining = readPhoneResendCooldownRemaining(preloginUsername);
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

        setSendLoading(true);
        setStatus(null);
        try {
            const data = (await preLoginPhoneSendOtpAPI(preloginUsername, preloginPassword)) as {
                channel?: string;
            };
            setOtpChannel(typeof data?.channel === 'string' ? data.channel : null);
            setResendCountdown(PHONE_RESEND_COOLDOWN_SEC);
            localStorage.setItem(
                PRE_LOGIN_PHONE_RESEND_COOLDOWN_KEY,
                JSON.stringify({ timestamp: Date.now(), username: preloginUsername }),
            );
            setStatus({ type: 'success', message: t('preLoginPhoneCodeSent') });
        } catch (error: unknown) {
            const err = error as { message?: string };
            setStatus({ type: 'error', message: err.message || 'Failed to send code' });
        } finally {
            setSendLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!canPreLogin || !preloginUsername || !preloginPassword) {
            setStatus({ type: 'error', message: t('preLoginCredentialsMissingHint') });
            return;
        }
        const trimmed = code.trim().replace(/\s/g, '');
        if (trimmed.length < 4) {
            setStatus({ type: 'error', message: t('verificationCodeRequired') });
            return;
        }
        setVerifyLoading(true);
        setStatus(null);
        try {
            await preLoginPhoneVerifyOtpAPI(preloginUsername, preloginPassword, trimmed);
            await refreshUserIfLoggedIn();
            sessionStorage.removeItem('prelogin_username');
            sessionStorage.removeItem('prelogin_password');
            localStorage.removeItem(PRE_LOGIN_PHONE_RESEND_COOLDOWN_KEY);
            setResendCountdown(0);
            setVerifiedOk(true);
            setStatus({
                type: 'success',
                message: t('phoneVerifiedSuccessfully'),
            });
            schedulePostVerifyRedirect();
        } catch (error: unknown) {
            const err = error as { message?: string };
            setStatus({ type: 'error', message: err.message || 'Verification failed' });
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleChangePhone = async () => {
        if (!canPreLogin || !preloginUsername || !preloginPassword) {
            setStatus({ type: 'error', message: t('preLoginCredentialsMissingHint') });
            return;
        }
        const digits = newPhone.replace(/\D/g, '');
        if (digits.length < 8) {
            setStatus({ type: 'error', message: t('pleaseEnterCredentials') });
            return;
        }
        setChangePhoneLoading(true);
        setStatus(null);
        try {
            await preLoginPhoneChangeAPI(preloginUsername, preloginPassword, newPhone.trim());
            setCode('');
            setOtpChannel(null);
            setNewPhone('');
            setShowChangePhone(false);
            localStorage.removeItem(PRE_LOGIN_PHONE_RESEND_COOLDOWN_KEY);
            setResendCountdown(0);
            setStatus({ type: 'success', message: t('preLoginPhoneUpdatedHint') });
        } catch (error: unknown) {
            const err = error as { message?: string };
            setStatus({ type: 'error', message: err.message || 'Failed to update phone' });
        } finally {
            setChangePhoneLoading(false);
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
                            <h1 className="text-2xl font-bold text-primary">{t('preLoginVerifyPhoneTitle')}</h1>
                            <p className="text-sm text-secondary">{t('preLoginVerifyPhoneIntro')}</p>
                        </div>

                        {!canPreLogin ? (
                            <p className="text-sm text-secondary text-center leading-relaxed">{t('preLoginCredentialsMissingHint')}</p>
                        ) : null}

                        {canPreLogin ? (
                            <div className="space-y-4 border-t border-gray-200 dark:border-gray-600 pt-4">
                                <Button
                                    type="button"
                                    className="w-full"
                                    loading={sendLoading}
                                    disabled={sendLoading || resendCountdown > 0}
                                    onClick={handleSendCode}
                                >
                                    {t('preLoginSendPhoneCode')}
                                </Button>
                                {otpChannel ? <p className="text-sm text-secondary text-center">{phoneHint}</p> : null}
                                <div>
                                    <label htmlFor="phone-prelogin-otp" className="block text-sm font-medium text-secondary mb-1">
                                        {t('verificationCode')}
                                    </label>
                                    <Input
                                        id="phone-prelogin-otp"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                        placeholder="123456"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') handleVerify();
                                        }}
                                    />
                                    <div className="text-start mt-1.5">
                                        <button
                                            type="button"
                                            onClick={handleSendCode}
                                            disabled={sendLoading || verifyLoading || resendCountdown > 0}
                                            className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                                        >
                                            {resendCountdown > 0
                                                ? t('resendCodeCountdown').replace('{countdown}', String(resendCountdown))
                                                : t('resendCode')}
                                        </button>
                                    </div>
                                </div>
                                <Button type="button" className="w-full" loading={verifyLoading} disabled={verifyLoading} onClick={handleVerify}>
                                    {t('verify')}
                                </Button>
                                <Button type="button" variant="ghost" className="w-full" onClick={() => setShowChangePhone((v) => !v)}>
                                    {t('preLoginChangePhoneTitle')}
                                </Button>
                                {showChangePhone ? (
                                    <div className="space-y-2">
                                        <Input
                                            value={newPhone}
                                            onChange={(e) => setNewPhone(e.target.value)}
                                            placeholder={t('preLoginNewPhonePlaceholder')}
                                            inputMode="tel"
                                            autoComplete="tel"
                                        />
                                        <Button
                                            type="button"
                                            className="w-full"
                                            loading={changePhoneLoading}
                                            disabled={changePhoneLoading}
                                            onClick={handleChangePhone}
                                        >
                                            {t('preLoginSubmitChangePhone')}
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {status ? (
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

                        {verifiedOk ? (
                            <Button onClick={finishRedirect} className="w-full">
                                {isLoggedIn ? t('goToDashboard') : t('goToLogin')}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};
