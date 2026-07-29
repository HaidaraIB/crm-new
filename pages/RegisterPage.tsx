
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { AuthHero } from '../components/AuthHero';
import { Button, Input, PhoneInput, EyeIcon, EyeOffIcon, MoonIcon, SunIcon, LegalLinks, PlanEntitlementsSummary } from '../components/index';
import {
    registerCompanyAPI,
    getPublicPlansAPI,
    checkRegistrationAvailabilityAPI,
    verifyEmailAPI,
    getPhoneOtpRequirementAPI,
    getRegistrationEmailRequirementAPI,
    registerPhoneSendOtpAPI,
    registerPhoneVerifyOtpAPI,
    registerEmailSendOtpAPI,
    registerEmailVerifyOtpAPI,
    type RegistrationPhoneOtpChannel,
} from '../services/api';
import { navigateToCompanyRoute } from '../utils/routing';
import { isRedundantPlanDescription } from '../utils/planEntitlements';
import { withLatinDigits } from '../utils/dateUtils';
import { setPendingSubscriptionId } from '../utils/paymentSession';
import {
    validateEmailField,
    validateUsernameField,
    validatePhoneField,
    validatePasswordField,
    validateConfirmPasswordField,
    validateDomainSlugField,
    requiredTrim,
} from '../utils/formValidation';
import {
    normalizeErrorMessage,
    unwrapApiFieldErrors,
    scrollToFirstFieldError as scrollToFirstFieldErrorUtil,
    buildFieldErrorSummary as buildFieldErrorSummaryUtil,
    translateBackendError as translateBackendErrorUtil,
    mapRegisterBackendErrorsToFields,
} from '../utils/formFieldErrors';

type PublicPlan = {
    id: number;
    name: string;
    name_ar?: string;
    description: string;
    description_ar?: string;
    price_monthly: number;
    price_yearly: number;
    trial_days: number;
    users: string;
    clients: string;
    features?: Record<string, boolean>;
    limits?: Record<string, number | 'unlimited' | null>;
    usage_limits_monthly?: Record<string, number | 'unlimited' | null>;
};

