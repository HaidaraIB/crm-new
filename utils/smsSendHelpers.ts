/** Shared helpers for manual SMS compose, preview, and campaigns. */

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
