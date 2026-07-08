/** Shared helpers for manual SMS compose, preview, and campaigns. */

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
    if (!lead) return text;
    const customerName = (
        lead.name ||
        lead.contact_name ||
        (lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}`.trim() : '') ||
        ''
    ).trim();
    const leadCompany = (
        typeof lead.company_name === 'string'
            ? lead.company_name
            : (lead.company && (typeof lead.company === 'string' ? lead.company : lead.company?.name)) || ''
    ).trim();
    const company = (tenantCompanyName || '').trim() || leadCompany;
    const amount = lead.amount ?? lead.last_invoice_amount ?? '';
    const amountStr =
        amount !== undefined && amount !== null && String(amount).trim() !== ''
            ? String(amount).trim()
            : null;
    const invoiceNumber = lead.invoice_number ?? lead.last_invoice_number ?? '';
    const invoiceStr =
        invoiceNumber !== undefined && invoiceNumber !== null && String(invoiceNumber).trim() !== ''
            ? String(invoiceNumber).trim()
            : null;

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const replacePlaceholder = (out: string, pattern: string, value: string) =>
        value ? out.replace(new RegExp(`\\[\\s*${escapeRegex(pattern)}\\s*\\]`, 'g'), value) : out;

    let out = text;
    out = replacePlaceholder(out, 'اسم_العميل', customerName);
    out = replacePlaceholder(out, 'اسم العميل', customerName);
    out = replacePlaceholder(out, 'Customer Name', customerName);
    out = replacePlaceholder(out, 'شركة', company);
    out = replacePlaceholder(out, 'الشركة', company);
    out = replacePlaceholder(out, 'Company', company);
    if (amountStr !== null) {
        out = replacePlaceholder(out, 'المبلغ', amountStr);
        out = replacePlaceholder(out, 'Amount', amountStr);
    }
    if (invoiceStr !== null) {
        out = replacePlaceholder(out, 'رقم_الفاتورة', invoiceStr);
        out = replacePlaceholder(out, 'رقم الفاتورة', invoiceStr);
        out = replacePlaceholder(out, 'Invoice Number', invoiceStr);
    }
    return out;
}

export function smsProviderLabel(provider: string | undefined | null): string {
    const p = (provider || 'twilio').toLowerCase();
    if (p === 'otpiq') return 'OTPIQ';
    return 'Twilio';
}
