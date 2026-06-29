import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Loader } from '../Loader';
import { sendLeadSMSAPI, getMessageTemplatesAPI } from '../../services/api';
import { replaceSmsTemplatePlaceholders } from '../../utils/smsSendHelpers';
import { SmsSendPreviewModal } from './SmsSendPreviewModal';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

/** Remove ANSI escape codes so API error messages display cleanly */
function stripAnsi(str: string | undefined | null): string {
    if (str == null || typeof str !== 'string') return '';
    return str.replace(/\x1b\[[0-9;]*m/g, '').trim();
}

type SendSMSModalProps = {
    isOpen: boolean;
    onClose: () => void;
    leadId: number;
    phoneNumber: string;
    lead?: any;
    onSent?: () => void;
};

export const SendSMSModal = ({ isOpen, onClose, leadId, phoneNumber, lead, onSent }: SendSMSModalProps) => {
    const { t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [resolvedBody, setResolvedBody] = useState('');

    const { data: templates = [] } = useQuery({
        queryKey: ['messageTemplates'],
        queryFn: getMessageTemplatesAPI,
        enabled: isOpen,
    });
    const smsTemplates = (templates as any[]).filter((tpl: any) => tpl.channel_type === 'sms');

    const handleClose = () => {
        setBody('');
        setError(null);
        setShowPreview(false);
        setResolvedBody('');
        onClose();
    };

    const handleOpenPreview = () => {
        const trimmed = body.trim();
        if (!trimmed) {
            setError(t('smsMessageRequired') || 'Please enter your message');
            return;
        }
        const bodyToSend = lead ? replaceSmsTemplatePlaceholders(trimmed, lead) : trimmed;
        setResolvedBody(bodyToSend);
        setError(null);
        setShowPreview(true);
    };

    const handleConfirmSend = async () => {
        setError(null);
        setSending(true);
        try {
            await sendLeadSMSAPI({ lead_id: leadId, phone_number: phoneNumber, body: resolvedBody });
            setSuccessMessage(t('smsSent') || 'SMS sent');
            setIsSuccessModalOpen(true);
            onSent?.();
            handleClose();
        } catch (e: any) {
            const errorKey = e?.data?.error_key;
            const localized = errorKey && t(errorKey) ? t(errorKey) : null;
            const fallback = stripAnsi(e?.message || '') || t('failedToSendSms');
            setError(localized || fallback);
            setShowPreview(false);
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    if (showPreview) {
        return (
            <SmsSendPreviewModal
                isOpen={showPreview}
                onClose={handleClose}
                onBack={() => setShowPreview(false)}
                onConfirm={handleConfirmSend}
                confirming={sending}
                phoneNumber={phoneNumber}
                messageBody={resolvedBody}
                t={t}
            />
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('sendSms') || 'Send SMS'}
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('smsMessage')} → <strong>{phoneNumber}</strong>
                </p>
                <div>
                    {smsTemplates.length > 0 && (
                        <div className="mb-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">{t('quickTemplates')}</span>
                            <div className="flex flex-wrap gap-2">
                                {smsTemplates.map((tpl: any) => (
                                    <button
                                        key={tpl.id}
                                        type="button"
                                        onClick={() => {
                                            const content = tpl.content || '';
                                            const resolved = lead ? replaceSmsTemplatePlaceholders(content, lead) : content;
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
                    <Label htmlFor="sms-body">{t('smsMessage')}</Label>
                    <textarea
                        id="sms-body"
                        rows={4}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                        placeholder={t('smsMessagePlaceholder')}
                    />
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={handleClose} disabled={sending}>{t('cancel')}</Button>
                    <Button
                        onClick={handleOpenPreview}
                        disabled={sending}
                    >
                        {t('next') || 'Next'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SendSMSModal;
