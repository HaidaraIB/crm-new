/** Shared form field-error helpers (registration-aligned UX). */

import type { TranslateFn } from './formValidation';

export const normalizeErrorMessage = (value: any): string => {
    if (!value) return '';
    if (Array.isArray(value)) {
        return normalizeErrorMessage(value[0]);
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'object') {
        if (value.detail) return normalizeErrorMessage(value.detail);
        if (value.message) return normalizeErrorMessage(value.message);
        if (value.errors) return normalizeErrorMessage(value.errors);
        const firstKey = Object.keys(value)[0];
        if (firstKey) return normalizeErrorMessage(value[firstKey]);
        return '';
    }
    return String(value);
};

/** Prefer nested `errors` when API wraps field errors as `{ available, errors }`. */
export const unwrapApiFieldErrors = (raw: any): Record<string, unknown> => {
    if (!raw || typeof raw !== 'object') return {};
    if (raw.errors && typeof raw.errors === 'object' && !Array.isArray(raw.errors)) {
        return raw.errors as Record<string, unknown>;
    }
    return raw as Record<string, unknown>;
};

export const scrollToFirstFieldError = (
    fieldErrors: Record<string, string>,
    domIdMap: Record<string, string>,
    skipKeys: string[] = ['general', '_general']
): void => {
    const firstKey = Object.keys(fieldErrors).find(
        (k) => !skipKeys.includes(k) && domIdMap[k]
    );
    if (!firstKey) return;
    const el = document.getElementById(domIdMap[firstKey]);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try {
            el.focus({ preventScroll: true });
        } catch {
            // ignore
        }
    }
};

export const buildFieldErrorSummary = (
    fieldErrors: Record<string, string>,
    fieldLabels: Record<string, string>,
    t: TranslateFn,
    skipKeys: string[] = ['general', '_general']
): string => {
    const labels = Object.keys(fieldErrors)
        .filter((k) => !skipKeys.includes(k))
        .map((k) => fieldLabels[k] || k);
    if (labels.length === 0) {
        return t('pleaseFixHighlightedFields') || 'Please fix the highlighted fields below.';
    }
    if (labels.length === 1) {
        return (
            t('pleaseFixField')?.replace('{field}', labels[0]) ||
            `Please fix the ${labels[0]} field below.`
        );
    }
    return t('pleaseFixHighlightedFields') || 'Please fix the highlighted fields below.';
};

export const translateBackendError = (
    errorMessage: string,
    t: TranslateFn,
    fieldHint?: string
): string => {
    const lowerMessage = (errorMessage || '').toLowerCase();
    const hint = (fieldHint || '').toLowerCase();

    const isTaken =
        lowerMessage.includes('already exists') ||
        lowerMessage.includes('already exist') ||
        lowerMessage.includes('already taken') ||
        lowerMessage.includes('already registered') ||
        lowerMessage.includes('not available') ||
        lowerMessage.includes('unavailable');

    if (isTaken || hint) {
        if (hint.includes('email') || lowerMessage.includes('email')) {
            return (
                t('emailAlreadyExists') ||
                'This email is already registered. Please use a different email.'
            );
        }
        if (hint.includes('username') || lowerMessage.includes('username')) {
            return t('usernameAlreadyExists') || 'This username is already taken. Please choose another.';
        }
        if (hint.includes('phone') || lowerMessage.includes('phone')) {
            return (
                t('phoneAlreadyExists') ||
                'This phone number is already registered. Please use a different number.'
            );
        }
        if (
            hint.includes('domain') ||
            hint.includes('companydomain') ||
            hint.includes('company_domain') ||
            lowerMessage.includes('domain')
        ) {
            return (
                t('domainAlreadyExists') ||
                'This company domain is already taken. Please choose another.'
            );
        }
    }

    if (lowerMessage.includes('enter a valid email') || lowerMessage.includes('valid email')) {
        return t('invalidEmail') || 'Invalid email format';
    }
    if (lowerMessage.includes('required')) {
        if (hint.includes('email')) return t('emailRequired') || 'Email is required';
        if (hint.includes('username')) return t('usernameRequired') || 'Username is required';
        if (hint.includes('phone')) return t('phoneRequired') || 'Phone is required';
        if (hint.includes('password')) return t('passwordRequired') || 'Password is required';
        if (hint.includes('domain')) return t('companyDomainRequired') || 'Company domain is required';
        if (hint.includes('name') && hint.includes('company')) {
            return t('companyNameRequired') || 'Company name is required';
        }
    }

    if (lowerMessage === 'not available.' || lowerMessage === 'not available') {
        return t('pleaseFixHighlightedFields') || 'Please fix the highlighted fields below.';
    }

    return errorMessage;
};

/**
 * Map common API field keys onto a UI errors map.
 * `fieldMap` maps API key → UI key (e.g. first_name → firstName).
 */
