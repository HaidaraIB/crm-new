
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal, Button, Input } from '../index';
import { verifyEmailAPI, getCurrentUserAPI, resendVerificationCodeAPI, changeEmailAPI } from '../../services/api';

type EmailVerificationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    onVerificationSuccess?: () => void;
    allowEmailChange?: boolean;
    onEmailChange?: (newEmail: string) => Promise<void>;
};

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
    isOpen,
    onClose,
    email: initialEmail,
    onVerificationSuccess,
    allowEmailChange = false,
    onEmailChange,
}) => {
    const { t, language, setCurrentUser } = useAppContext();
    const [verificationEmail, setVerificationEmail] = useState(initialEmail);
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationStatus, setVerificationStatus] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
    const [verificationSubmitting, setVerificationSubmitting] = useState(false);
    const [verificationExpiresAt, setVerificationExpiresAt] = useState<string | null>(null);
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(() => {
        // Load cooldown from localStorage on mount
        const stored = localStorage.getItem('emailVerificationCooldown');
        if (stored) {
            const { timestamp, email } = JSON.parse(stored);
            // Check if cooldown is still valid (60 seconds)
            const elapsed = Math.floor((Date.now() - timestamp) / 1000);
            const remaining = Math.max(0, 60 - elapsed);
            // Only use cooldown if it's for the same email
            if (remaining > 0 && email === initialEmail) {
                return remaining;
            } else {
                // Clear expired or different email cooldown
                localStorage.removeItem('emailVerificationCooldown');
            }
        }
        return 0;
    });
    const hasSentCodeRef = React.useRef(false);

    // Track the last email we sent code to, to avoid sending twice for the same email
    const lastSentEmailRef = React.useRef<string | null>(null);

    // Cooldown timer effect
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                const newCooldown = resendCooldown - 1;
                setResendCooldown(newCooldown);
                // Update localStorage with remaining cooldown
                const stored = localStorage.getItem('emailVerificationCooldown');
                if (stored) {
                    const { email } = JSON.parse(stored);
                    if (newCooldown > 0) {
                        localStorage.setItem('emailVerificationCooldown', JSON.stringify({
                            timestamp: Date.now() - (60 - newCooldown) * 1000,
                            email: email
                        }));
                    } else {
                        localStorage.removeItem('emailVerificationCooldown');
                    }
                }
            }, 1000);
            return () => clearTimeout(timer);
        } else if (resendCooldown === 0) {
            // Clear from localStorage when cooldown expires
            localStorage.removeItem('emailVerificationCooldown');
        }
    }, [resendCooldown]);

    useEffect(() => {
        if (isOpen) {
            setVerificationEmail(initialEmail);
            setVerificationCode('');
            setVerificationStatus(null);
            setVerificationExpiresAt(null);
            setIsChangingEmail(false);
            setNewEmail('');
            
            // Load cooldown from localStorage when modal opens
            const stored = localStorage.getItem('emailVerificationCooldown');
            if (stored) {
                try {
                    const { timestamp, email } = JSON.parse(stored);
                    // Check if cooldown is still valid (60 seconds) and for same email
                    if (email === initialEmail) {
                        const elapsed = Math.floor((Date.now() - timestamp) / 1000);
                        const remaining = Math.max(0, 60 - elapsed);
                        setResendCooldown(remaining);
                    } else {
                        // Different email, clear cooldown
                        localStorage.removeItem('emailVerificationCooldown');
                        setResendCooldown(0);
                    }
                } catch (e) {
                    // Invalid data, clear it
                    localStorage.removeItem('emailVerificationCooldown');
                    setResendCooldown(0);
                }
            }
            
            // Only reset hasSentCodeRef if the email changed
            if (lastSentEmailRef.current !== initialEmail) {
                hasSentCodeRef.current = false;
                lastSentEmailRef.current = null;
            }
        } else {
            // Reset when modal closes (but keep cooldown in localStorage)
            hasSentCodeRef.current = false;
            lastSentEmailRef.current = null;
            // Don't reset cooldown - it's stored in localStorage
        }
    }, [isOpen, initialEmail]);

    // Automatically send verification code when modal opens (only once per email and if no cooldown)
    useEffect(() => {
        if (isOpen && initialEmail && !hasSentCodeRef.current && lastSentEmailRef.current !== initialEmail) {
            // Check cooldown from localStorage before sending
            const stored = localStorage.getItem('emailVerificationCooldown');
            if (stored) {
                try {
                    const { timestamp, email: storedEmail } = JSON.parse(stored);
                    if (storedEmail === initialEmail) {
                        const elapsed = Math.floor((Date.now() - timestamp) / 1000);
                        const remaining = Math.max(0, 60 - elapsed);
                        if (remaining > 0) {
                            // Cooldown is still active, don't send automatically
                            setResendCooldown(remaining);
                            return;
                        }
                    }
                } catch (e) {
                    // Invalid data, clear it
                    localStorage.removeItem('emailVerificationCooldown');
                }
            }
            
            hasSentCodeRef.current = true;
            lastSentEmailRef.current = initialEmail;
            const sendCode = async () => {
                setIsResending(true);
                try {
                    const data = await resendVerificationCodeAPI(initialEmail);
                    setVerificationStatus({
                        type: 'info',
                        message: t('verificationCodeSent') || `Verification code has been sent to ${initialEmail}`,
                    });
                    if (data.expires_at) {
                        setVerificationExpiresAt(data.expires_at);
                    }
                    // Set cooldown to 60 seconds (1 minute) after successful send
                    setResendCooldown(60);
                    // Store cooldown in localStorage with timestamp and email
                    localStorage.setItem('emailVerificationCooldown', JSON.stringify({
                        timestamp: Date.now(),
                        email: initialEmail
                    }));
                    
                    // Auto-hide message after 5 seconds
                    setTimeout(() => {
                        setVerificationStatus(null);
                    }, 5000);
                } catch (error: any) {
                    setVerificationStatus({
                        type: 'error',
                        message: error.message || t('resendVerificationFailed') || 'Failed to send verification code. Please try again.',
                    });
                    hasSentCodeRef.current = false; // Reset on error so user can retry
                    lastSentEmailRef.current = null; // Reset on error
                } finally {
                    setIsResending(false);
                }
            };
            sendCode();
        }
    }, [isOpen, initialEmail]);

    const handleSendCode = async (email?: string) => {
        const emailToUse = email || verificationEmail;
        if (!emailToUse) {
            return;
        }

        // Check cooldown from localStorage first (more reliable than state)
        const stored = localStorage.getItem('emailVerificationCooldown');
        if (stored) {
            try {
                const { timestamp, email: storedEmail } = JSON.parse(stored);
                // Check if cooldown is still valid and for same email
                if (storedEmail === emailToUse) {
                    const elapsed = Math.floor((Date.now() - timestamp) / 1000);
                    const remaining = Math.max(0, 60 - elapsed);
                    if (remaining > 0) {
                        // Cooldown is still active, update state and return
                        setResendCooldown(remaining);
                        setVerificationStatus({
                            type: 'error',
                            message: language === 'ar' 
                                ? `يرجى الانتظار ${remaining} ثانية قبل إعادة الإرسال`
                                : `Please wait ${remaining} seconds before resending`,
                        });
                        return;
                    }
                }
            } catch (e) {
                // Invalid data, clear it
                localStorage.removeItem('emailVerificationCooldown');
            }
        }

        // Also check state cooldown as backup
        if (resendCooldown > 0) {
            return;
        }

        setIsResending(true);
        try {
            const data = await resendVerificationCodeAPI(emailToUse);
            hasSentCodeRef.current = true;
            lastSentEmailRef.current = emailToUse;
            
            // Set cooldown to 60 seconds (1 minute) after successful send
            setResendCooldown(60);
            // Store cooldown in localStorage with timestamp and email
            localStorage.setItem('emailVerificationCooldown', JSON.stringify({
                timestamp: Date.now(),
                email: emailToUse
            }));
            
            setVerificationStatus({
                type: 'info',
                message: t('verificationCodeSent') || `Verification code has been sent to ${emailToUse}`,
            });
            if (data.expires_at) {
                setVerificationExpiresAt(data.expires_at);
            }
            // Auto-hide message after 5 seconds
            setTimeout(() => {
                setVerificationStatus(null);
            }, 5000);
        } catch (error: any) {
            setVerificationStatus({
                type: 'error',
                message: error.message || t('resendVerificationFailed') || 'Failed to send verification code. Please try again.',
            });
        } finally {
            setIsResending(false);
        }
    };

    const handleResendCode = async () => {
        await handleSendCode(verificationEmail);
    };

    const handleVerifyEmail = async () => {
        if (!verificationEmail) {
            setVerificationStatus({
                type: 'error',
                message: t('verificationEmailMissing') || 'Email is missing for verification.',
            });
            return;
        }

        if (!verificationCode.trim()) {
            setVerificationStatus({
                type: 'error',
                message: t('verificationCodeRequired') || 'Please enter the verification code sent to your email.',
            });
            return;
        }

        setVerificationSubmitting(true);
        try {
            await verifyEmailAPI({
                email: verificationEmail,
                code: verificationCode.trim(),
            });

            setVerificationStatus({
                type: 'success',
                message: t('verificationSuccess') || 'Email verified successfully!',
            });

            // Refresh user data to get updated email_verified status
            try {
                const userData = await getCurrentUserAPI();
                if (userData) {
                    setCurrentUser({
                        id: userData.id,
                        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role || 'User',
                        phone: userData.phone || '',
                        avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`,
                        company: userData.company,
                        emailVerified: userData.email_verified || userData.is_email_verified || false,
                    });
                }
            } catch (error) {
                console.error('Error refreshing user data:', error);
            }

            setTimeout(() => {
                onClose();
                if (onVerificationSuccess) {
                    onVerificationSuccess();
                }
            }, 1000);
        } catch (error: any) {
            setVerificationStatus({
                type: 'error',
                message: error.message || t('verificationFailed') || 'Verification failed. Please try again.',
            });
        } finally {
            setVerificationSubmitting(false);
        }
    };

    const handleChangeEmail = async () => {
        if (!newEmail.trim()) {
            setVerificationStatus({
                type: 'error',
                message: t('emailRequired') || 'Email is required.',
            });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
            setVerificationStatus({
                type: 'error',
                message: t('invalidEmail') || 'Invalid email format.',
            });
            return;
        }

        try {
            if (onEmailChange) {
                await onEmailChange(newEmail.trim());
            } else {
                // Use default API if no custom handler provided
                await changeEmailAPI(verificationEmail, newEmail.trim());
            }
            setVerificationEmail(newEmail.trim());
            setNewEmail('');
            setIsChangingEmail(false);
            setVerificationStatus({
                type: 'info',
                message: t('emailChangedVerificationSent') || `Email changed. Verification code has been sent to ${newEmail.trim()}`,
            });
        } catch (error: any) {
            setVerificationStatus({
                type: 'error',
                message: error.message || t('emailChangeFailed') || 'Failed to change email. Please try again.',
            });
        }
    };

    const isRTL = language === 'ar';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('verifyEmailTitle') || 'Verify your email'}
            maxWidth="md"
        >
            <div className="space-y-4">
                {!isChangingEmail ? (
                    <>
                        <div>
                            <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('verificationCodeLabel') || 'Verification code'}
                            </label>
                            <Input
                                id="verification-code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder={t('verificationCodePlaceholder') || 'Enter 6-digit code'}
                                maxLength={6}
                            />
                            <div className="mt-2 flex items-center justify-start">
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={verificationSubmitting || isResending || resendCooldown > 0}
                                    className={`text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex items-center gap-1.5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                                >
                                    {isResending ? (
                                        <>
                                            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>{t('resending') || 'Resending...'}</span>
                                        </>
                                    ) : resendCooldown > 0 ? (
                                        <span>
                                            {language === 'ar' 
                                                ? `إعادة الإرسال (${resendCooldown} ثانية)`
                                                : `Resend Code (${resendCooldown}s)`
                                            }
                                        </span>
                                    ) : (
                                        <span>{t('resendCode') || 'Resend Code'}</span>
                                    )}
                                </button>
                            </div>
                        </div>
                        {verificationStatus && (
                            <div
                                className={`text-sm rounded-md px-3 py-2 ${
                                    verificationStatus.type === 'success'
                                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200'
                                        : verificationStatus.type === 'error'
                                        ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200'
                                        : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200'
                                }`}
                            >
                                {verificationStatus.message}
                            </div>
                        )}
                        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button 
                                variant="secondary" 
                                onClick={onClose} 
                                disabled={verificationSubmitting}
                                className="flex-1 whitespace-nowrap"
                            >
                                {t('cancel') || 'Cancel'}
                            </Button>
                            <Button 
                                onClick={handleVerifyEmail} 
                                loading={verificationSubmitting} 
                                disabled={verificationSubmitting}
                                className="flex-1 whitespace-nowrap"
                            >
                                {t('verifyNow') || 'Verify email'}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('changeEmailDescription') || 'Enter your new email address. A verification code will be sent to the new email.'}
                            </p>
                        </div>
                        <div>
                            <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('newEmail') || 'New Email'}
                            </label>
                            <Input
                                id="new-email"
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder={t('enterNewEmail') || 'Enter new email address'}
                            />
                        </div>
                        {verificationStatus && (
                            <div
                                className={`text-sm rounded-md px-3 py-2 ${
                                    verificationStatus.type === 'error'
                                        ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200'
                                        : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200'
                                }`}
                            >
                                {verificationStatus.message}
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsChangingEmail(false);
                                    setNewEmail('');
                                    setVerificationStatus(null);
                                }}
                                className="flex-1 whitespace-nowrap"
                            >
                                {t('cancel') || 'Cancel'}
                            </Button>
                            <Button 
                                onClick={handleChangeEmail}
                                className="flex-1 whitespace-nowrap"
                            >
                                {t('changeEmail') || 'Change Email'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

