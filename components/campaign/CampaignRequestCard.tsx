import React from 'react';
import { useAppContext } from '../../context/AppContext';
import type { CampaignRequest, CampaignRequestStatus } from '../../types';
import { formatDateTimeToLocal } from '../../utils/dateUtils';
import { IntegrationPlatformIcon } from '../integrations/IntegrationPlatformIcon';
import { CheckIcon, ClockIcon, FileTextIcon, UsersIcon } from '../icons';

/** Badge palette per lifecycle state; `dot` drives the small leading indicator. */
const STATUS_STYLES: Record<CampaignRequestStatus, { badge: string; dot: string }> = {
    pending_approval: {
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        dot: 'bg-amber-500',
    },
    approved: {
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        dot: 'bg-blue-500',
    },
    sending: {
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        dot: 'bg-blue-500 animate-pulse',
    },
    completed: {
        badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        dot: 'bg-green-500',
    },
    rejected: {
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        dot: 'bg-red-500',
    },
    failed: {
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        dot: 'bg-red-500',
    },
    sent: {
        badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        dot: 'bg-gray-500',
    },
};

const STATUS_LABEL_KEY: Record<CampaignRequestStatus, string> = {
    pending_approval: 'campaignRequestStatusPending',
    approved: 'campaignRequestStatusApproved',
    rejected: 'campaignRequestStatusRejected',
    sending: 'campaignRequestStatusSending',
    completed: 'campaignRequestStatusCompleted',
    failed: 'campaignRequestStatusFailed',
    sent: 'campaignRequestStatusCompleted',
};

interface CampaignRequestCardProps {
    request: CampaignRequest;
    /** Owner/approval queue shows who asked; the requester's own list does not. */
    showRequester?: boolean;
    /** Footer buttons (Approve/Reject, or Edit & resubmit). */
    actions?: React.ReactNode;
}

export function CampaignRequestCard({ request, showRequester = false, actions }: CampaignRequestCardProps) {
    const { t } = useAppContext();
    const statusStyle = STATUS_STYLES[request.status] ?? STATUS_STYLES.sent;
    const statusLabel = t(STATUS_LABEL_KEY[request.status] as any) || request.status;

    const total = Math.max(request.recipient_count, 1);
    const sentPct = Math.min(100, (request.sent_count / total) * 100);
    const failedPct = Math.min(100 - sentPct, (request.failed_count / total) * 100);
    const showProgress =
        request.status === 'sending' || request.status === 'completed' || request.status === 'failed';

    const hiddenRecipients = request.recipient_count - request.audience_preview.length;
    const submittedAt = request.resubmitted_at || request.submitted_at || request.created_at;

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 transition-colors hover:border-gray-300 dark:hover:border-gray-600">
            {/* Channel + template on the start side, lifecycle status on the end side */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200">
                        <IntegrationPlatformIcon
                            platform={request.channel === 'sms' ? 'sms' : 'whatsapp'}
                            size="sm"
                            variant="inline"
                        />
                        {request.channel === 'sms' ? t('campaignViaSms') : t('campaignViaWhatsApp')}
                    </span>
                    {request.template_name && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 dark:bg-primary/20 px-2.5 py-1 text-xs font-medium text-primary dark:text-primary-200 max-w-[16rem]">
                            <FileTextIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{request.template_name}</span>
                        </span>
                    )}
                </div>
                <span
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.badge}`}
                >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} aria-hidden />
                    {statusLabel}
                </span>
            </div>

            {/* Inline clamp rather than `line-clamp-3`: the Tailwind Play CDN version is
                not pinned, so this stays correct regardless of which build is served. */}
            <blockquote
                className="mt-3 rounded-lg border-s-4 border-primary/40 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words overflow-hidden"
                style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
            >
                {request.message_preview || (
                    <span className="italic text-gray-400 dark:text-gray-500">{t('campaignRequestNoMessage')}</span>
                )}
            </blockquote>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                {showRequester && request.requested_by && (
                    <span className="inline-flex items-center gap-1.5">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 dark:bg-primary/30 text-[10px] font-bold text-primary-700 dark:text-primary-100">
                            {request.requested_by.name.charAt(0).toUpperCase()}
                        </span>
                        {request.requested_by.name}
                    </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                    <UsersIcon className="w-3.5 h-3.5" />
                    {t('campaignRecipients').replace('{count}', String(request.recipient_count))}
                </span>
                {submittedAt && (
                    <span className="inline-flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {formatDateTimeToLocal(submittedAt)}
                    </span>
                )}
                {request.reviewed_by && request.reviewed_at && (
                    <span className="inline-flex items-center gap-1.5">
                        <CheckIcon className="w-3.5 h-3.5" />
                        {t('campaignReviewedBy').replace('{name}', request.reviewed_by.name)}
                    </span>
                )}
            </div>

            {request.audience_preview.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {request.audience_preview.map((recipient) => (
                        <span
                            key={recipient.client_id}
                            className="inline-flex max-w-[12rem] truncate rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
                        >
                            {recipient.name || `#${recipient.client_id}`}
                        </span>
                    ))}
                    {hiddenRecipients > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t('campaignMoreRecipients').replace('{count}', String(hiddenRecipients))}
                        </span>
                    )}
                </div>
            )}

            {showProgress && (
                <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>
                            {t('campaignSentCount')
                                .replace('{sent}', String(request.sent_count))
                                .replace('{failed}', String(request.failed_count))}
                        </span>
                        <span className="tabular-nums">
                            {request.sent_count + request.failed_count} / {request.recipient_count}
                        </span>
                    </div>
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div className="bg-green-500 transition-all" style={{ width: `${sentPct}%` }} />
                        <div className="bg-red-500 transition-all" style={{ width: `${failedPct}%` }} />
                    </div>
                </div>
            )}

            {request.status === 'rejected' && request.rejection_reason && (
                <div className="mt-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/20 px-3 py-2">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                        {t('campaignRejectionReasonLabel')}
                    </p>
                    <p className="mt-0.5 text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap break-words">
                        {request.rejection_reason}
                    </p>
                </div>
            )}

            {actions && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                    {actions}
                </div>
            )}
        </div>
    );
}
