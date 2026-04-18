
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
    registerPhoneSendOtpAPI,
    registerPhoneVerifyOtpAPI,
} from '../services/api';
import { navigateToCompanyRoute } from '../utils/routing';
import { isRedundantPlanDescription } from '../utils/planEntitlements';

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
    const [specialization, setSpecialization] = useState<'real_estate' | 'services' | 'products'>('real_estate');

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
    const [phoneOtpRequired, setPhoneOtpRequired] = useState(true);
    const [phoneOtpCode, setPhoneOtpCode] = useState('');
    const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null);
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const isNextButtonLoading =
        (stepCheckLoading && (currentStep === 1 || currentStep === 2)) || otpSending;
    const otpStep = 3;
    const planStep = phoneOtpRequired ? 4 : 3;

    const normalizeErrorMessage = (value: any): string => {
        if (!value) return '';
        if (Array.isArray(value)) {
            return value[0];
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object') {
            return value.detail || JSON.stringify(value);
        }
        return String(value);
    };

    const mapBackendErrorsToFields = (apiFields: any) => {
        const fieldErrors: { [key: string]: string } = {};
        if (!apiFields || typeof apiFields !== 'object') {
            return fieldErrors;
        }

        const ownerFieldMap: Record<string, string> = {
            first_name: 'firstName',
            last_name: 'lastName',
            email: 'email',
            username: 'username',
            password: 'password',
            phone: 'phone',
        };

        if (apiFields.company) {
            const companyErrors = apiFields.company;
            if (companyErrors.domain) {
                fieldErrors.companyDomain = normalizeErrorMessage(companyErrors.domain);
            }
            if (companyErrors.name) {
                fieldErrors.companyName = normalizeErrorMessage(companyErrors.name);
            }
            if (!fieldErrors.companyDomain && (Array.isArray(companyErrors) || typeof companyErrors === 'string')) {
                const message = normalizeErrorMessage(companyErrors);
                if (!fieldErrors.companyName && message.toLowerCase().includes('name')) {
                    fieldErrors.companyName = message;
                } else {
                    fieldErrors.companyDomain = message;
                }
            }
        }

        if (apiFields.company_domain) {
            fieldErrors.companyDomain = normalizeErrorMessage(apiFields.company_domain);
        }

        if (apiFields.owner && typeof apiFields.owner === 'object') {
            Object.entries(ownerFieldMap).forEach(([apiKey, uiKey]) => {
                if (apiFields.owner[apiKey]) {
                    fieldErrors[uiKey] = normalizeErrorMessage(apiFields.owner[apiKey]);
                }
            });
            if (apiFields.owner.non_field_errors && !fieldErrors.password) {
                fieldErrors.password = normalizeErrorMessage(apiFields.owner.non_field_errors);
            }
            if (!fieldErrors.password && (Array.isArray(apiFields.owner) || typeof apiFields.owner === 'string')) {
                fieldErrors.password = normalizeErrorMessage(apiFields.owner);
            }
        } else if (apiFields.owner) {
            fieldErrors.password = normalizeErrorMessage(apiFields.owner);
        }

        const directMap: Record<string, string> = {
            email: 'email',
            username: 'username',
            password: 'password',
            phone: 'phone',
            first_name: 'firstName',
            last_name: 'lastName',
            domain: 'companyDomain',
            name: 'companyName',
            plan_id: 'plan',
            phone_verification_token: 'phoneOtp',
        };

        Object.entries(directMap).forEach(([apiKey, uiKey]) => {
            if (apiFields[apiKey]) {
                fieldErrors[uiKey] = normalizeErrorMessage(apiFields[apiKey]);
            }
        });

        if (apiFields.non_field_errors) {
            fieldErrors.general = normalizeErrorMessage(apiFields.non_field_errors);
        }

        if (apiFields.phone_verification_token) {
            fieldErrors.phoneOtp = normalizeErrorMessage(apiFields.phone_verification_token);
        }

        return fieldErrors;
    };

    const getPlanPriceLabel = (plan: PublicPlan) => {
        // Free/trial plans do not have billing cycles (avoid "per month/year" confusion).
        const isFreeOrTrial = Number(plan.price_monthly || 0) <= 0 && Number(plan.price_yearly || 0) <= 0;
        const price = billingCycle === 'monthly' ? Number(plan.price_monthly || 0) : Number(plan.price_yearly || 0);
        if (isFreeOrTrial || !price) {
            return t('free') || 'Free';
        }
        return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
    };

    const selectedPlanDetails = selectedPlan ? plans.find((p) => p.id === selectedPlan) : undefined;
    const isSelectedPlanFreeOrTrial = !!selectedPlanDetails
        && Number(selectedPlanDetails.price_monthly || 0) <= 0
        && Number(selectedPlanDetails.price_yearly || 0) <= 0;
    const clearFieldError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
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

    const translateBackendError = (errorMessage: string): string => {
        const lowerMessage = errorMessage.toLowerCase();
        
        // Domain errors
        if (lowerMessage.includes('domain') && (lowerMessage.includes('already exists') || lowerMessage.includes('already exist'))) {
            return t('domainAlreadyExists') || 'Company domain already exists';
        }
        
        // Email errors
        if (lowerMessage.includes('email') && (lowerMessage.includes('already exists') || lowerMessage.includes('already exist'))) {
            return t('emailAlreadyExists') || 'Email already exists';
        }
        
        // Username errors
        if (lowerMessage.includes('username') && (lowerMessage.includes('already exists') || lowerMessage.includes('already exist'))) {
            return t('usernameAlreadyExists') || 'Username already exists';
        }
        
        // Phone errors
        if (lowerMessage.includes('phone') && (lowerMessage.includes('already exists') || lowerMessage.includes('already exist'))) {
            return t('phoneAlreadyExists') || 'Phone number already exists';
        }
        
        // Return original message if no translation found
        return errorMessage;
    };

    const checkAvailability = async (fields: { company_domain?: string; email?: string; username?: string; phone?: string }) => {
        setStepCheckLoading(true);
        try {
            await checkRegistrationAvailabilityAPI(fields);
            return true;
        } catch (error: any) {
            const fieldErrors: { [key: string]: string } = {};
            const backendErrors = error.fields || {};
            
            // Map backend field names to frontend field names and translate errors
            if (backendErrors.company_domain) {
                const errorMsg = normalizeErrorMessage(backendErrors.company_domain);
                fieldErrors.companyDomain = translateBackendError(errorMsg);
            }
            if (backendErrors.email) {
                const errorMsg = normalizeErrorMessage(backendErrors.email);
                fieldErrors.email = translateBackendError(errorMsg);
            }
            if (backendErrors.username) {
                const errorMsg = normalizeErrorMessage(backendErrors.username);
                fieldErrors.username = translateBackendError(errorMsg);
            }
            if (backendErrors.phone) {
                const errorMsg = normalizeErrorMessage(backendErrors.phone);
                fieldErrors.phone = translateBackendError(errorMsg);
            }
            
            if (Object.keys(fieldErrors).length > 0) {
                setErrors(prev => ({ ...prev, ...fieldErrors }));
            } else if (error.message) {
                setErrors(prev => ({ ...prev, general: translateBackendError(error.message) }));
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

    useEffect(() => {
        let isMounted = true;
        const loadPhoneOtpRequirement = async () => {
            try {
                const data = await getPhoneOtpRequirementAPI();
                if (!isMounted) return;
                const required = !!data.phone_otp_required;
                setPhoneOtpRequired(required);
                if (!required) setCurrentStep((prev) => (prev === 4 ? 3 : prev));
            } catch {
                // Keep secure default (required) if the requirement endpoint is unavailable.
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

        if (!companyName.trim()) {
            newErrors.companyName = t('companyNameRequired') || 'Company name is required';
        }

        if (!companyDomain.trim()) {
            newErrors.companyDomain = t('companyDomainRequired') || 'Company domain is required';
        } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*$/.test(companyDomain)) {
            newErrors.companyDomain = t('invalidDomain') || 'Invalid domain format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!firstName.trim()) {
            newErrors.firstName = t('firstNameRequired') || 'First name is required';
        }

        if (!lastName.trim()) {
            newErrors.lastName = t('lastNameRequired') || 'Last name is required';
        }

        if (!email.trim()) {
            newErrors.email = t('emailRequired') || 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = t('invalidEmail') || 'Invalid email format';
        }

        if (!username.trim()) {
            newErrors.username = t('usernameRequired') || 'Username is required';
        } else if (username.length < 3) {
            newErrors.username = t('usernameMinLength') || 'Username must be at least 3 characters';
        }

        const normalizedPhone = phone.trim();
        if (!normalizedPhone) {
            newErrors.phone = t('phoneRequired') || 'Phone is required';
        } else if (!/^\+[1-9]\d{1,14}$/.test(normalizedPhone)) {
            newErrors.phone = t('invalidPhone') || 'Invalid phone number format';
        } else if (normalizedPhone.length < 8) {
            newErrors.phone = t('phoneTooShort') || 'Phone number is too short';
        }

        if (!password.trim()) {
            newErrors.password = t('passwordRequired') || 'Password is required';
        } else if (password.length < 8) {
            newErrors.password = t('passwordMinLength') || 'Password must be at least 8 characters';
        }

        if (!confirmPassword.trim()) {
            newErrors.confirmPassword = t('confirmPasswordRequired') || 'Please confirm your password';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = t('passwordsDoNotMatch') || 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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
            if (!phoneOtpRequired) {
                setPhoneVerificationToken(null);
                setPhoneOtpCode('');
                setCurrentStep(planStep);
                return;
            }
            setOtpSending(true);
            setErrors((prev) => {
                const next = { ...prev };
                delete next.phoneOtp;
                delete next.general;
                return next;
            });
            try {
                await registerPhoneSendOtpAPI(phone.trim(), language);
                setPhoneVerificationToken(null);
                setPhoneOtpCode('');
                setCurrentStep(otpStep);
            } catch (e: any) {
                setErrors((prev) => ({
                    ...prev,
                    general: e.message || t('otpSendFailed') || 'Could not send WhatsApp code. Try again.',
                }));
            } finally {
                setOtpSending(false);
            }
        } else if (currentStep === otpStep) {
            return;
        }
    };

    const handleVerifyPhoneOtp = async () => {
        const code = phoneOtpCode.trim();
        if (!/^\d{4,8}$/.test(code)) {
            setErrors((prev) => ({
                ...prev,
                phoneOtp: t('verificationCodeRequired') || 'Enter the code from WhatsApp.',
            }));
            return;
        }
        setOtpVerifying(true);
        setErrors((prev) => {
            const next = { ...prev };
            delete next.phoneOtp;
            delete next.general;
            return next;
        });
        try {
            const data = await registerPhoneVerifyOtpAPI(phone.trim(), code, language);
            setPhoneVerificationToken(data.phone_verification_token);
            setCurrentStep(4);
        } catch (e: any) {
            setErrors((prev) => ({
                ...prev,
                phoneOtp: e.message || t('verificationFailed') || 'Invalid code. Try again.',
            }));
        } finally {
            setOtpVerifying(false);
        }
    };

    const handleResendPhoneOtp = async () => {
        setOtpSending(true);
        try {
            await registerPhoneSendOtpAPI(phone.trim(), language);
        } catch (e: any) {
            setErrors((prev) => ({
                ...prev,
                general: e.message || t('otpSendFailed') || 'Could not resend code.',
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
            }
        }
    };

    const handleRegister = async () => {
        if (!validateStep2()) {
            setCurrentStep(2);
            return;
        }
        if (phoneOtpRequired && !phoneVerificationToken) {
            setErrors({
                general:
                    t('phoneVerificationRequired') ||
                    'Verify your phone number via WhatsApp before completing registration.',
            });
            setCurrentStep(otpStep);
            return;
        }

        if (!selectedPlan) {
            setErrors(prev => ({
                ...prev,
                plan: t('planRequired') || 'Please select a plan to continue',
            }));
            setCurrentStep(4);
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
                plan_id: selectedPlan,
                billing_cycle: billingCycle,
            }, language);

            // Clear old user data before registration
            localStorage.removeItem('currentUser');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('pendingUserData');

            const userLang = (response.user.language === 'ar' || response.user.language === 'en') ? response.user.language : undefined;
            const frontendUser = {
                id: response.user.id,
                name: `${response.user.first_name || ''} ${response.user.last_name || ''}`.trim() || response.user.username,
                username: response.user.username,
                email: response.user.email,
                role: 'Owner',
                phone: response.user.phone || phone.trim(),
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(response.user.username)}&background=random`,
                company: {
                    id: response.company.id,
                    name: response.company.name,
                    domain: response.company.domain || companyDomain,
                    specialization: response.company.specialization as 'real_estate' | 'services' | 'products',
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
                window.location.href = `/payment?subscription_id=${subscriptionId}`;
                return;
            }

            // Free / trial (no payment required) – log in and go to dashboard
            localStorage.setItem('accessToken', response.access);
            localStorage.setItem('refreshToken', response.refresh);
            setCurrentUser(frontendUser);
            if (frontendUser.language) setLanguage(frontendUser.language);
            setIsLoggedIn(true);
            setTimeout(() => {
                navigateToCompanyRoute(frontendUser.company?.name, frontendUser.company?.domain, 'Dashboard');
                setCurrentPage('Dashboard');
            }, 100);
        } catch (error: any) {
            const backendFieldErrors = mapBackendErrorsToFields(error.fields || {});
            if (Object.keys(backendFieldErrors).length > 0) {
                setErrors(backendFieldErrors);
                if (backendFieldErrors.companyName || backendFieldErrors.companyDomain) {
                    setCurrentStep(1);
                } else if (
                    backendFieldErrors.firstName ||
                    backendFieldErrors.lastName ||
                    backendFieldErrors.email ||
                    backendFieldErrors.username ||
                    backendFieldErrors.password ||
                    backendFieldErrors.phone
                ) {
                    setCurrentStep(2);
                } else if (backendFieldErrors.phoneOtp) {
                    setCurrentStep(otpStep);
                } else if (backendFieldErrors.plan) {
                    setCurrentStep(planStep);
                }
            } else {
                const errorMessage = error.message || t('registrationFailed') || 'Registration failed. Please try again.';
                setErrors({ general: errorMessage });
                if (errorMessage.toLowerCase().includes('domain')) {
                    setCurrentStep(1);
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
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                        aria-label={`Switch to ${language === 'ar' ? 'English' : 'Arabic'}`}
                    >
                        <span className="font-bold text-sm">{language === 'ar' ? 'EN' : 'AR'}</span>
                    </button>
                    <Button variant="ghost" className="p-2 h-auto" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                        {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                    </Button>
                </div>
                <AuthHero />
                <div className="w-full lg:w-1/2 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8 overflow-y-auto">
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
                            {[1, 2, ...(phoneOtpRequired ? [3, 4] : [3])].map((stepNumber, idx, all) => (
                                <React.Fragment key={stepNumber}>
                                    <div
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${
                                            currentStep >= stepNumber
                                                ? 'bg-primary-600 text-inverse'
                                                : 'bg-gray-300 dark:bg-gray-700 text-tertiary'
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
                                            {t('companyName') || 'Company Name'} <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            id="company-name"
                                            placeholder={t('enterCompanyName') || 'Enter company name'}
                                            value={companyName}
                                            onChange={(e) => {
                                                setCompanyName(e.target.value);
                                                if (errors.companyName) {
                                                    setErrors(prev => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors.companyName;
                                                        return newErrors;
                                                    });
                                                }
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
                                            {t('companyDomain') || 'Company Domain'} <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            id="company-domain"
                                            placeholder={t('enterCompanyDomain') || 'e.g., mycompany'}
                                            value={companyDomain}
                                            onChange={(e) => {
                                                setCompanyDomain(slugifyDomain(e.target.value));
                                                if (errors.companyDomain) {
                                                    setErrors(prev => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors.companyDomain;
                                                        return newErrors;
                                                    });
                                                }
                                            }}
                                            className={errors.companyDomain ? 'border-red-500' : ''}
                                        />
                                        {errors.companyDomain && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.companyDomain}</p>
                                        )}
                                        <p className="mt-1 text-xs text-tertiary">
                                            {t('domainHint') || 'This will be used as your company identifier'}
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="specialization" className="block text-sm font-medium text-secondary mb-1">
                                            {t('specialization') || 'Specialization'} <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="specialization"
                                            value={specialization}
                                            onChange={(e) => setSpecialization(e.target.value as 'real_estate' | 'services' | 'products')}
                                            dir={language === 'ar' ? 'rtl' : 'ltr'}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="real_estate">{t('realEstate') || 'Real Estate'}</option>
                                            <option value="services">{t('services') || 'Services'}</option>
                                            <option value="products">{t('products') || 'Products'}</option>
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
                                                {t('firstName') || 'First Name'} <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                id="first-name"
                                                placeholder={t('enterFirstName') || 'Enter first name'}
                                                value={firstName}
                                                onChange={(e) => {
                                                    setFirstName(e.target.value);
                                                    if (errors.firstName) {
                                                        setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.firstName;
                                                            return newErrors;
                                                        });
                                                    }
                                                }}
                                                className={errors.firstName ? 'border-red-500' : ''}
                                            />
                                            {errors.firstName && (
                                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="last-name" className="block text-sm font-medium text-secondary mb-1">
                                                {t('lastName') || 'Last Name'} <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                id="last-name"
                                                placeholder={t('enterLastName') || 'Enter last name'}
                                                value={lastName}
                                                onChange={(e) => {
                                                    setLastName(e.target.value);
                                                    if (errors.lastName) {
                                                        setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.lastName;
                                                            return newErrors;
                                                        });
                                                    }
                                                }}
                                                className={errors.lastName ? 'border-red-500' : ''}
                                            />
                                            {errors.lastName && (
                                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-secondary mb-1">
                                            {t('email') || 'Email'} <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder={t('enterEmail') || 'Enter email address'}
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (errors.email) {
                                                    setErrors(prev => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors.email;
                                                        return newErrors;
                                                    });
                                                }
                                            }}
                                            className={errors.email ? 'border-red-500' : ''}
                                        />
                                        {errors.email && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="username" className="block text-sm font-medium text-secondary mb-1">
                                            {t('username') || 'Username'} <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            id="username"
                                            placeholder={t('enterUsername') || 'Enter username'}
                                            value={username}
                                            onChange={(e) => {
                                                setUsername(e.target.value);
                                                if (errors.username) {
                                                    setErrors(prev => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors.username;
                                                        return newErrors;
                                                    });
                                                }
                                            }}
                                            className={errors.username ? 'border-red-500' : ''}
                                        />
                                        {errors.username && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium text-secondary mb-1">
                                            {t('phone') || 'Phone'} <span className="text-red-500">*</span>
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
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <label htmlFor="password" className="block text-sm font-medium text-secondary mb-1">
                                            {t('password')} <span className="text-red-500">*</span>
                                        </label>

                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={passwordVisible ? 'text' : 'password'}
                                                placeholder={t('enterPassword')}
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    if (errors.password) {
                                                        setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.password;
                                                            return newErrors;
                                                        });
                                                    }
                                                }}
                                                className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                                            />

                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
                                                onClick={handlePasswordVisibilityToggle}
                                            >
                                                {passwordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                            </button>
                                        </div>

                                        <p className="mt-2 text-xs text-tertiary">
                                            {t('passwordRequirements')}
                                        </p>

                                        {errors.password && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                                        )}
                                    </div>


                                    <div className="relative">
                                        <label htmlFor="confirm-password" className="block text-sm font-medium text-secondary mb-1">
                                            {t('confirmPassword')} <span className="text-red-500">*</span>
                                        </label>

                                        <div className="relative">
                                            <Input
                                                id="confirm-password"
                                                type={confirmPasswordVisible ? 'text' : 'password'}
                                                placeholder={t('confirmPassword')}
                                                value={confirmPassword}
                                                onChange={(e) => {
                                                    setConfirmPassword(e.target.value);
                                                    if (errors.confirmPassword) {
                                                        setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.confirmPassword;
                                                            return newErrors;
                                                        });
                                                    }
                                                }}
                                                className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                                            />

                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
                                                onClick={handleConfirmPasswordVisibilityToggle}
                                            >
                                                {confirmPasswordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                            </button>
                                        </div>

                                        {errors.confirmPassword && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                                {errors.confirmPassword}
                                            </p>
                                        )}
                                    </div>

                                </div>
                            )}

                            {/* Step 3: WhatsApp OTP */}
                            {phoneOtpRequired && currentStep === otpStep && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-primary">
                                        {t('verifyPhoneWhatsApp') || 'Verify your phone (WhatsApp)'}
                                    </h3>
                                    <p className="text-sm text-secondary">
                                        {t('verifyPhoneWhatsAppHint') ||
                                            'We sent a verification code to your WhatsApp. Enter it below.'}
                                    </p>
                                    <div>
                                        <label htmlFor="phone-otp" className="block text-sm font-medium text-secondary mb-1">
                                            {t('verificationCode') || 'Verification code'}
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
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phoneOtp}</p>
                                        )}
                                    </div>
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
                                            <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-md">
                                                {plansError}
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
                                {phoneOtpRequired && currentStep === otpStep && (
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
                                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3">
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
                            className="absolute top-3 end-3 text-gray-400 hover:text-gray-200"
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
                                        {new Date(verificationExpiresAt).toLocaleString()}
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

