import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';

type StatusChangeReasonModalProps = {
    isOpen: boolean;
    /** Name of the status the lead is being moved into, shown for context. */
    statusName?: string;
    isSubmitting?: boolean;
    onCancel: () => void;
    onConfirm: (reason: string) => void;
};

/**
 * Collects the mandatory justification for moving a lead into a status that was
 * flagged `requires_change_reason` in settings. Drive it through
 * `useStatusChangeReason` rather than wiring it up per page.
 */
export const StatusChangeReasonModal = ({
    isOpen,
    statusName,
    isSubmitting = false,
    onCancel,
    onConfirm,
}: StatusChangeReasonModalProps) => {
    const { t, language } = useAppContext();
    const [draft, setDraft] = useState('');

    useEffect(() => {
        if (isOpen) setDraft('');
    }, [isOpen]);

    const canSubmit = draft.trim().length > 0 && !isSubmitting;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title={t('statusChangeReasonTitle')}
            overlayClassName="z-[110]"
        >
            <div className="space-y-3">
                {statusName && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('statusChangeReasonIntro').replace('{status}', statusName)}
                    </p>
                )}
                <div>
                    <label
                        htmlFor="statusChangeReason"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        {t('statusChangeReasonLabel')} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="statusChangeReason"
                        rows={3}
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        placeholder={t('statusChangeReasonPlaceholder')}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    {!draft.trim() && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            {t('statusChangeReasonRequired')}
                        </p>
                    )}
                </div>
                <div
                    className={`flex ${language === 'ar' ? 'flex-row-reverse' : ''} justify-end gap-2`}
                >
                    <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
                        {t('cancel')}
                    </Button>
                    <Button
                        onClick={() => onConfirm(draft.trim())}
                        disabled={!canSubmit}
                        loading={isSubmitting}
                    >
                        {t('statusChangeReasonConfirm')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
