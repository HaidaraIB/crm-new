/** Shared client-side field validators (registration-aligned rules). */

/** Accepts typed i18n `t` (keyof translations) and plain `(key: string) => string`. */
export type TranslateFn = (key: any) => string | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;
const DOMAIN_SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*$/;
const PHONE_E164_RE = /^\+[1-9]\d{1,14}$/;

export const isValidEmail = (value: string): boolean => EMAIL_RE.test(value.trim());

export const isValidUsername = (value: string): boolean => {
    const v = value.trim();
    return v.length >= 3 && USERNAME_RE.test(v);
};

export const isValidDomainSlug = (value: string): boolean => DOMAIN_SLUG_RE.test(value.trim());

export const isValidPhoneE164 = (value: string): boolean => {
    const normalized = value.trim();
    return PHONE_E164_RE.test(normalized) && normalized.length >= 8;
};

export const isValidPassword = (value: string): boolean =>
    value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

export const requiredTrim = (
    value: string,
    t: TranslateFn,
    requiredKey: string,
    fallback: string
): string | null => {
    if (!value.trim()) return t(requiredKey) || fallback;
    return null;
};

export const validateEmailField = (
    value: string,
    t: TranslateFn,
    opts?: { required?: boolean }
): string | null => {
    const required = opts?.required !== false;
    const trimmed = value.trim();
    if (!trimmed) {
        return required ? t('emailRequired') || 'Email is required' : null;
    }
    if (!isValidEmail(trimmed)) {
        return t('invalidEmail') || 'Invalid email format';
    }
    return null;
};

export const validateUsernameField = (
    value: string,
    t: TranslateFn,
    opts?: { required?: boolean }
): string | null => {
    const required = opts?.required !== false;
    const trimmed = value.trim();
    if (!trimmed) {
        return required ? t('usernameRequired') || 'Username is required' : null;
    }
    if (trimmed.length < 3) {
        return t('usernameMinLength') || 'Username must be at least 3 characters';
    }
    if (!USERNAME_RE.test(trimmed)) {
        return (
            t('invalidUsername') ||
            'Username can only contain letters, numbers, dots, underscores, and hyphens'
        );
    }
    return null;
};

export const validatePhoneField = (
    value: string,
    t: TranslateFn,
    opts?: { required?: boolean }
): string | null => {
    const required = opts?.required !== false;
    const normalized = value.trim();
    if (!normalized) {
        return required ? t('phoneRequired') || 'Phone is required' : null;
    }
    if (!PHONE_E164_RE.test(normalized)) {
        return t('invalidPhone') || 'Invalid phone number format';
    }
    if (normalized.length < 8) {
        return t('phoneTooShort') || 'Phone number is too short';
    }
    return null;
};

export const validatePasswordField = (
    value: string,
    t: TranslateFn,
    opts?: { required?: boolean }
): string | null => {
    const required = opts?.required !== false;
    if (!value.trim()) {
        return required ? t('passwordRequired') || 'Password is required' : null;
    }
    if (value.length < 8) {
        return t('passwordMinLength') || 'Password must be at least 8 characters';
    }
    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
        return (
            t('passwordRequirements') ||
            'Use at least 8 characters with a mix of letters and numbers.'
        );
    }
    return null;
};

export const validateConfirmPasswordField = (
    password: string,
    confirmPassword: string,
    t: TranslateFn
): string | null => {
    if (!confirmPassword.trim()) {
        return t('confirmPasswordRequired') || 'Please confirm your password';
    }
    if (password !== confirmPassword) {
        return t('passwordsDoNotMatch') || 'Passwords do not match';
    }
    return null;
};

export const validateDomainSlugField = (
    value: string,
    t: TranslateFn,
    opts?: { required?: boolean }
): string | null => {
    const required = opts?.required !== false;
    const trimmed = value.trim();
    if (!trimmed) {
        return required ? t('companyDomainRequired') || 'Company domain is required' : null;
    }
    if (!isValidDomainSlug(trimmed)) {
        return t('invalidDomain') || 'Invalid domain format';
    }
    return null;
};

export const validateNameField = (
    value: string,
    t: TranslateFn,
    opts?: { requiredKey?: string; fallback?: string; minLength?: number; required?: boolean }
): string | null => {
    const required = opts?.required !== false;
    const trimmed = value.trim();
    if (!trimmed) {
        return required
            ? t(opts?.requiredKey || 'nameRequired') || opts?.fallback || 'Name is required'
            : null;
    }
    const min = opts?.minLength ?? 0;
    if (min > 0 && trimmed.length < min) {
        return t('nameMinLength') || `Name must be at least ${min} characters`;
    }
    return null;
};

export const validateOtpCodeField = (
    value: string,
    t: TranslateFn,
    opts?: { minLength?: number; maxLength?: number; exactLength?: number }
): string | null => {
    const code = value.trim();
    if (!code) {
        return t('verificationCodeRequired') || t('codeRequired') || 'Verification code is required';
    }
    if (opts?.exactLength != null && code.length !== opts.exactLength) {
        return (
            t('invalidVerificationCode') ||
            `Please enter a ${opts.exactLength}-digit verification code`
        );
    }
    const min = opts?.minLength ?? 4;
    const max = opts?.maxLength ?? 8;
    if (!/^\d+$/.test(code) || code.length < min || code.length > max) {
        return t('invalidVerificationCode') || 'Invalid verification code';
    }
    return null;
};
