import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Loader } from '../Loader';
import { sendWhatsAppMessageAPI } from '../../services/api';

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
    onSent?: () => void;
};

export const SendWhatsAppModal = ({ isOpen, onClose, leadId, phoneNumber, onSent }: SendWhatsAppModalProps) => {
    const { t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClose = () => {
        setBody('');
        setError(null);
        onClose();
    };

    const to = (phoneNumber || '').replace(/\s+/g, '').replace(/^\+/, '');

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
        setError(null);
        setSending(true);
        try {
            await sendWhatsAppMessageAPI({ to, message: trimmed, client_id: leadId });
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
                <div>
                    <Label htmlFor="wa-body">{t('smsMessage')}</Label>
                    <textarea
                        id="wa-body"
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
                            t('sendSms') || 'Send'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SendWhatsAppModal;
