import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Loader } from '../Loader';
import { sendLeadSMSAPI } from '../../services/api';

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
    onSent?: () => void;
};

export const SendSMSModal = ({ isOpen, onClose, leadId, phoneNumber, onSent }: SendSMSModalProps) => {
    const { t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClose = () => {
        setBody('');
        setError(null);
        onClose();
    };

    const handleSend = async () => {
        const trimmed = body.trim();
        if (!trimmed) {
            setError(t('smsMessageRequired') || 'Please enter your message');
            return;
        }
        setError(null);
        setSending(true);
        try {
            await sendLeadSMSAPI({ lead_id: leadId, phone_number: phoneNumber, body: trimmed });
            setSuccessMessage(t('smsSent') || 'SMS sent');
            setIsSuccessModalOpen(true);
            onSent?.();
            handleClose();
        } catch (e: any) {
            const errorKey = e?.data?.error_key;
            const localized = errorKey && t(errorKey) ? t(errorKey) : null;
            const fallback = stripAnsi(e?.message || '') || t('failedToSendSms');
            setError(localized || fallback);
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

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
                        onClick={handleSend}
                        disabled={sending}
                        className={sending ? 'min-w-[7rem]' : ''}
                        title={sending ? (t('sending') || 'Sending...') : undefined}
                    >
                        {sending ? (
                            <Loader variant="foreground" className="h-5" />
                        ) : (
                            t('sendSms') || 'Send SMS'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SendSMSModal;;
