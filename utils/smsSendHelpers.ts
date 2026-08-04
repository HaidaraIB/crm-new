/** Shared helpers for manual SMS compose, preview, and campaigns. */

import { replaceTemplatePlaceholders } from './messagePlaceholders';

/** Resolve a lead's phone from primary fields or phone_numbers[]. Returns digits without +. */
export function resolveLeadPhoneRaw(lead: {
    phone_number?: string;
    phone?: string;
    phone_numbers?: Array<{ phone_number?: string; is_primary?: boolean }>;
    name?: string;
} | null | undefined): string {
    if (!lead) return '';
    const fromField = (lead.phone_number || lead.phone || '').replace(/\s+/g, '').replace(/^\+/, '');
    if (fromField) return fromField;
    const numbers = lead.phone_numbers;
    if (Array.isArray(numbers) && numbers.length > 0) {
        const sorted = [...numbers].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
        for (const row of sorted) {
            const p = (row.phone_number || '').replace(/\s+/g, '').replace(/^\+/, '');
            if (p) return p;
        }
    }
    const name = String(lead.name || '').replace(/\s+/g, '').replace(/^\+/, '');
    return /^\d+$/.test(name) ? name : '';
}

export function leadHasPhone(lead: Parameters<typeof resolveLeadPhoneRaw>[0]): boolean {
    return resolveLeadPhoneRaw(lead).length > 0;
}

export function maskPhoneForDisplay(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length <= 4) return '****';
    return `***${digits.slice(-4)}`;
}

export function replaceSmsTemplatePlaceholders(
    text: string,
    lead: any,
    tenantCompanyName?: string,
): string {
    return replaceTemplatePlaceholders(text, lead, { tenantCompanyName });
}

export function smsProviderLabel(provider: string | undefined | null): string {
    const p = (provider || 'twilio').toLowerCase();
    if (p === 'otpiq') return 'OTPIQ';
    return 'Twilio';
}
