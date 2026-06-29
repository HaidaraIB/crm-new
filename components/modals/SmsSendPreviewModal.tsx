import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Loader } from '../Loader';
import { getTwilioSettingsAPI } from '../../services/api';
import { maskPhoneForDisplay, smsProviderLabel } from '../../utils/smsSendHelpers';

export type SmsSendPreviewProps = {
    isOpen: boolean;
    onClose: () => void;
    onBack?: () => void;
    onConfirm: () => void;
    confirming?: boolean;
    phoneNumber: string;
    messageBody: string;
    recipientCount?: number;
    t: (key: string) => string;
};

export const SmsSendPreviewModal = ({
    isOpen,
    onClose,
    onBack,
    onConfirm,
    confirming = false,
    phoneNumber,
    messageBody,
    recipientCount = 1,
    t,
}: SmsSendPreviewProps) => {
    const { data: smsSettings, isLoading: settingsLoading } = useQuery({
        queryKey: ['twilioSettings', 'preview'],
        queryFn: getTwilioSettingsAPI,
        enabled: isOpen,
        staleTime: 30_000,
    });

    if (!isOpen) return null;

    const provider = smsProviderLabel(smsSettings?.provider);
    const senderId = (smsSettings?.sender_id || '').trim();
    const senderLabel = senderId || (t('smsSendPreviewSystemDefault') || 'System default');
    const maskedPhone = maskPhoneForDisplay(phoneNumber);
    const extraRecipients = recipientCount > 1 ? recipientCount - 1 : 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('smsSendPreviewTitle') || 'Confirm SMS'}
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('smsSendPreviewSubtitle') || 'Review the message below before sending.'}
                </p>
                <dl className="space-y-3 text-sm">
                    <div>
                        <dt className="font-medium text-gray-700 dark:text-gray-300">
                            {t('smsSendPreviewRecipient') || 'To'}
                        </dt>
                        <dd className="mt-0.5 text-gray-900 dark:text-white" dir="ltr">
                            {maskedPhone}
                            {extraRecipients > 0 && (
                                <span className="text-gray-500 dark:text-gray-400">
                                    {' '}
                                    {(t('smsSendPreviewMoreRecipients') || 'and {count} more recipients').replace(
                                        '{count}',
                                        String(extraRecipients),
                                    )}
                                </span>
                            )}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-700 dark:text-gray-300">
                            {t('smsSendPreviewMessage') || 'Message'}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-gray-900 dark:text-white">
                            {messageBody}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-700 dark:text-gray-300">
                            {t('smsSendPreviewProvider') || 'Provider'}
                        </dt>
                        <dd className="mt-0.5 text-gray-900 dark:text-white">
                            {settingsLoading ? (t('loading') || 'Loading…') : provider}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-medium text-gray-700 dark:text-gray-300">
                            {t('smsSendPreviewSenderId') || 'Sender ID'}
                        </dt>
                        <dd className="mt-0.5 text-gray-900 dark:text-white">
                            {settingsLoading ? (t('loading') || 'Loading…') : senderLabel}
                        </dd>
                    </div>
                </dl>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onBack ?? onClose} disabled={confirming}>
                        {t('cancel')}
                    </Button>
                    <Button onClick={onConfirm} disabled={confirming || settingsLoading} className={confirming ? 'min-w-[7rem]' : ''}>
                        {confirming ? (
                            <Loader variant="foreground" className="h-5" />
                        ) : (
                            t('smsSendPreviewConfirm') || 'Confirm send'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SmsSendPreviewModal;
