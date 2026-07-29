/** Shared lead form validation (mirrors CreateLeadPage/EditLeadPage validateForm rules). */

import type { TranslateFn } from './formValidation';
import { validatePhoneField } from './formValidation';

export interface LeadFormPhoneNumberInput {
    phone_number?: string;
    phone_type?: string;
    is_primary?: boolean;
    notes?: string;
    id?: number;
    // Allow extra API/UI fields without fighting PhoneNumber assignability
    [key: string]: any;
}

export interface LeadFormValues {
    name?: string;
    /** Single-phone fallback, used when `phoneNumbers` is empty. */
    phone?: string;
    phoneNumbers?: LeadFormPhoneNumberInput[];
    communicationWay?: string | number | null;
    status?: string | number | null;
    priority?: string | number | null;
    type?: string | number | null;
    companyId?: string | number | null;
}

export interface LeadFormValidationOptions {
    /** Set when the caller needs an explicit company selection/context (e.g. create flows). */
    requireCompany?: boolean;
}

/**
 * Resolves the effective phone number list the same way the lead create/edit forms do:
 * prefer non-empty `phoneNumbers` entries, otherwise fall back to the single `phone` field.
 */
export const resolveLeadPhoneNumbers = (
    values: Pick<LeadFormValues, 'phone' | 'phoneNumbers'>
): LeadFormPhoneNumberInput[] => {
    if (values.phoneNumbers && values.phoneNumbers.length > 0) {
        return values.phoneNumbers.filter((pn) => (pn.phone_number || '').toString().trim() !== '');
    }
    if (values.phone && values.phone.trim() !== '') {
        return [{ phone_number: values.phone }];
    }
    return [];
};

export const validateLeadForm = (
    values: LeadFormValues,
    t: TranslateFn,
    options?: LeadFormValidationOptions
): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!values.name || !values.name.trim()) {
        errors.name = t('nameRequired') || 'Name is required';
    }

    const finalPhoneNumbers = resolveLeadPhoneNumbers(values);
    if (finalPhoneNumbers.length === 0) {
        errors.phone = t('phoneNumberRequired') || 'At least one phone number is required';
    } else {
        for (const pn of finalPhoneNumbers) {
            const phoneErr = validatePhoneField(String(pn.phone_number || ''), t);
            if (phoneErr) {
                errors.phone = phoneErr;
                break;
            }
        }
    }

    if (!values.communicationWay) {
        errors.communicationWay = t('communicationWayRequired') || 'Communication channel is required';
    }

    if (!values.status) {
        errors.status = t('statusRequired') || 'Status is required';
    }

    if (!values.priority) {
        errors.priority = t('priorityRequired') || 'Priority is required';
    }

    if (!values.type) {
        errors.type = t('typeRequired') || 'Type is required';
    }

    if (options?.requireCompany && !values.companyId) {
        errors.company = t('companyRequired') || 'Company is required';
    }

    return errors;
};