const slugifyDomain = (text: string) =>
    text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export const RegisterPage = () => {
    const { setIsLoggedIn, setCurrentUser, t, language, setLanguage, setCurrentPage, theme, setTheme } = useAppContext();

    // Company information
    const [companyName, setCompanyName] = useState('');
    const [companyDomain, setCompanyDomain] = useState('');
    const [specialization, setSpecialization] = useState<'real_estate' | 'services' | 'products' | 'medical'>('real_estate');

    // Owner information
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Plan selection (optional - can be trial)
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [plans, setPlans] = useState<PublicPlan[]>([]);
    const [plansLoading, setPlansLoading] = useState<boolean>(true);
    const [plansError, setPlansError] = useState<string | null>(null);
    const [stepCheckLoading, setStepCheckLoading] = useState(false);
    const [pendingUserData, setPendingUserData] = useState<any | null>(null);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationStatus, setVerificationStatus] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
    const [verificationSubmitting, setVerificationSubmitting] = useState(false);
    const [verificationExpiresAt, setVerificationExpiresAt] = useState<string | null>(null);

    // UI state
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    
    // Link password visibility - when one changes, update both
    const handlePasswordVisibilityToggle = () => {
        const newValue = !passwordVisible;
        setPasswordVisible(newValue);
        setConfirmPasswordVisible(newValue);
    };
    
    const handleConfirmPasswordVisibilityToggle = () => {
        const newValue = !confirmPasswordVisible;
        setPasswordVisible(newValue);
        setConfirmPasswordVisible(newValue);
    };
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [currentStep, setCurrentStep] = useState(1); // 1: Company, 2: Owner, 3: OTP or Plan, 4: Plan when OTP required
    // Default OFF — only enable after the policy endpoint confirms it (avoids 403 send-otp when disabled).
    const [phoneOtpRequired, setPhoneOtpRequired] = useState(false);
    const [phoneOtpChannel, setPhoneOtpChannel] = useState<RegistrationPhoneOtpChannel | null>(null);
    const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
    const [phoneOtpCode, setPhoneOtpCode] = useState('');
    const [emailOtpCode, setEmailOtpCode] = useState('');
    const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null);
    const [emailVerificationToken, setEmailVerificationToken] = useState<string | null>(null);
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const isNextButtonLoading =
        (stepCheckLoading && (currentStep === 1 || currentStep === 2)) || otpSending;
    const otpStep = 3;
    const anyOtpRequired = phoneOtpRequired || emailVerificationRequired;
    const planStep = anyOtpRequired ? 4 : 3;

    const mapRegisterPhoneOtpSendError = (e: unknown): string => {
        const err = e as Error & { code?: string };
        const code = err.code;
        switch (code) {
            case 'registration_otp_disabled':
                return t('registrationOtpDisabled');
            case 'phone_otp_misconfigured':
            case 'whatsapp_otp_not_configured':
            case 'twilio_otp_not_configured':
                return t('phoneOtpMisconfigured');
            case 'whatsapp_send_failed':
                return t('otpSendFailedWhatsApp');
            case 'twilio_send_failed':
                return t('otpSendFailedSms');
            case 'otp_rate_limited':
                return t('otpRateLimitedUser');
            default:
                if (phoneOtpChannel === 'twilio_sms') {
                    return err.message || t('otpSendFailedSms');
                }
                if (phoneOtpChannel === 'whatsapp') {
                    return err.message || t('otpSendFailedWhatsApp');
                }
                return err.message || t('otpSendFailedGeneric');
        }
    };

    const FIELD_ERROR_DOM_IDS: Record<string, string> = {
        companyName: 'company-name',
        companyDomain: 'company-domain',
        specialization: 'specialization',
        firstName: 'first-name',
        lastName: 'last-name',
        email: 'email',
        username: 'username',
        phone: 'phone',
        password: 'password',
        confirmPassword: 'confirm-password',
        phoneOtp: 'phone-otp',
        emailOtp: 'email-otp',
    };

    const FIELD_ERROR_LABELS: Record<string, string> = {
        companyName: t('companyName') || 'Company Name',
        companyDomain: t('companyDomain') || 'Company Domain',
        firstName: t('firstName') || 'First Name',
        lastName: t('lastName') || 'Last Name',
        email: t('email') || 'Email',
        username: t('username') || 'Username',
        phone: t('phone') || 'Phone',
        password: t('password') || 'Password',
        confirmPassword: t('confirmPassword') || 'Confirm Password',
        plan: t('selectPlan') || 'Plan',
        phoneOtp: t('verificationCodeLabelWhatsApp') || 'Phone verification code',
        emailOtp: t('verificationCodeLabelEmail') || 'Email verification code',
    };

    const scrollToFirstFieldError = (fieldErrors: Record<string, string>) => {
        scrollToFirstFieldErrorUtil(fieldErrors, FIELD_ERROR_DOM_IDS);
    };

    const buildFieldErrorSummary = (fieldErrors: Record<string, string>): string =>
        buildFieldErrorSummaryUtil(fieldErrors, FIELD_ERROR_LABELS, t);

    const translateBackendError = (errorMessage: string, fieldHint?: string): string =>
        translateBackendErrorUtil(errorMessage, t, fieldHint);

    const mapBackendErrorsToFields = (apiFields: any) =>
        mapRegisterBackendErrorsToFields(apiFields, t);

    const getPlanPriceLabel = (plan: PublicPlan) => {
        // Free/trial plans do not have billing cycles (avoid "per month/year" confusion).
        const isFreeOrTrial = Number(plan.price_monthly || 0) <= 0 && Number(plan.price_yearly || 0) <= 0;
        const price = billingCycle === 'monthly' ? Number(plan.price_monthly || 0) : Number(plan.price_yearly || 0);
        if (isFreeOrTrial || !price) {
            return t('free') || 'Free';
        }
        return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', withLatinDigits({
            style: 'currency',
            currency: 'USD',
        })).format(price);
    };

    const selectedPlanDetails = selectedPlan ? plans.find((p) => p.id === selectedPlan) : undefined;
    const isSelectedPlanFreeOrTrial = !!selectedPlanDetails
        && Number(selectedPlanDetails.price_monthly || 0) <= 0
        && Number(selectedPlanDetails.price_yearly || 0) <= 0;
    const clearFieldError = (field: string) => {
        if (errors[field] || errors.general) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                delete newErrors.general;
                return newErrors;
            });
        }
    };

    const handlePhoneChange = (value: string) => {
        setPhone(value);
        clearFieldError('phone');
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
                message: t('verificationSuccess') || 'Email verified successfully! Redirecting you now...',
            });

            const userData = pendingUserData;
            setPendingUserData(null);

            setTimeout(() => {
                setShowVerificationModal(false);
                if (userData) {
                    // Check if payment is required after email verification
                    if (userData.requiresPayment && userData.subscriptionId) {
                        localStorage.setItem('pendingUserData', JSON.stringify(userData));
                        setPendingSubscriptionId(userData.subscriptionId);
                        window.location.href = `/payment?subscription_id=${userData.subscriptionId}`;
                    } else {
                        // No payment required - go to dashboard
                        // Clear old user data before setting new user
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        localStorage.removeItem('isLoggedIn');
                        
                        setCurrentUser(userData);
                        if (userData.language === 'ar' || userData.language === 'en') setLanguage(userData.language);
                        setIsLoggedIn(true);
                        
                        // Navigate to dashboard
                        setTimeout(() => {
                            navigateToCompanyRoute(userData.company?.name, userData.company?.domain, 'Dashboard');
                            setCurrentPage('Dashboard');
                        }, 200);
                    }
                } else {
                    window.location.href = '/';
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

    const handleSkipVerification = () => {
        setShowVerificationModal(false);
        if (pendingUserData) {
            // Check if payment is required after skipping verification
            if (pendingUserData.requiresPayment && pendingUserData.subscriptionId) {
                localStorage.setItem('pendingUserData', JSON.stringify(pendingUserData));
                setPendingSubscriptionId(pendingUserData.subscriptionId);
                window.location.href = `/payment?subscription_id=${pendingUserData.subscriptionId}`;
            } else {
                // No payment required - go to dashboard
                setCurrentUser(pendingUserData);
                if (pendingUserData.language === 'ar' || pendingUserData.language === 'en') setLanguage(pendingUserData.language);
                setIsLoggedIn(true);
                navigateToCompanyRoute(pendingUserData.company?.name, pendingUserData.company?.domain, 'Dashboard');
                setCurrentPage('Dashboard');
            }
            setPendingUserData(null);
        }
    };


    const handlePlanSelect = (planId: number) => {
        setSelectedPlan(planId);
        clearFieldError('plan');
    };

    const checkAvailability = async (fields: {
        company_domain?: string;
        email?: string;
        username?: string;
        phone?: string;
    }) => {
        setStepCheckLoading(true);
        try {
            await checkRegistrationAvailabilityAPI(fields);
            return true;
        } catch (error: any) {
            const backendErrors = unwrapApiFieldErrors(error.fields || {});
            const fieldErrors: { [key: string]: string } = {};

            const apiToUi: Array<{ api: string; ui: string; checked?: string }> = [
                { api: 'company_domain', ui: 'companyDomain', checked: fields.company_domain },
                { api: 'email', ui: 'email', checked: fields.email },
                { api: 'username', ui: 'username', checked: fields.username },
                { api: 'phone', ui: 'phone', checked: fields.phone },
            ];

            apiToUi.forEach(({ api, ui }) => {
                if (backendErrors[api]) {
                    fieldErrors[ui] = translateBackendError(normalizeErrorMessage(backendErrors[api]), api);
                }
            });

            // Fallback: generic "Not available" with no field payload
            if (Object.keys(fieldErrors).length === 0) {
                const msg = String(error.message || '').toLowerCase();
                const looksUnavailable =
                    msg.includes('not available') ||
                    msg.includes('already exist') ||
                    msg.includes('unavailable') ||
                    msg.includes('availability');
                const checkedFields = apiToUi.filter(({ checked }) => !!checked);
                if (looksUnavailable && checkedFields.length === 1) {
                    const only = checkedFields[0];
                    fieldErrors[only.ui] = translateBackendError(
                        error.message || 'already exists',
                        only.api
                    );
                } else if (looksUnavailable && checkedFields.length > 1) {
                    setErrors((prev) => ({
                        ...prev,
                        general:
                            t('registrationDetailsUnavailable') ||
                            'One or more of these details (email, username, or phone) is already registered. Please change them and try again.',
                    }));
                    return false;
                }
            }

            if (Object.keys(fieldErrors).length > 0) {
                setErrors((prev) => ({
                    ...prev,
                    ...fieldErrors,
                    general: buildFieldErrorSummary(fieldErrors),
                }));
                // Defer scroll until React paints the field errors
                requestAnimationFrame(() => scrollToFirstFieldError(fieldErrors));
            } else if (error.message) {
                setErrors((prev) => ({
                    ...prev,
                    general: translateBackendError(error.message),
                }));
            }
            return false;
        } finally {
            setStepCheckLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const loadPlans = async () => {
            setPlansLoading(true);
            setPlansError(null);
            try {
                const data = await getPublicPlansAPI();
                if (isMounted) {
                    const normalizedPlans = (Array.isArray(data) ? data : []).map((plan: any): PublicPlan => ({
                        id: plan.id,
                        name: plan.name || '',
                        name_ar: plan.name_ar || '',
                        description: plan.description || '',
                        description_ar: plan.description_ar || '',
                        price_monthly: Number(plan.price_monthly || 0),
                        price_yearly: Number(plan.price_yearly || 0),
                        trial_days: Number(plan.trial_days || 0),
                        users: plan.users,
                        clients: plan.clients,
                        features: plan.features || {},
                        limits: plan.limits || {},
                        usage_limits_monthly: plan.usage_limits_monthly || {},
                    }));
                    setPlans(normalizedPlans);
                }
            } catch (error: any) {
                if (isMounted) {
                    setPlansError(error.message || t('failedToLoadPlans') || 'Failed to load plans');
                }
            } finally {
                if (isMounted) {
                    setPlansLoading(false);
                }
            }
        };

        loadPlans();
        return () => {
            isMounted = false;
        };
    }, []);

    // Retry plans when arriving on the plan step after a previous failure.
    useEffect(() => {
        if (currentStep !== planStep || !plansError || plansLoading || plans.length > 0) return;
        let cancelled = false;
        (async () => {
            setPlansLoading(true);
            setPlansError(null);
            try {
                const data = await getPublicPlansAPI();
                if (cancelled) return;
                const normalizedPlans = (Array.isArray(data) ? data : []).map((plan: any): PublicPlan => ({
                    id: plan.id,
                    name: plan.name || '',
                    name_ar: plan.name_ar || '',
                    description: plan.description || '',
                    description_ar: plan.description_ar || '',
                    price_monthly: Number(plan.price_monthly || 0),
                    price_yearly: Number(plan.price_yearly || 0),
                    trial_days: Number(plan.trial_days || 0),
                    users: plan.users,
                    clients: plan.clients,
                    features: plan.features || {},
                    limits: plan.limits || {},
                    usage_limits_monthly: plan.usage_limits_monthly || {},
                }));
                setPlans(normalizedPlans);
            } catch (error: any) {
                if (!cancelled) {
                    setPlansError(error.message || t('failedToLoadPlans') || 'Failed to load plans');
                }
            } finally {
                if (!cancelled) setPlansLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [currentStep, planStep]);

    useEffect(() => {
        let isMounted = true;
        const loadPhoneOtpRequirement = async () => {
            try {
                const [data, emailReq] = await Promise.all([
                    getPhoneOtpRequirementAPI(),
                    getRegistrationEmailRequirementAPI(),
                ]);
                if (!isMounted) return;
                const required = !!data.phone_otp_required;
                setPhoneOtpRequired(required);
                setPhoneOtpChannel(
                    required ? data.phone_otp_channel ?? 'whatsapp' : null
                );
                setEmailVerificationRequired(!!emailReq.email_verification_required);
                if (!required) setCurrentStep((prev) => (prev === 4 ? 3 : prev));
            } catch {
                // OTP off unless the server explicitly says otherwise.
                if (!isMounted) return;
                setPhoneOtpRequired(false);
                setPhoneOtpChannel(null);
            }
        };
        loadPhoneOtpRequirement();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!plansLoading && plans.length > 0) {
            setSelectedPlan((prev) => {
                if (prev && plans.some(plan => plan.id === prev)) {
                    return prev;
                }
                return plans[0].id;
            });
        }
    }, [plansLoading, plans]);

    const validateStep1 = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        const companyNameErr = requiredTrim(
            companyName,
            t,
            'companyNameRequired',
            'Company name is required'
        );
        if (companyNameErr) newErrors.companyName = companyNameErr;

        const domainErr = validateDomainSlugField(companyDomain, t);
        if (domainErr) newErrors.companyDomain = domainErr;

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            requestAnimationFrame(() => scrollToFirstFieldError(newErrors));
            return false;
        }
        return true;
    };

    const validateStep2 = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        const firstNameErr = requiredTrim(firstName, t, 'firstNameRequired', 'First name is required');
        if (firstNameErr) newErrors.firstName = firstNameErr;

        const lastNameErr = requiredTrim(lastName, t, 'lastNameRequired', 'Last name is required');
        if (lastNameErr) newErrors.lastName = lastNameErr;

        const emailErr = validateEmailField(email, t);
        if (emailErr) newErrors.email = emailErr;

        const usernameErr = validateUsernameField(username, t);
        if (usernameErr) newErrors.username = usernameErr;

        const phoneErr = validatePhoneField(phone, t);
        if (phoneErr) newErrors.phone = phoneErr;

        const passwordErr = validatePasswordField(password, t);
        if (passwordErr) newErrors.password = passwordErr;

        const confirmErr = validateConfirmPasswordField(password, confirmPassword, t);
        if (confirmErr) newErrors.confirmPassword = confirmErr;

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            requestAnimationFrame(() => scrollToFirstFieldError(newErrors));
            return false;
        }
        return true;
    };

    const resolveOtpPolicy = async (): Promise<{
        phoneRequired: boolean;
        emailRequired: boolean;
        channel: RegistrationPhoneOtpChannel | null;
    }> => {
        try {
            const [data, emailReq] = await Promise.all([
                getPhoneOtpRequirementAPI(),
                getRegistrationEmailRequirementAPI(),
            ]);
            const phoneRequired = data?.phone_otp_required === true;
            const channel = phoneRequired
                ? ((data.phone_otp_channel as RegistrationPhoneOtpChannel | null) ?? 'whatsapp')
                : null;
            const emailRequired = emailReq?.email_verification_required === true;
            setPhoneOtpRequired(phoneRequired);
            setPhoneOtpChannel(channel);
            setEmailVerificationRequired(emailRequired);
            return { phoneRequired, emailRequired, channel };
        } catch {
            // Do not call send-otp when policy cannot be confirmed.
            setPhoneOtpRequired(false);
            setPhoneOtpChannel(null);
            return {
                phoneRequired: false,
                emailRequired: emailVerificationRequired,
                channel: null,
            };
        }
    };

    const handleNext = async () => {
        if (stepCheckLoading) return;

        if (currentStep === 1 && validateStep1()) {
            const domainAvailable = await checkAvailability({ company_domain: companyDomain.trim() });
            if (domainAvailable) {
                setCurrentStep(2);
            }
        } else if (currentStep === 2 && validateStep2()) {
            const ownerAvailable = await checkAvailability({
                email: email.trim(),
                username: username.trim(),
                phone: phone.trim(),
            });
            if (!ownerAvailable) return;

            const { phoneRequired, emailRequired } = await resolveOtpPolicy();

            if (!phoneRequired && !emailRequired) {
                setPhoneVerificationToken(null);
                setPhoneOtpCode('');
                setEmailVerificationToken(null);
                setEmailOtpCode('');
                setCurrentStep(3); // plan step when no OTP
                return;
            }

            setOtpSending(true);
            setErrors((prev) => {
                const next = { ...prev };
                delete next.phoneOtp;
                delete next.emailOtp;
                delete next.general;
                return next;
            });
            try {
                let stillNeedPhone = phoneRequired;
                if (stillNeedPhone) {
                    try {
                        await registerPhoneSendOtpAPI(phone.trim(), language);
                    } catch (e: any) {
                        // Backend says phone OTP is off — skip it and continue.
                        if (e?.code === 'registration_otp_disabled') {
                            stillNeedPhone = false;
                            setPhoneOtpRequired(false);
                            setPhoneOtpChannel(null);
                        } else {
                            throw e;
                        }
                    }
                }
                if (emailRequired) {
                    await registerEmailSendOtpAPI(email.trim(), language);
                }

                setPhoneVerificationToken(null);
                setPhoneOtpCode('');
                setEmailVerificationToken(null);
                setEmailOtpCode('');

                if (!stillNeedPhone && !emailRequired) {
                    setCurrentStep(3); // plan step when no OTP
                } else {
                    setCurrentStep(otpStep);
                }
            } catch (e: any) {
                setErrors((prev) => ({
                    ...prev,
                    general: mapRegisterPhoneOtpSendError(e),
                }));
            } finally {
                setOtpSending(false);
            }
        } else if (currentStep === otpStep) {
            return;
        }
    };

    const handleVerifyPhoneOtp = async () => {
        const phoneCode = phoneOtpCode.trim();
        const emailCode = emailOtpCode.trim();
        const nextErrors: Record<string, string> = {};
        if (phoneOtpRequired && !/^\d{4,8}$/.test(phoneCode)) {
            nextErrors.phoneOtp =
                phoneOtpChannel === 'twilio_sms'
                    ? t('verificationCodeHintSms')
                    : t('verificationCodeHintWhatsApp');
        }
        if (emailVerificationRequired && !/^\d{4,8}$/.test(emailCode)) {
            nextErrors.emailOtp = t('verificationCodeHintEmail') || 'Enter the code from your email.';
        }
        if (Object.keys(nextErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...nextErrors }));
            return;
        }
        setOtpVerifying(true);
        setErrors((prev) => {
            const next = { ...prev };
            delete next.phoneOtp;
            delete next.emailOtp;
            delete next.general;
            return next;
        });
        try {
            if (phoneOtpRequired) {
                const data = await registerPhoneVerifyOtpAPI(phone.trim(), phoneCode, language);
                setPhoneVerificationToken(data.phone_verification_token);
            } else {
                setPhoneVerificationToken(null);
            }
            if (emailVerificationRequired) {
                const data = await registerEmailVerifyOtpAPI(email.trim(), emailCode, language);
                setEmailVerificationToken(data.email_verification_token);
            } else {
                setEmailVerificationToken(null);
            }
            setCurrentStep(planStep);
        } catch (e: any) {
            setErrors((prev) => ({
                ...prev,
                general: e.message || t('verificationFailed') || 'Invalid code. Try again.',
            }));
        } finally {
            setOtpVerifying(false);
        }
    };

    const handleResendPhoneOtp = async () => {
        setOtpSending(true);
        try {
            if (phoneOtpRequired) {
                try {
                    await registerPhoneSendOtpAPI(phone.trim(), language);
                } catch (e: any) {
                    if (e?.code === 'registration_otp_disabled') {
                        setPhoneOtpRequired(false);
                        setPhoneOtpChannel(null);
                        if (!emailVerificationRequired) {
                            setCurrentStep(3);
                        }
                        return;
                    }
                    throw e;
                }
            }
            if (emailVerificationRequired) {
                await registerEmailSendOtpAPI(email.trim(), language);
            }
        } catch (e: any) {
            setErrors((prev) => ({
                ...prev,
                general: mapRegisterPhoneOtpSendError(e),
            }));
        } finally {
            setOtpSending(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            const next = currentStep - 1;
            setCurrentStep(next);
            if (next === 2) {
                setPhoneVerificationToken(null);
                setPhoneOtpCode('');
                setEmailVerificationToken(null);
                setEmailOtpCode('');
            }
        }
    };

    const handleRegister = async () => {
        if (!validateStep2()) {
            setCurrentStep(2);
            return;
        }
        if (phoneOtpRequired && !phoneVerificationToken) {
            const msg =
                phoneOtpChannel === 'twilio_sms'
                    ? t('phoneVerificationRequiredSms')
                    : phoneOtpChannel === 'whatsapp'
                      ? t('phoneVerificationRequiredWhatsApp')
                      : t('phoneVerificationRequiredGeneric');
            setErrors({
                general: msg,
            });
            setCurrentStep(otpStep);
            return;
        }
        if (emailVerificationRequired && !emailVerificationToken) {
            setErrors({
                general: t('emailVerificationRequiredGeneric') || 'Verify your email before completing registration.',
            });
            setCurrentStep(otpStep);
            return;
        }

        if (!selectedPlan) {
            setErrors(prev => ({
                ...prev,
                plan: t('planRequired') || 'Please select a plan to continue',
            }));
            setCurrentStep(planStep);
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const response = await registerCompanyAPI({
                company: {
                    name: companyName,
                    domain: companyDomain,
                    specialization: specialization,
                },
                owner: {
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    username: username,
                    password: password,
                    phone: phone.trim(),
                },
                ...(phoneVerificationToken ? { phone_verification_token: phoneVerificationToken } : {}),
                ...(emailVerificationToken ? { email_verification_token: emailVerificationToken } : {}),
                plan_id: selectedPlan,
                billing_cycle: billingCycle,
            }, language);

            // Clear old user data before registration
            localStorage.removeItem('currentUser');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('pendingUserData');

            const userLang: 'en' | 'ar' | undefined =
                response.user.language === 'ar' || response.user.language === 'en'
                    ? response.user.language
                    : undefined;
            const frontendUser = {
                id: response.user.id,
                name: `${response.user.first_name || ''} ${response.user.last_name || ''}`.trim() || response.user.username,
                username: response.user.username,
                email: response.user.email,
                role: 'Owner' as const,
                phone: response.user.phone || phone.trim(),
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(response.user.username)}&background=random`,
                company: {
                    id: response.company.id,
                    name: response.company.name,
                    domain: response.company.domain || companyDomain,
                    specialization: response.company.specialization as 'real_estate' | 'services' | 'products' | 'medical',
                },
                language: userLang,
            };

            const subscription = response.subscription;
            const subscriptionId = subscription?.id ?? response.subscription_id ?? null;

            const requiresPayment =
                response.requires_payment === true ||
                response.requiresPayment === true ||
                response.requires_payment === 'true';

            // Only go to payment when payment is actually required.
            if (subscriptionId && requiresPayment) {
                const pendingData = {
                    ...frontendUser,
                    requiresPayment: true,
                    subscriptionId,
                    accessToken: response.access,
                    refreshToken: response.refresh,
                };
                localStorage.setItem('pendingUserData', JSON.stringify(pendingData));
                setPendingSubscriptionId(subscriptionId);
                window.location.href = `/payment?subscription_id=${subscriptionId}`;
                return;
            }

            // Free / trial (no payment required) – log in and go to dashboard
            localStorage.setItem('accessToken', response.access);
            localStorage.setItem('refreshToken', response.refresh);
            setCurrentUser(frontendUser);
            if (userLang) setLanguage(userLang);
            setIsLoggedIn(true);
            setTimeout(() => {
                navigateToCompanyRoute(frontendUser.company?.name, frontendUser.company?.domain, 'Dashboard');
                setCurrentPage('Dashboard');
            }, 100);
        } catch (error: any) {
            const backendFieldErrors = mapBackendErrorsToFields(error.fields || {});
            if (Object.keys(backendFieldErrors).length > 0) {
                const withSummary = {
                    ...backendFieldErrors,
                    general:
                        backendFieldErrors.general ||
                        buildFieldErrorSummary(backendFieldErrors),
                };
                setErrors(withSummary);
                if (backendFieldErrors.companyName || backendFieldErrors.companyDomain) {
                    setCurrentStep(1);
                } else if (
                    backendFieldErrors.firstName ||
                    backendFieldErrors.lastName ||
                    backendFieldErrors.email ||
                    backendFieldErrors.username ||
                    backendFieldErrors.password ||
                    backendFieldErrors.confirmPassword ||
                    backendFieldErrors.phone
                ) {
                    setCurrentStep(2);
                } else if (backendFieldErrors.phoneOtp || backendFieldErrors.emailOtp) {
                    setCurrentStep(otpStep);
                } else if (backendFieldErrors.plan) {
                    setCurrentStep(planStep);
                }
                requestAnimationFrame(() => scrollToFirstFieldError(withSummary));
            } else {
                const errorMessage = error.message || t('registrationFailed') || 'Registration failed. Please try again.';
                const translated = translateBackendError(errorMessage);
                setErrors({ general: translated });
                const lower = errorMessage.toLowerCase();
                if (lower.includes('domain')) {
                    setCurrentStep(1);
                } else if (
                    lower.includes('email') ||
                    lower.includes('username') ||
                    lower.includes('phone') ||
                    lower.includes('password')
                ) {
                    setCurrentStep(2);
                } else {
                    setCurrentStep(2);
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className={`min-h-screen flex ${language === 'ar' ? 'font-arabic' : 'font-sans'} relative`}>
                {/* Theme and Language Toggle Buttons */}
                <div className={`absolute top-4 end-4 z-10 flex ${language === 'ar' ? 'gap-4' : 'gap-2'}`}>
                    <button
                        onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                        className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                        aria-label={`Switch to ${language === 'ar' ? 'English' : 'Arabic'}`}
                    >
                        <span className="font-bold text-sm">{language === 'ar' ? 'EN' : 'AR'}</span>
                    </button>
                    <Button variant="ghost" className="p-2 h-auto" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                        {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                    </Button>
                </div>
                <AuthHero />
                <div className="w-full lg:w-1/2 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-md w-full space-y-8">
                        <div className="flex flex-col items-center">
                            <img
                                src="/logo_purple.png"
                                alt="LOOP CRM Logo"
                                className="h-12 w-auto object-contain mb-4 lg:hidden"
                            />
                            <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
                                {t('register') || 'Register'}
                            </h2>
                            <p className="mt-2 text-center text-sm text-secondary">
                                {t('createCompanyAccount') || 'Create your company account'}
                            </p>
                        </div>

                        {/* Progress indicator */}
                        <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                            {[1, 2, ...(anyOtpRequired ? [3, 4] : [3])].map((stepNumber, idx, all) => (
                                <React.Fragment key={stepNumber}>
                                    <div
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                                            currentStep >= stepNumber
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                                        }`}
                                    >
                                        {stepNumber}
                                    </div>
                                    {idx < all.length - 1 && (
                                        <div
                                            className={`flex-1 h-1 max-w-12 sm:max-w-none ${
                                                currentStep >= all[idx + 1]
                                                    ? 'bg-primary-600'
                                                    : 'bg-gray-300 dark:bg-gray-700'
                                            }`}
                                        ></div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {errors.general && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                                {errors.general}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Step 1: Company Information */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-primary">
                                        {t('companyInformation') || 'Company Information'}
                                    </h3>

                                    <div>
                                        <label htmlFor="company-name" className="block text-sm font-medium text-secondary mb-1">
                                            {t('companyName') || 'Company Name'} <span className="text-red-500 dark:text-red-400">*</span>
                                        </label>
                                        <Input
                                            id="company-name"
                                            placeholder={t('enterCompanyName') || 'Enter company name'}
                                            value={companyName}
                                            onChange={(e) => {
                                                setCompanyName(e.target.value);
                                                clearFieldError('companyName');
                                            }}
                                            onBlur={() => {
                                                if (companyName.trim() && !companyDomain.trim()) {
                                                    setCompanyDomain(slugifyDomain(companyName));
                                                }
                                            }}
                                            className={errors.companyName ? 'border-red-500' : ''}
                                        />
                                        {errors.companyName && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-300">{errors.companyName}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="company-domain" className="block text-sm font-medium text-secondary mb-1">
                                            {t('companyDomain') || 'Company Domain'} <span className="text-red-500 dark:text-red-400">*</span>
                                        </label>
                                        <Input
                                            id="company-domain"
                                            placeholder={t('enterCompanyDomain') || 'e.g., mycompany'}
                                            value={companyDomain}
                                            onChange={(e) => {
                                                setCompanyDomain(slugifyDomain(e.target.value));
                                                clearFieldError('companyDomain');
                                            }}
                                            className={errors.companyDomain ? 'border-red-500' : ''}
                                        />
                                        {errors.companyDomain && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-300">{errors.companyDomain}</p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                            {t('domainHint') || 'This will be used as your company identifier'}
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="specialization" className="block text-sm font-medium text-secondary mb-1">
                                            {t('specialization') || 'Specialization'} <span className="text-red-500 dark:text-red-400">*</span>
                                        </label>
                                        <select
                                            id="specialization"
                                            value={specialization}
                                            onChange={(e) =>
                                                setSpecialization(e.target.value as 'real_estate' | 'services' | 'products' | 'medical')
                                            }
                                            dir={language === 'ar' ? 'rtl' : 'ltr'}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                                        >
                                            <option value="real_estate">{t('realEstate') || 'Real Estate'}</option>
                                            <option value="services">{t('services') || 'Services'}</option>
                                            <option value="products">{t('products') || 'Products'}</option>
                                            <option value="medical">{t('medicalServices') || 'Medical services'}</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Owner Information */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-primary">
                                        {t('ownerInformation') || 'Owner Information'}
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="first-name" className="block text-sm font-medium text-secondary mb-1">
                                                {t('firstName') || 'First Name'} <span className="text-red-500 dark:text-red-400">*</span>
                                            </label>
                                            <Input
                                                id="first-name"
                                                placeholder={t('enterFirstName') || 'Enter first name'}
                                                value={firstName}
                                                onChange={(e) => {
                                                    setFirstName(e.target.value);
                                                    clearFieldError('firstName');
                                                }}
                                                className={errors.firstName ? 'border-red-500' : ''}
                                            />
                                            {errors.firstName && (
                                                <p className="mt-1 text-sm text-red-600 dark:text-red-300">{errors.firstName}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="last-name" className="block text-sm font-medium text-secondary mb-1">
                                                {t('lastName') || 'Last Name'} <span className="text-red-500 dark:text-red-400">*</span>
                                            </label>
                                            <Input
                                                id="last-name"
                                                placeholder={t('enterLastName') || 'Enter last name'}
                                                value={lastName}
                                                onChange={(e) => {
                                                    setLastName(e.target.value);
                                                    clearFieldError('lastName');
                                                }}
                                                className={errors.lastName ? 'border-red-500' : ''}
                                            />
                                            {errors.lastName && (
                                                <p className="mt-1 text-sm text-red-600 dark:text-red-300">{errors.lastName}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-secondary mb-1">
                                            {t('email') || 'Email'} <span className="text-red-500 dark:text-red-400">*</span>
                                        </label>
                                        <Input
                                            id="email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder={t('enterEmail') || 'Enter email address'}
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                clearFieldError('email');
                                            }}
                                            className={errors.email ? 'border-red-500' : ''}
                                        />
                                        {errors.email && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-300">{errors.email}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="username" className="block text-sm font-medium text-secondary mb-1">
                                            {t('username') || 'Username'} <span className="text-red-500 dark:text-red-400">*</span>
                                        </label>
                                        <Input
                                            id="username"
                                            name="register-username"
                                            autoComplete="username"
                                            placeholder={t('enterUsername') || 'Enter username'}
                                            value={username}
                                            onChange={(e) => {
                                                setUsername(e.target.value);
                                                clearFieldError('username');
                                            }}
                                            className={errors.username ? 'border-red-500' : ''}
                                        />
                                        {errors.username && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-300">{errors.username}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium text-secondary mb-1">
                                            {t('phone') || 'Phone'} <span className="text-red-500 dark:text-red-400">*</span>
                                        </label>
                                        <PhoneInput
                                            id="phone"
                                            placeholder={t('enterPhone') || 'Enter phone number'}
                                            value={phone}
                                            onChange={handlePhoneChange}
                                            error={!!errors.phone}
                                            defaultCountry="IQ"
                                        />
                                        {errors.phone && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-300">{errors.phone}</p>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <label htmlFor="password" className="block text-sm font-medium text-secondary mb-1">
                                            {t('password')} <span className="text-red-500 dark:text-red-400">*</span>
                                        </label>

                                        <div className="relative">
                                            <Input
                                                id="password"
                                                name="register-password"
                                                type={passwordVisible ? 'text' : 'password'}
                                                autoComplete="new-password"
                                                placeholder={t('enterPassword')}
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    clearFieldError('password');
                                                }}
                                                className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                                            />

                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100"
                                                onClick={handlePasswordVisibilityToggle}
                                            >
                                                {passwordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                            </button>
                                        </div>

                                        <p className="mt-2 text-xs text-secondary">
                                            {t('passwordRequirements')}
                                        </p>

                                        {errors.password && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-300">{errors.password}</p>
                                        )}
                                    </div>


                                    <div className="relative">
                                        <label htmlFor="confirm-password" className="block text-sm font-medium text-secondary mb-1">
                                            {t('confirmPassword')} <span className="text-red-500 dark:text-red-400">*</span>
                                        </label>

                                        <div className="relative">
                                            <Input
                                                id="confirm-password"
                                                name="register-confirm-password"
                                                type={confirmPasswordVisible ? 'text' : 'password'}
                                                autoComplete="new-password"
                                                placeholder={t('confirmPassword')}
                                                value={confirmPassword}
                                                onChange={(e) => {
                                                    setConfirmPassword(e.target.value);
                                                    clearFieldError('confirmPassword');
                                                }}
                                                className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                                            />

                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100"
                                                onClick={handleConfirmPasswordVisibilityToggle}
                                            >
                                                {confirmPasswordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                            </button>
                                        </div>

                                        {errors.confirmPassword && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                                                {errors.confirmPassword}
                                            </p>
                                        )}
                                    </div>

                                </div>
                            )}

                            {/* Step 3: Phone OTP (WhatsApp or SMS) */}
                            {anyOtpRequired && currentStep === otpStep && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-primary">
                                        {phoneOtpRequired
                                            ? (phoneOtpChannel === 'twilio_sms'
                                                ? t('verifyPhoneSms')
                                                : t('verifyPhoneWhatsApp'))
                                            : (t('verifyRegistrationEmail') || 'Verify your email')}
                                    </h3>
                                    <p className="text-sm text-secondary">
                                        {phoneOtpRequired
                                            ? (phoneOtpChannel === 'twilio_sms'
                                                ? t('verifyPhoneSmsHint')
                                                : t('verifyPhoneWhatsAppHint'))
                                            : (t('verifyRegistrationEmailHint') || 'We sent a verification code to your email. Enter it below.')}
                                    </p>
                                    {phoneOtpRequired && (
                                    <div>
                                        <label htmlFor="phone-otp" className="block text-sm font-medium text-secondary mb-1">
                                            {phoneOtpChannel === 'twilio_sms'
                                                ? (t('verificationCodeLabelSms') || 'SMS verification code')
                                                : (t('verificationCodeLabelWhatsApp') || 'WhatsApp verification code')}
                                        </label>
                                        <Input
                                            id="phone-otp"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            placeholder="123456"
                                            value={phoneOtpCode}
                                            onChange={(e) => {
                                                setPhoneOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8));
                                                if (errors.phoneOtp) {
                                                    setErrors((prev) => {
                                                        const next = { ...prev };
                                                        delete next.phoneOtp;
                                                        return next;
                                                    });
                                                }
                                            }}
                                            className={errors.phoneOtp ? 'border-red-500' : ''}
                                        />
                                        {errors.phoneOtp && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-300">{errors.phoneOtp}</p>
                                        )}
                                    </div>
                                    )}
                                    {emailVerificationRequired && (
                                    <div>
                                        <label htmlFor="email-otp" className="block text-sm font-medium text-secondary mb-1">
                                            {t('verificationCodeLabelEmail') || 'Email verification code'}
                                        </label>
                                        <Input
                                            id="email-otp"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            placeholder="123456"
                                            value={emailOtpCode}
                                            onChange={(e) => {
                                                setEmailOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8));
                                                if (errors.emailOtp) {
                                                    setErrors((prev) => {
                                                        const next = { ...prev };
                                                        delete next.emailOtp;
                                                        return next;
                                                    });
                                                }
                                            }}
                                            className={errors.emailOtp ? 'border-red-500' : ''}
                                        />
                                        {errors.emailOtp && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-300">{errors.emailOtp}</p>
                                        )}
                                    </div>
                                    )}
                                    <button
                                        type="button"
                                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                                        onClick={handleResendPhoneOtp}
                                        disabled={otpSending || otpVerifying}
                                    >
                                        {t('resendCode') || 'Resend code'}
                                    </button>
                                </div>
                            )}

                            {/* Step 4: Plan Selection */}
                            {currentStep === planStep && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-primary">
                                        {t('selectPlan') || 'Select a Plan'}
                                    </h3>

                                    {!isSelectedPlanFreeOrTrial && (
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-secondary">
                                                {t('billingCycle') || 'Billing cycle'}
                                            </span>
                                            <div className="inline-flex rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden">
                                                <button
                                                    type="button"
                                                    className={`px-3 py-1 text-sm font-medium transition ${billingCycle === 'monthly'
                                                            ? 'bg-primary-500 text-white'
                                                            : 'text-secondary'
                                                        }`}
                                                    onClick={() => setBillingCycle('monthly')}
                                                >
                                                    {t('monthly') || 'Monthly'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`px-3 py-1 text-sm font-medium transition ${billingCycle === 'yearly'
                                                            ? 'bg-primary-500 text-white'
                                                            : 'text-secondary'
                                                        }`}
                                                    onClick={() => setBillingCycle('yearly')}
                                                >
                                                    {t('yearly') || 'Yearly'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {plansLoading && (
                                            <div className="text-sm text-secondary">
                                                {t('loadingPlans') || 'Loading plans...'}
                                            </div>
                                        )}

                                        {plansError && !plansLoading && (
                                            <div className="space-y-2">
                                                <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-md">
                                                    {plansError}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                                                    onClick={async () => {
                                                        setPlansLoading(true);
                                                        setPlansError(null);
                                                        try {
                                                            const data = await getPublicPlansAPI();
                                                            const normalizedPlans = (Array.isArray(data) ? data : []).map((plan: any): PublicPlan => ({
                                                                id: plan.id,
                                                                name: plan.name || '',
                                                                name_ar: plan.name_ar || '',
                                                                description: plan.description || '',
                                                                description_ar: plan.description_ar || '',
                                                                price_monthly: Number(plan.price_monthly || 0),
                                                                price_yearly: Number(plan.price_yearly || 0),
                                                                trial_days: Number(plan.trial_days || 0),
                                                                users: plan.users,
                                                                clients: plan.clients,
                                                                features: plan.features || {},
                                                                limits: plan.limits || {},
                                                                usage_limits_monthly: plan.usage_limits_monthly || {},
                                                            }));
                                                            setPlans(normalizedPlans);
                                                        } catch (error: any) {
                                                            setPlansError(error.message || t('failedToLoadPlans') || 'Failed to load plans');
                                                        } finally {
                                                            setPlansLoading(false);
                                                        }
                                                    }}
                                                >
                                                    {t('retry') || 'Retry'}
                                                </button>
                                            </div>
                                        )}

                                        {!plansLoading && !plansError && plans.length === 0 && (
                                            <p className="text-sm text-secondary">
                                                {t('noPlansAvailable') || 'No paid plans are published yet. You can continue with the free trial.'}
                                            </p>
                                        )}

                                        {!plansLoading && !plansError && plans.length > 0 && (
                                            <div className="space-y-3">
                                                {plans.map((plan) => {
                                                    const displayName =
                                                        language === 'ar' && plan.name_ar && plan.name_ar.trim()
                                                            ? plan.name_ar
                                                            : plan.name;
                                                    const explicitDesc =
                                                        language === 'ar' && plan.description_ar && plan.description_ar.trim()
                                                            ? plan.description_ar.trim()
                                                            : (plan.description?.trim() || '');
                                                    const resolvedDesc =
                                                        explicitDesc || (t('planDefaultDescription') || 'All CRM essentials included.');
                                                    const showPlanDescription = !isRedundantPlanDescription(displayName, resolvedDesc);
                                                    const isPlanSelected = selectedPlan === plan.id;
                                                    return (
                                                    <button
                                                        type="button"
                                                        key={plan.id}
                                                        aria-pressed={isPlanSelected}
                                                        onClick={() => handlePlanSelect(plan.id)}
                                                        className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${isPlanSelected
                                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex min-w-0 flex-1 items-start gap-2">
                                                                {isPlanSelected && (
                                                                    <div
                                                                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white"
                                                                        aria-hidden
                                                                    >
                                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <h4 className="font-semibold text-primary">
                                                                        {displayName}
                                                                    </h4>
                                                                    {showPlanDescription && (
                                                                        <p className="text-sm text-secondary">
                                                                            {resolvedDesc}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 text-right">
                                                                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                                                    {getPlanPriceLabel(plan)}
                                                                </div>
                                                                {!(Number(plan.price_monthly || 0) <= 0 && Number(plan.price_yearly || 0) <= 0) && (
                                                                    <p className="text-xs text-secondary capitalize">
                                                                        {billingCycle === 'monthly'
                                                                            ? (t('perMonth') || 'per month')
                                                                            : (t('perYear') || 'per year')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <PlanEntitlementsSummary
                                                            users={plan.users}
                                                            clients={plan.clients}
                                                            extra_limits={plan.limits}
                                                            features={plan.features}
                                                            language={language === 'ar' ? 'ar' : 'en'}
                                                            labels={{
                                                                resourceLimitsTitle: t('planSectionResourceLimits') || 'Resource limits',
                                                                featuresTitle: t('planSectionFeatures') || 'Features',
                                                                none: t('planFeaturesNone') || 'None',
                                                            }}
                                                        />
                                                    </button>
                                                );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {errors.plan && (
                                        <p className="text-sm text-red-600 dark:text-red-300">
                                            {errors.plan}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Navigation buttons */}
                            <div className="flex justify-between gap-2 items-center flex-wrap">
                                {currentStep > 1 && (
                                    <Button
                                        variant="secondary"
                                        onClick={handleBack}
                                        disabled={isLoading || otpVerifying || otpSending}
                                    >
                                        {t('back') || 'Back'}
                                    </Button>
                                )}
                                <div className="flex-1" />
                                {(currentStep === 1 || currentStep === 2) && (
                                    <Button
                                        onClick={handleNext}
                                        disabled={isLoading || stepCheckLoading || otpSending}
                                        loading={isNextButtonLoading}
                                    >
                                        {t('next') || 'Next'}
                                    </Button>
                                )}
                                {anyOtpRequired && currentStep === otpStep && (
                                    <Button
                                        onClick={handleVerifyPhoneOtp}
                                        loading={otpVerifying}
                                        disabled={otpSending || otpVerifying}
                                    >
                                        {t('verifyAndContinue') || 'Verify and continue'}
                                    </Button>
                                )}
                                {currentStep === planStep && (
                                    <Button onClick={handleRegister} loading={isLoading} disabled={isLoading}>
                                        {t('register') || 'Register'}
                                    </Button>
                                )}
                            </div>

                            {/* Login link */}
                            <div className="text-center">
                                <p className="text-sm text-secondary">
                                    {t('alreadyHaveAccount') || 'Already have an account?'}{' '}
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
                            {/* Legal Links Footer */}
                            <footer className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-center text-gray-600 dark:text-gray-300 mb-3">
                                    {language === 'ar' 
                                        ? 'بإنشاء حساب، فإنك توافق على'
                                        : 'By creating an account, you agree to our'}
                                </p>
                                <LegalLinks variant="horizontal" size="sm" className="justify-center" />
                            </footer>
                        </div>
                    </div>
                </div>
            </div>
            {showVerificationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-md relative">
                        <button
                            className="absolute top-3 end-3 text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                            onClick={handleSkipVerification}
                            aria-label={t('close') || 'Close'}
                        >
                            ×
                        </button>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold text-primary">
                                    {t('verifyEmailTitle') || 'Verify your email'}
                                </h3>
                                <p className="text-sm text-secondary mt-1">
                                    {t('verifyEmailDescription') ||
                                        'We sent a 6-digit code to your email. Enter it below to activate your account.'}
                                </p>
                            </div>
                            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-lg p-3 text-sm text-primary-900 dark:text-primary-200">
                                <p>
                                    {t('verificationSentTo') || 'Sent to'}{' '}
                                    <span className="font-semibold">{verificationEmail}</span>
                                </p>
                                {verificationExpiresAt && (
                                    <p className="mt-1 text-xs text-primary-700 dark:text-primary-300">
                                        {t('verificationExpiresAt') || 'Code expires at'}{' '}
                                        {new Date(verificationExpiresAt).toLocaleString(undefined, withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' }))}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="verification-code" className="block text-sm font-medium text-secondary mb-1">
                                    {t('verificationCodeLabel') || 'Verification code'}
                                </label>
                                <Input
                                    id="verification-code"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    placeholder={t('verificationCodePlaceholder') || 'Enter 6-digit code'}
                                />
                            </div>
                            {verificationStatus && (
                                <div
                                    className={`text-sm rounded-md px-3 py-2 ${verificationStatus.type === 'success'
                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200'
                                            : verificationStatus.type === 'error'
                                                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200'
                                                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200'
                                        }`}
                                >
                                    {verificationStatus.message}
                                </div>
                            )}
                            <p className="text-xs text-secondary">
                                {t('verifyLaterHint') || 'If you choose "Verify later", you can still finish by clicking the verification link inside your inbox.'}
                            </p>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Button variant="secondary" onClick={handleSkipVerification} disabled={verificationSubmitting}>
                                    {t('verifyLater') || 'Verify later'}
                                </Button>
                                <Button onClick={handleVerifyEmail} loading={verificationSubmitting} disabled={verificationSubmitting}>
                                    {t('verifyNow') || 'Verify email'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

