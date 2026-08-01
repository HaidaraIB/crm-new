/** Shared lead form validation (mirrors CreateLeadPage/EditLeadPage validateForm rules). */

import type { TranslateFn } from './formValidation';
import { validatePhoneField } from './formValidation';
import { mapApiFieldsToUiErrors } from './formFieldErrors';

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

/** Map API field keys → lead form UI error keys. */
export const LEAD_API_FIELD_MAP: Record<string, string> = {
    phone_number: 'phone',
    phone_numbers: 'phone',
    communication_way: 'communicationWay',
    assigned_to: 'assignedTo',
    lead_company_name: 'leadCompanyName',
    budget_max: 'budgetMax',
    interested_developer: 'interestedDeveloper',
    interested_project: 'interestedProject',
    interested_unit: 'interestedUnit',
};

/**
 * Map create/update lead API errors onto inline form field keys (localized).
 * Prefer `error.code` business keys (e.g. duplicate_lead_phone) over raw English details.
 */
export const mapLeadApiErrorToFieldErrors = (
    error: {
        code?: string;
        error_key?: string;
        message?: string;
        fields?: Record<string, unknown>;
    } | null | undefined,
    t: TranslateFn,
    fallbackGeneralKey: 'errorCreatingLead' | 'errorUpdatingLead' = 'errorCreatingLead'
): Record<string, string> => {
    const code = error?.code || error?.error_key;

    if (code === 'employee_weekly_day_off') {
        return {
            assignedTo:
                t('employeeWeeklyDayOffAssignError') ||
                error?.message ||
                'Cannot assign to this employee on their weekly day off.',
        };
    }

    if (code === 'duplicate_lead_phone') {
        return {
            phone:
                t('duplicate_lead_phone') ||
                'A lead with this phone number already exists in your company.',
        };
    }

    if (error?.fields) {
        const fieldErrors = mapApiFieldsToUiErrors(error.fields, t, LEAD_API_FIELD_MAP);
        if (Object.keys(fieldErrors).length > 0) {
            return fieldErrors;
        }
    }

    return {
        general:
            error?.message ||
            t(fallbackGeneralKey) ||
            (fallbackGeneralKey === 'errorUpdatingLead'
                ? 'Failed to update lead. Please try again.'
                : 'Failed to create lead. Please try again.'),
    };
};