export const mapApiFieldsToUiErrors = (
    apiFields: any,
    t: TranslateFn,
    fieldMap: Record<string, string> = {}
): Record<string, string> => {
    const fieldErrors: Record<string, string> = {};
    if (!apiFields || typeof apiFields !== 'object') {
        return fieldErrors;
    }

    const source = unwrapApiFieldErrors(apiFields);
    const defaultMap: Record<string, string> = {
        email: 'email',
        username: 'username',
        password: 'password',
        phone: 'phone',
        first_name: 'firstName',
        last_name: 'lastName',
        name: 'name',
        ...fieldMap,
    };

    Object.entries(source).forEach(([apiKey, value]) => {
        if (apiKey === 'non_field_errors' || apiKey === 'detail') {
            fieldErrors.general = translateBackendError(normalizeErrorMessage(value), t);
            return;
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Nested objects handled by callers (e.g. registration company/owner)
            return;
        }
        const uiKey = defaultMap[apiKey] || apiKey;
        if (!fieldErrors[uiKey]) {
            fieldErrors[uiKey] = translateBackendError(normalizeErrorMessage(value), t, apiKey);
        }
    });

    return fieldErrors;
};

type ErrorsSetter = (
    updater: (prev: Record<string, string>) => Record<string, string>
) => void;

export const clearFieldError = (
    setErrors: ErrorsSetter,
    field: string,
    alsoClearGeneral = true
): void => {
    setErrors((prev) => {
        if (!prev[field] && !(alsoClearGeneral && (prev.general || prev._general))) {
            return prev;
        }
        const next = { ...prev };
        delete next[field];
        if (alsoClearGeneral) {
            delete next.general;
            delete next._general;
        }
        return next;
    });
};

/** Registration-specific nested company/owner API error mapping. */
export const mapRegisterBackendErrorsToFields = (
    apiFields: any,
    t: TranslateFn
): Record<string, string> => {
    const fieldErrors: Record<string, string> = {};
    if (!apiFields || typeof apiFields !== 'object') {
        return fieldErrors;
    }

    const source = unwrapApiFieldErrors(apiFields);

    const ownerFieldMap: Record<string, string> = {
        first_name: 'firstName',
        last_name: 'lastName',
        email: 'email',
        username: 'username',
        password: 'password',
        phone: 'phone',
    };

    if (source.company && typeof source.company === 'object') {
        const companyErrors = source.company as Record<string, unknown>;
        if (companyErrors.domain) {
            fieldErrors.companyDomain = translateBackendError(
                normalizeErrorMessage(companyErrors.domain),
                t,
                'company_domain'
            );
        }
        if (companyErrors.name) {
            fieldErrors.companyName = translateBackendError(
                normalizeErrorMessage(companyErrors.name),
                t,
                'company_name'
            );
        }
        if (!fieldErrors.companyDomain && (Array.isArray(companyErrors) || typeof companyErrors === 'string')) {
            const message = normalizeErrorMessage(companyErrors);
            if (!fieldErrors.companyName && message.toLowerCase().includes('name')) {
                fieldErrors.companyName = translateBackendError(message, t, 'company_name');
            } else {
                fieldErrors.companyDomain = translateBackendError(message, t, 'company_domain');
            }
        }
    }

    if (source.company_domain) {
        fieldErrors.companyDomain = translateBackendError(
            normalizeErrorMessage(source.company_domain),
            t,
            'company_domain'
        );
    }

    if (source.owner && typeof source.owner === 'object' && !Array.isArray(source.owner)) {
        Object.entries(ownerFieldMap).forEach(([apiKey, uiKey]) => {
            if ((source.owner as Record<string, unknown>)[apiKey]) {
                fieldErrors[uiKey] = translateBackendError(
                    normalizeErrorMessage((source.owner as Record<string, unknown>)[apiKey]),
                    t,
                    apiKey
                );
            }
        });
        const ownerObj = source.owner as Record<string, unknown>;
        if (ownerObj.non_field_errors && !fieldErrors.password) {
            fieldErrors.password = translateBackendError(
                normalizeErrorMessage(ownerObj.non_field_errors),
                t,
                'password'
            );
        }
    } else if (source.owner && (Array.isArray(source.owner) || typeof source.owner === 'string')) {
        const msg = normalizeErrorMessage(source.owner);
        const lower = msg.toLowerCase();
        if (lower.includes('email')) {
            fieldErrors.email = translateBackendError(msg, t, 'email');
        } else if (lower.includes('username')) {
            fieldErrors.username = translateBackendError(msg, t, 'username');
        } else if (lower.includes('phone')) {
            fieldErrors.phone = translateBackendError(msg, t, 'phone');
        } else if (lower.includes('password')) {
            fieldErrors.password = translateBackendError(msg, t, 'password');
        } else {
            fieldErrors.general = translateBackendError(msg, t);
        }
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
        email_verification_token: 'emailOtp',
    };

    Object.entries(directMap).forEach(([apiKey, uiKey]) => {
        if (source[apiKey] && !fieldErrors[uiKey]) {
            fieldErrors[uiKey] = translateBackendError(
                normalizeErrorMessage(source[apiKey]),
                t,
                apiKey
            );
        }
    });

    if (source.non_field_errors) {
        fieldErrors.general = translateBackendError(
            normalizeErrorMessage(source.non_field_errors),
            t
        );
    }

    return fieldErrors;
};
