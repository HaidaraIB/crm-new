import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Loader } from '../Loader';
import { sendWhatsAppMessageAPI, getMessageTemplatesAPI } from '../../services/api';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

function stripAnsi(str: string | undefined | null): string {
    if (str == null || typeof str !== 'string') return '';
    return str.replace(/\x1b\[[0-9;]*m/g, '').trim();
}

/** Replace [Customer Name], [Company], etc. (EN/AR) with lead data */
function replaceTemplatePlaceholders(text: string, lead: any): string {
    if (!lead) return text;
    const customerName = (lead.name || lead.contact_name || (lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}`.trim() : '') || '').trim();
    const company = (typeof lead.company_name === 'string' ? lead.company_name : (lead.company && (typeof lead.company === 'string' ? lead.company : lead.company?.name)) || '').trim();
    const amount = lead.amount ?? lead.last_invoice_amount ?? '';
    const amountStr = amount !== undefined && amount !== null && String(amount).trim() !== '' ? String(amount).trim() : null;
    const invoiceNumber = lead.invoice_number ?? lead.last_invoice_number ?? '';
    const invoiceStr = invoiceNumber !== undefined && invoiceNumber !== null && String(invoiceNumber).trim() !== '' ? String(invoiceNumber).trim() : null;
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

type SendWhatsAppModalProps = {
    isOpen: boolean;
    onClose: () => void;
    leadId: number;
    phoneNumber: string;
    lead?: any;
    onSent?: () => void;
};

export const SendWhatsAppModal = ({ isOpen, onClose, leadId, phoneNumber, lead, onSent }: SendWhatsAppModalProps) => {
    const { t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: templates = [] } = useQuery({
        queryKey: ['messageTemplates'],
        queryFn: getMessageTemplatesAPI,
        enabled: isOpen,
    });
    // API returns channel_type 'whatsapp_api' (not 'whatsapp')
    const whatsappTemplates = (templates as any[]).filter((tpl: any) => {
        const ch = (tpl.channel_type || '').toLowerCase();
        return ch === 'whatsapp' || ch === 'whatsapp_api';
    });

    const handleClose = () => {
        setBody('');
        setError(null);
        onClose();
    };

    const to = (phoneNumber || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
    const waMeUrl = to ? `https://wa.me/${to}${body.trim() ? `?text=${encodeURIComponent(body.trim())}` : ''}` : '#';

    const handleSend = async () => {
        const trimmed = body.trim();
        if (!trimmed) {
            setError(t('smsMessageRequired') || 'Please enter your message');
            return;
        }
        if (!to) {
            setError(t('sms_error_invalid_to_number') || 'No phone number');
            return;
        }
        const bodyToSend = lead ? replaceTemplatePlaceholders(trimmed, lead) : trimmed;
        setError(null);
        setSending(true);
        try {
            await sendWhatsAppMessageAPI({ to, message: bodyToSend, client_id: leadId });
            setSuccessMessage(t('whatsappSent') || 'WhatsApp message sent');
            setIsSuccessModalOpen(true);
            onSent?.();
            handleClose();
        } catch (e: any) {
            const fallback = stripAnsi(e?.message || '') || t('failedToSendSms');
            setError(e?.data?.error || fallback);
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('sendWhatsApp') || 'Send WhatsApp'}
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('whatsappMessage') || 'WhatsApp message'} → <strong>{phoneNumber}</strong>
                </p>
                {whatsappTemplates.length > 0 && (
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">{t('quickTemplates')}</span>
                        <div className="flex flex-wrap gap-2">
                            {whatsappTemplates.map((tpl: any) => (
                                <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => {
                                        const content = tpl.content || '';
                                        const resolved = lead ? replaceTemplatePlaceholders(content, lead) : content;
                                        setBody((prev) => (prev ? prev + '\n' + resolved : resolved));
                                    }}
                                    className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                >
                                    {tpl.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <Label htmlFor="wa-body">{t('whatsappMessage') || 'Message'}</Label>
                    <textarea
                        id="wa-body"
                        rows={4}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                        placeholder={t('smsMessagePlaceholder')}
                    />
                </div>
                {to && (
                    <div className="flex justify-center">
                        <a
                            href={waMeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={t('openWhatsApp') || 'Open in WhatsApp'}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#25D366] hover:text-[#1da851] dark:text-[#34D399] dark:hover:text-[#25D366] transition-colors bg-transparent border-0 p-0 cursor-pointer"
                        >
                            {t('openWhatsApp') || 'Open in WhatsApp'}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </a>
                    </div>
                )}
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={handleClose} disabled={sending}>{t('cancel')}</Button>
                    <Button
                        onClick={handleSend}
                        disabled={sending}
                        className={sending ? 'min-w-[7rem]' : ''}
                        title={sending ? (t('sending') || 'Sending...') : undefined}
                    >
                        {sending ? (
                            <Loader variant="foreground" className="h-5" />
                        ) : (
                            t('sendViaCrm') || 'Send via CRM'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SendWhatsAppModal;
