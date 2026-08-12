import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Loader } from '../Loader';
import { PhoneText } from '../PhoneText';
import { sendWhatsAppMessageAPI, sendWhatsAppTemplateAPI, getWhatsAppSessionWindowAPI, getMessageTemplatesAPI, resolveLocalizedApiError } from '../../services/api';
import { clearFieldError } from '../../utils/formFieldErrors';
import { replaceTemplatePlaceholders } from '../../utils/messagePlaceholders';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

function stripAnsi(str: string | undefined | null): string {
    if (str == null || typeof str !== 'string') return '';
    return str.replace(/\x1b\[[0-9;]*m/g, '').trim();
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
    const { t, language, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [templateSendId, setTemplateSendId] = useState<number | ''>('');
    const [templateSending, setTemplateSending] = useState(false);

    const { data: templates = [] } = useQuery({
        queryKey: ['messageTemplates'],
        queryFn: getMessageTemplatesAPI,
        enabled: isOpen,
    });
    const { data: waSession } = useQuery({
        queryKey: ['whatsappSession', leadId],
        queryFn: () => getWhatsAppSessionWindowAPI(leadId),
        enabled: isOpen && typeof leadId === 'number',
    });
    // API returns channel_type 'whatsapp_api' (not 'whatsapp')
    const whatsappTemplates = (templates as any[]).filter((tpl: any) => {
        const ch = (tpl.channel_type || '').toLowerCase();
        return ch === 'whatsapp' || ch === 'whatsapp_api';
    });
    const approvedWaTemplates = whatsappTemplates.filter(
        (tpl: any) => (tpl.meta_status || '').toUpperCase() === 'APPROVED'
    );

    const blockFreeText = waSession != null && !waSession.in_session;

    const handleClose = () => {
        setBody('');
        setErrors({});
        setTemplateSendId('');
        onClose();
    };

    const to = (phoneNumber || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
    const waMeUrl = to ? `https://wa.me/${to}${body.trim() ? `?text=${encodeURIComponent(body.trim())}` : ''}` : '#';

    const handleSend = async () => {
        if (blockFreeText) {
            setErrors({
                body:
                    t('whatsappOutsideSessionUseTemplate') ||
                    'Outside the 24-hour window: send an approved template below instead of free text.',
            });
            return;
        }
        const trimmed = body.trim();
        if (!trimmed) {
            setErrors({ body: t('smsMessageRequired') || 'Please enter your message' });
            return;
        }
        if (!to) {
            setErrors({ general: t('sms_error_invalid_to_number') || 'No phone number' });
            return;
        }
        const bodyToSend = lead ? replaceTemplatePlaceholders(trimmed, lead) : trimmed;
        setErrors({});
        setSending(true);
        try {
            await sendWhatsAppMessageAPI({ to, message: bodyToSend, client_id: leadId });
            setSuccessMessage(t('whatsappSent') || 'WhatsApp message sent');
            setIsSuccessModalOpen(true);
            onSent?.();
            handleClose();
        } catch (e: any) {
            const fallback = stripAnsi(e?.message || '') || t('failedToSendSms');
            setErrors({ general: resolveLocalizedApiError(e, t, fallback) });
        } finally {
            setSending(false);
        }
    };

    const handleSendTemplate = async () => {
        if (templateSendId === '') {
            setErrors({ template: t('selectApprovedTemplate') || 'Select an approved template' });
            return;
        }
        if (!to) {
            setErrors({ general: t('sms_error_invalid_to_number') || 'No phone number' });
            return;
        }
        setErrors({});
        setTemplateSending(true);
        try {
            await sendWhatsAppTemplateAPI({
                to,
                template_id: templateSendId as number,
                client_id: leadId,
            });
            onSent?.();
            handleClose();
        } catch (e: any) {
            setErrors({ general: resolveLocalizedApiError(e, t, t('failedToSendSms')) });
        } finally {
            setTemplateSending(false);
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
                    {t('whatsappMessage') || 'WhatsApp message'} {language === 'ar' ? '←' : '→'} <PhoneText as="strong">{phoneNumber}</PhoneText>
                </p>
                {blockFreeText && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5">
                        {t('whatsappSessionClosedHint') ||
                            'This contact has not messaged you recently. Use an approved Meta template to reach them.'}
                    </p>
                )}
                {waSession?.in_session && waSession.hours_remaining != null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(t('whatsappSessionOpenHint') || 'Free-form allowed (~{h}h left in session)').replace(
                            '{h}',
                            String(Math.max(0, Math.round(waSession.hours_remaining)))
                        )}
                    </p>
                )}
                {approvedWaTemplates.length > 0 && (
                    <div>
                        <Label htmlFor="wa-meta-template">{t('sendMetaTemplate') || 'Send Meta template'}</Label>
                        <div className="flex items-stretch gap-2 mt-1">
                            <select
                                id="wa-meta-template"
                                value={templateSendId === '' ? '' : String(templateSendId)}
                                onChange={(e) => {
                                    setTemplateSendId(e.target.value ? Number(e.target.value) : '');
                                    clearFieldError(setErrors, 'template');
                                }}
                                className={`flex-1 min-w-0 h-10 rounded-md border bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-white ${errors.template ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            >
                                <option value="">{t('selectApprovedTemplate') || 'Select approved template…'}</option>
                                {approvedWaTemplates.map((tpl: any) => (
                                    <option key={tpl.id} value={tpl.id}>
                                        {tpl.name}
                                    </option>
                                ))}
                            </select>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleSendTemplate}
                                disabled={templateSendId === ''}
                                loading={templateSending}
                                className="shrink-0 h-10 py-0 px-4"
                            >
                                {t('sendTemplateMessage') || 'Send'}
                            </Button>
                        </div>
                        {errors.template && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.template}</p>
                        )}
                    </div>
                )}
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
                                        const resolved = lead
                                            ? replaceTemplatePlaceholders(content, lead, {
                                                  variableMap: tpl.meta_variable_map?.body ?? undefined,
                                              })
                                            : content;
                                        setBody((prev) => (prev ? prev + '\n' + resolved : resolved));
                                        clearFieldError(setErrors, 'body');
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
                        onChange={(e) => {
                            setBody(e.target.value);
                            clearFieldError(setErrors, 'body');
                        }}
                        disabled={blockFreeText}
                        className={`w-full rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm disabled:opacity-60 ${errors.body ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        placeholder={t('smsMessagePlaceholder')}
                    />
                    {errors.body && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.body}</p>
                    )}
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
                {errors.general && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-600 dark:text-red-400">
                        {errors.general}
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={handleClose} disabled={sending}>{t('cancel')}</Button>
                    <Button
                        onClick={handleSend}
                        disabled={sending || blockFreeText}
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
