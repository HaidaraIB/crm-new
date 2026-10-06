import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AutoDirTextarea } from '../../components/Input';
import { useAppContext } from '../../context/AppContext';
import { usePersistedTab } from '../../hooks/usePersistedTab';
import { PageWrapper, Card, Button, Modal, PlusIcon, Loader } from '../../components/index';
import { ChatBubbleIcon, CheckIcon, EditIcon, FileTextIcon, MegaphoneIcon, ClockIcon, RefreshIcon, XIcon } from '../../components/icons';
import { marketingAccentIconClass, IntegrationPlatformIcon } from '../../components/integrations/IntegrationPlatformIcon';
import { CampaignRequestCard } from '../../components/campaign/CampaignRequestCard';
import { CampaignLeadPicker } from '../../components/campaign/CampaignLeadPicker';
import { TemplateManagementSettings } from '../settings/TemplateManagementSettings';
import { QuickRepliesManager } from '../../components/chat/QuickRepliesPanel';
import { MessageLogsPanel } from '../../components/messaging/MessageLogsPanel';
import { SmsSendPreviewModal } from '../../components/modals/SmsSendPreviewModal';
import { replaceSmsTemplatePlaceholders, leadHasPhone, resolveLeadPhoneRaw } from '../../utils/smsSendHelpers';
import { normalizeChatPhone } from '../../utils/whatsappManualChatsStorage';
import {
    getMessageTemplatesAPI,
    sendWhatsAppTemplateAPI,
    sendLeadSMSAPI,
    getWhatsAppLimitsAPI,
    getTwilioSettingsAPI,
    resolveLocalizedApiError,
    createCampaignBatchAPI,
    completeCampaignBatchAPI,
    recordCampaignFailureAPI,
    submitCampaignRequestAPI,
    listCampaignRequestsAPI,
    listPendingCampaignRequestsAPI,
    approveCampaignRequestAPI,
    rejectCampaignRequestAPI,
    resubmitCampaignRequestAPI,
    type MessageTemplateType,
} from '../../services/api';
import type { CampaignRequest } from '../../types';

export const MessagingCenterPage = () => {
    const {
        t,
        currentUser,
        setAlertMessage,
        setAlertVariant,
        setIsAlertModalOpen,
    } = useAppContext();
    const queryClient = useQueryClient();
    const showAlert = (message: React.ReactNode, variant: 'info' | 'warning' | 'error' = 'info') => {
        setAlertMessage(message);
        setAlertVariant(variant);
        setIsAlertModalOpen(true);
    };
    const getClientPhone = (c: { phone_number?: string; phone?: string }) => normalizeChatPhone(c);

    const MESSAGING_TABS = ['campaign', 'template', 'quickReplies', 'logs', 'requests'] as const;
    const [messagingCenterTab, setMessagingCenterTabPersisted] = usePersistedTab<
        'campaign' | 'template' | 'quickReplies' | 'logs' | 'requests'
    >('messagingCenter', MESSAGING_TABS, 'campaign', ['messaging_center_tab']);
    const [campaignSelectedIds, setCampaignSelectedIds] = useState<Set<number>>(new Set());
    const [campaignChannel, setCampaignChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
    const [campaignMessage, setCampaignMessage] = useState('');
    const [campaignWhatsAppTemplateId, setCampaignWhatsAppTemplateId] = useState<number | null>(null);
    const [campaignSending, setCampaignSending] = useState(false);
    const [campaignProgress, setCampaignProgress] = useState<{ sent: number; failed: number } | null>(null);
    const [smsCampaignPreview, setSmsCampaignPreview] = useState<{
        leads: any[];
        message: string;
        previewBody: string;
        previewPhone: string;
    } | null>(null);
    const isRestrictedCampaignRole = currentUser?.requires_campaign_approval === true;
    const [campaignRequestSubmitting, setCampaignRequestSubmitting] = useState(false);
    const [editingCampaignRequestId, setEditingCampaignRequestId] = useState<number | null>(null);
    const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);
    const [rejectReasonDraft, setRejectReasonDraft] = useState('');
    const [reviewingRequestId, setReviewingRequestId] = useState<number | null>(null);
    const [campaignRequestFilter, setCampaignRequestFilter] = useState<'all' | CampaignRequest['status']>('all');

    const { data: myCampaignRequestsData, refetch: refetchMyCampaignRequests } = useQuery({
        queryKey: ['myCampaignRequests'],
        queryFn: () => listCampaignRequestsAPI(),
        enabled: isRestrictedCampaignRole,
    });
    const myCampaignRequests = myCampaignRequestsData?.results ?? [];
    const { data: pendingCampaignRequestsData, refetch: refetchPendingCampaignRequests } = useQuery({
        queryKey: ['pendingCampaignRequests'],
        queryFn: listPendingCampaignRequestsAPI,
        enabled: !isRestrictedCampaignRole,
    });
    const pendingCampaignRequests = pendingCampaignRequestsData?.results ?? [];
    const visibleCampaignRequests = useMemo(() => {
        if (!isRestrictedCampaignRole) return pendingCampaignRequests;
        if (campaignRequestFilter === 'all') return myCampaignRequests;
        return myCampaignRequests.filter((r: CampaignRequest) => r.status === campaignRequestFilter);
    }, [isRestrictedCampaignRole, pendingCampaignRequests, myCampaignRequests, campaignRequestFilter]);

    const { data: templates = [] } = useQuery({
        queryKey: ['messageTemplates'],
        queryFn: getMessageTemplatesAPI,
    });
    const approvedWaTemplates = useMemo(
        () => (templates as MessageTemplateType[]).filter((tpl) => {
            const ch = (tpl.channel_type || '').toLowerCase();
            if (ch !== 'whatsapp' && ch !== 'whatsapp_api') return false;
            return (tpl.meta_status || '').toUpperCase() === 'APPROVED';
        }),
        [templates],
    );
    const { data: whatsAppLimits } = useQuery({
        queryKey: ['whatsAppLimits'],
        queryFn: getWhatsAppLimitsAPI,
        enabled: campaignChannel === 'whatsapp',
    });
    useEffect(() => {
        setCampaignWhatsAppTemplateId(null);
    }, [campaignChannel]);

    const { data: smsSettings } = useQuery({
        queryKey: ['twilioSettings'],
        queryFn: getTwilioSettingsAPI,
        enabled: campaignChannel === 'sms',
    });

    const runCampaignSend = async (
        withPhone: any[],
        message: string,
        isSmsCampaign: boolean,
        waTemplateId: number | null = campaignWhatsAppTemplateId,
    ) => {
        setCampaignSending(true);
        setCampaignProgress({ sent: 0, failed: 0 });
        let sent = 0;
        let failed = 0;
        const tenantCompany = currentUser?.company?.name || '';
        const channel = isSmsCampaign ? 'sms' : 'whatsapp';
        let batchId: number | null = null;

        const recordFailure = async (lead: any, phone: string, err: unknown) => {
            failed++;
            if (!batchId) return;
            try {
                await recordCampaignFailureAPI(batchId, {
                    client_id: lead.id,
                    phone_number: phone,
                    error: resolveLocalizedApiError(err as any, t, t('sendFailed')),
                });
            } catch {
                /* best-effort failure log */
            }
        };

        try {
            const batch = await createCampaignBatchAPI({
                channel,
                message_preview: message.slice(0, 200),
                recipient_count: withPhone.length,
            });
            batchId = batch.id;

            for (const lead of withPhone) {
                const phone = getClientPhone(lead);
                const body = replaceSmsTemplatePlaceholders(message, lead, tenantCompany);
                try {
                    if (isSmsCampaign) {
                        await sendLeadSMSAPI({
                            lead_id: lead.id,
                            phone_number: phone,
                            body,
                            send_source: 'campaign',
                            campaign_batch_id: batchId,
                        });
                    } else if (waTemplateId) {
                        await sendWhatsAppTemplateAPI({
                            to: phone,
                            template_id: waTemplateId,
                            client_id: lead.id,
                            send_source: 'campaign',
                            campaign_batch_id: batchId,
                        });
                    } else {
                        throw {
                            code: 'whatsapp_campaign_template_required',
                            message: t('campaignWhatsAppTemplateRequired'),
                        };
                    }
                    sent++;
                } catch (err) {
                    await recordFailure(lead, phone, err);
                }
                setCampaignProgress({ sent, failed });
                // Light pacing to reduce Meta rate-limit / quality hits on large batches.
                if (!isSmsCampaign) {
                    await new Promise((r) => setTimeout(r, 250));
                }
            }

            if (batchId) {
                await completeCampaignBatchAPI(batchId, { sent_count: sent, failed_count: failed });
            }
            queryClient.invalidateQueries({ queryKey: ['messageLogs'] });
        } catch (err) {
            showAlert(resolveLocalizedApiError(err as any, t, t('campaignSendFailed')), 'error');
        } finally {
            setCampaignSending(false);
            setSmsCampaignPreview(null);
        }

        showAlert(
            t('campaignComplete') +
                ' — ' +
                t('campaignSentCount').replace('{sent}', String(sent)).replace('{failed}', String(failed)),
            failed > 0 && sent === 0 ? 'warning' : 'info',
        );
    };

    const getSelectedCampaignLeads = () => {
        const leadById = new Map<number, any>();
        for (const [, data] of queryClient.getQueriesData({ queryKey: ['campaignLeads'] })) {
            const list = (data as any)?.results ?? (Array.isArray(data) ? data : []);
            for (const lead of list) leadById.set(lead.id, lead);
        }
        return [...campaignSelectedIds].map((id) => leadById.get(id)).filter(Boolean);
    };

    const handleCampaignSend = async () => {
        const selected = getSelectedCampaignLeads();
        const withPhone = selected.filter((l: any) => leadHasPhone(l));
        if (withPhone.length === 0) {
            showAlert(t('selectAtLeastOneLead'), 'warning');
            return;
        }
        const message = campaignMessage.trim();
        const isSmsCampaign = campaignChannel === 'sms';

        if (isSmsCampaign) {
            if (!smsSettings?.is_enabled) {
                showAlert(t('sms_error_not_configured'), 'warning');
                return;
            }
            if (!message) {
                showAlert(t('enterMessageOrSelectTemplate'), 'warning');
                return;
            }
            const first = withPhone[0];
            const previewBody = replaceSmsTemplatePlaceholders(message, first, currentUser?.company?.name);
            setSmsCampaignPreview({
                leads: withPhone,
                message,
                previewBody,
                previewPhone: resolveLeadPhoneRaw(first),
            });
            return;
        }

        if (!campaignWhatsAppTemplateId) {
            showAlert(t('campaignWhatsAppTemplateRequired'), 'warning');
            return;
        }
        const tplContent =
            approvedWaTemplates.find((tpl) => tpl.id === campaignWhatsAppTemplateId)?.content || message || '';
        await runCampaignSend(withPhone, tplContent, false);
    };

    const handleConfirmSmsCampaign = async () => {
        if (!smsCampaignPreview) return;
        await runCampaignSend(smsCampaignPreview.leads, smsCampaignPreview.message, true);
    };

    // Restricted staff: submit (or resubmit, after a rejection) a bulk-send request
    // for the owner to approve, instead of sending instantly like runCampaignSend.
    const handleSubmitCampaignRequest = async () => {
        const selected = getSelectedCampaignLeads();
        const withPhone = selected.filter((l: any) => leadHasPhone(l));
        if (withPhone.length === 0) {
            showAlert(t('selectAtLeastOneLead'), 'warning');
            return;
        }
        const message = campaignMessage.trim();
        const isSmsCampaign = campaignChannel === 'sms';

        if (isSmsCampaign) {
            if (!smsSettings?.is_enabled) {
                showAlert(t('sms_error_not_configured'), 'warning');
                return;
            }
            if (!message) {
                showAlert(t('enterMessageOrSelectTemplate'), 'warning');
                return;
            }
        } else if (!campaignWhatsAppTemplateId) {
            showAlert(t('campaignWhatsAppTemplateRequired'), 'warning');
            return;
        }

        const tplContent = approvedWaTemplates.find((tpl) => tpl.id === campaignWhatsAppTemplateId)?.content || '';
        const payload = {
            channel: (isSmsCampaign ? 'sms' : 'whatsapp') as 'sms' | 'whatsapp',
            message_preview: (message || tplContent).slice(0, 200),
            recipients: withPhone.map((lead: any) => ({
                client_id: lead.id,
                phone_number: getClientPhone(lead),
            })),
            message_payload: isSmsCampaign
                ? { body: message }
                : { template_id: campaignWhatsAppTemplateId },
        };

        setCampaignRequestSubmitting(true);
        try {
            if (editingCampaignRequestId) {
                await resubmitCampaignRequestAPI(editingCampaignRequestId, payload);
            } else {
                await submitCampaignRequestAPI(payload);
            }
            showAlert(t('campaignRequestSubmitted'), 'info');
            setCampaignSelectedIds(new Set());
            setCampaignMessage('');
            setCampaignWhatsAppTemplateId(null);
            setEditingCampaignRequestId(null);
            refetchMyCampaignRequests();
            setMessagingCenterTabPersisted('requests');
        } catch (err) {
            showAlert(resolveLocalizedApiError(err as any, t, t('campaignSendFailed')), 'error');
        } finally {
            setCampaignRequestSubmitting(false);
        }
    };

    const handleEditAndResubmitRequest = (request: CampaignRequest) => {
        const payload = request.message_payload || {};
        setCampaignChannel(request.channel);
        setCampaignMessage(
            request.channel === 'sms'
                ? String(payload.body ?? request.message_preview ?? '')
                : String(payload.body ?? ''),
        );
        setCampaignWhatsAppTemplateId(
            request.channel === 'whatsapp' ? Number(payload.template_id) || null : null,
        );
        // Restore the original audience so the requester edits rather than rebuilds it.
        setCampaignSelectedIds(new Set(request.audience_client_ids));
        setEditingCampaignRequestId(request.id);
        setMessagingCenterTabPersisted('campaign');
    };

    const handleApproveCampaignRequest = async (requestId: number) => {
        setReviewingRequestId(requestId);
        try {
            await approveCampaignRequestAPI(requestId);
            showAlert(t('campaignRequestApproved'), 'info');
            refetchPendingCampaignRequests();
        } catch (err) {
            showAlert(resolveLocalizedApiError(err as any, t, t('campaignSendFailed')), 'error');
        } finally {
            setReviewingRequestId(null);
        }
    };

    const handleRejectCampaignRequest = async () => {
        if (!rejectingRequestId || !rejectReasonDraft.trim()) return;
        setReviewingRequestId(rejectingRequestId);
        try {
            await rejectCampaignRequestAPI(rejectingRequestId, rejectReasonDraft.trim());
            showAlert(t('campaignRequestRejected'), 'info');
            setRejectingRequestId(null);
            setRejectReasonDraft('');
            refetchPendingCampaignRequests();
        } catch (err) {
            showAlert(resolveLocalizedApiError(err as any, t, t('campaignSendFailed')), 'error');
        } finally {
            setReviewingRequestId(null);
        }
    };


    const smsCampaignPreviewModal = smsCampaignPreview ? (
        <SmsSendPreviewModal
            isOpen={!!smsCampaignPreview}
            onClose={() => setSmsCampaignPreview(null)}
            onConfirm={handleConfirmSmsCampaign}
            confirming={campaignSending}
            phoneNumber={smsCampaignPreview.previewPhone}
            messageBody={smsCampaignPreview.previewBody}
            recipientCount={smsCampaignPreview.leads.length}
            t={t}
        />
    ) : null;
        return (
            <PageWrapper
                title={t('messagingCenter')}
                subtitle={t('messagingCenterDesc')}
                titleIcon={
                    <span className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/12 dark:bg-primary/25 ring-1 ring-primary/25 dark:ring-primary/40 flex items-center justify-center">
                        <MegaphoneIcon className={`w-7 h-7 ${marketingAccentIconClass}`} />
                    </span>
                }
                helpVideoPageKey="messaging_center"
            >
                <div className="flex border-b border-gray-200 dark:border-gray-700 gap-1 mb-4">
                    <button
                        type="button"
                        onClick={() => setMessagingCenterTabPersisted('campaign')}
                        className={`px-4 py-2 rounded-t flex items-center gap-2 text-sm font-medium ${messagingCenterTab === 'campaign' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        <MegaphoneIcon className={`w-4 h-4 shrink-0 ${messagingCenterTab === 'campaign' ? 'text-white' : marketingAccentIconClass}`} /> {t('messageCampaign')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMessagingCenterTabPersisted('template')}
                        className={`px-4 py-2 rounded-t flex items-center gap-2 text-sm font-medium ${messagingCenterTab === 'template' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        <FileTextIcon className={`w-4 h-4 shrink-0 ${messagingCenterTab === 'template' ? 'text-white' : marketingAccentIconClass}`} /> {t('template')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMessagingCenterTabPersisted('quickReplies')}
                        className={`px-4 py-2 rounded-t flex items-center gap-2 text-sm font-medium ${messagingCenterTab === 'quickReplies' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        <ChatBubbleIcon className={`w-4 h-4 shrink-0 ${messagingCenterTab === 'quickReplies' ? 'text-white' : marketingAccentIconClass}`} /> {t('quickReplies')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMessagingCenterTabPersisted('logs')}
                        className={`px-4 py-2 rounded-t flex items-center gap-2 text-sm font-medium ${messagingCenterTab === 'logs' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        <ClockIcon className={`w-4 h-4 shrink-0 ${messagingCenterTab === 'logs' ? 'text-white' : marketingAccentIconClass}`} /> {t('messageLogs')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMessagingCenterTabPersisted('requests')}
                        className={`px-4 py-2 rounded-t flex items-center gap-2 text-sm font-medium ${messagingCenterTab === 'requests' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        <ClockIcon className={`w-4 h-4 shrink-0 ${messagingCenterTab === 'requests' ? 'text-white' : marketingAccentIconClass}`} />
                        {isRestrictedCampaignRole ? t('messagingCenterMyRequests') : t('messagingCenterPendingApprovals')}
                        {!isRestrictedCampaignRole && pendingCampaignRequests.length > 0 && (
                            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                                {pendingCampaignRequests.length}
                            </span>
                        )}
                    </button>
                </div>
                {messagingCenterTab === 'template' ? (
                    <TemplateManagementSettings />
                ) : messagingCenterTab === 'quickReplies' ? (
                    <QuickRepliesManager />
                ) : messagingCenterTab === 'logs' ? (
                    <MessageLogsPanel />
                ) : messagingCenterTab === 'requests' ? (
                    <div className="space-y-3">
                        {/* Summary strip: what's waiting, and how many people it reaches. */}
                        <Card className="p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 dark:bg-primary/25 ring-1 ring-primary/25">
                                        <ClockIcon className={`w-5 h-5 ${marketingAccentIconClass}`} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {isRestrictedCampaignRole
                                                ? t('messagingCenterMyRequests')
                                                : t('messagingCenterPendingApprovals')}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {isRestrictedCampaignRole
                                                ? t('campaignMyRequestsHint')
                                                : t('campaignPendingApprovalsHint')
                                                      .replace('{count}', String(pendingCampaignRequests.length))
                                                      .replace(
                                                          '{recipients}',
                                                          String(
                                                              pendingCampaignRequests.reduce(
                                                                  (sum: number, r: CampaignRequest) => sum + r.recipient_count,
                                                                  0,
                                                              ),
                                                          ),
                                                      )}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="secondary"
                                    onClick={() =>
                                        isRestrictedCampaignRole
                                            ? refetchMyCampaignRequests()
                                            : refetchPendingCampaignRequests()
                                    }
                                >
                                    <RefreshIcon className="w-4 h-4" /> {t('refresh')}
                                </Button>
                            </div>

                            {/* Requester-only status filter; the owner queue is pending-only by definition. */}
                            {isRestrictedCampaignRole && myCampaignRequests.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-200 dark:border-gray-700 pt-3">
                                    {([
                                        ['all', t('all')],
                                        ['pending_approval', t('campaignRequestStatusPending')],
                                        ['approved', t('campaignRequestStatusApproved')],
                                        ['completed', t('campaignRequestStatusCompleted')],
                                        ['rejected', t('campaignRequestStatusRejected')],
                                    ] as const).map(([value, label]) => {
                                        const count =
                                            value === 'all'
                                                ? myCampaignRequests.length
                                                : myCampaignRequests.filter((r: CampaignRequest) => r.status === value).length;
                                        if (count === 0 && value !== 'all') return null;
                                        const active = campaignRequestFilter === value;
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setCampaignRequestFilter(value)}
                                                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                                    active
                                                        ? 'border-primary/70 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-100'
                                                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                {label} <span className="opacity-70">({count})</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        {visibleCampaignRequests.length === 0 ? (
                            <Card className="p-10 text-center">
                                <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700/60">
                                    <MegaphoneIcon className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                                </span>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                    {isRestrictedCampaignRole ? t('campaignNoRequestsYet') : t('campaignNoPendingRequests')}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {isRestrictedCampaignRole
                                        ? t('campaignNoRequestsYetHint')
                                        : t('campaignNoPendingRequestsHint')}
                                </p>
                                {isRestrictedCampaignRole && (
                                    <Button className="mt-4 mx-auto" onClick={() => setMessagingCenterTabPersisted('campaign')}>
                                        <PlusIcon className="w-4 h-4" /> {t('messageCampaign')}
                                    </Button>
                                )}
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {visibleCampaignRequests.map((request: CampaignRequest) => (
                                    <CampaignRequestCard
                                        key={request.id}
                                        request={request}
                                        showRequester={!isRestrictedCampaignRole}
                                        actions={
                                            isRestrictedCampaignRole ? (
                                                request.status === 'rejected' ? (
                                                    <Button variant="secondary" onClick={() => handleEditAndResubmitRequest(request)}>
                                                        <EditIcon className="w-4 h-4" /> {t('campaignEditAndResubmit')}
                                                    </Button>
                                                ) : null
                                            ) : request.status === 'pending_approval' ? (
                                                <>
                                                    <Button
                                                        variant="danger"
                                                        onClick={() => {
                                                            setRejectingRequestId(request.id);
                                                            setRejectReasonDraft('');
                                                        }}
                                                        disabled={reviewingRequestId === request.id}
                                                    >
                                                        <XIcon className="w-4 h-4" /> {t('campaignReject')}
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleApproveCampaignRequest(request.id)}
                                                        loading={reviewingRequestId === request.id}
                                                        disabled={reviewingRequestId != null}
                                                    >
                                                        <CheckIcon className="w-4 h-4" /> {t('campaignApprove')}
                                                    </Button>
                                                </>
                                            ) : null
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                <div className="space-y-4">
                    {isRestrictedCampaignRole && (
                        editingCampaignRequestId ? (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                                <p className="text-sm text-amber-900 dark:text-amber-200">
                                    <EditIcon className="inline w-4 h-4 me-1.5 align-text-bottom" />
                                    {t('campaignEditingRequestBanner').replace('{id}', String(editingCampaignRequestId))}
                                </p>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setEditingCampaignRequestId(null);
                                        setCampaignSelectedIds(new Set());
                                        setCampaignMessage('');
                                        setCampaignWhatsAppTemplateId(null);
                                    }}
                                >
                                    {t('campaignCancelEdit')}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                                <ClockIcon className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-300 mt-0.5" />
                                <p className="text-sm text-blue-900 dark:text-blue-200">
                                    {t('campaignApprovalRequiredBanner')}
                                </p>
                            </div>
                        )
                    )}
                    <Card className="overflow-hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
                            <CampaignLeadPicker
                                enabled={messagingCenterTab === 'campaign'}
                                selectedIds={campaignSelectedIds}
                                onSelectedIdsChange={setCampaignSelectedIds}
                                forceAssignedToMe={isRestrictedCampaignRole}
                            />
                            <div className="flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('campaignSendVia')}</label>
                                <div className="flex gap-2 mb-3">
                                    <button type="button" onClick={() => setCampaignChannel('whatsapp')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm font-medium ${campaignChannel === 'whatsapp' ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-200' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}><IntegrationPlatformIcon platform="whatsapp" size="sm" variant="inline" /> {t('campaignViaWhatsApp')}</button>
                                    <button type="button" onClick={() => setCampaignChannel('sms')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm font-medium ${campaignChannel === 'sms' ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-200' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}><IntegrationPlatformIcon platform="sms" size="sm" variant="inline" /> {t('campaignViaSms')}</button>
                                </div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('quickTemplates')}</label>
                                {(() => {
                                    const isSms = campaignChannel === 'sms';
                                    const campaignTemplates = (templates as any[]).filter((tpl: any) => { const ch = (tpl.channel_type || '').toLowerCase(); return isSms ? ch === 'sms' : (ch === 'whatsapp' || ch === 'whatsapp_api'); });
                                    if (campaignTemplates.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{isSms ? t('noSmsTemplatesYet') : t('noWhatsAppTemplatesYet')}</p>;
                                    return <div className="flex flex-wrap gap-2 mb-3">{campaignTemplates.map((tpl: any) => (<button key={tpl.id} type="button" onClick={() => { const content = tpl.content || ''; setCampaignMessage((prev) => (prev ? prev + '\n' + content : content)); if (!isSms && (tpl.meta_status || '').toUpperCase() === 'APPROVED') setCampaignWhatsAppTemplateId(tpl.id); }} className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">{tpl.name}</button>))}</div>;
                                })()}
                                {campaignChannel === 'whatsapp' && (
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('campaignWhatsAppTemplateLabel')}</label>
                                        <select
                                            value={campaignWhatsAppTemplateId ?? ''}
                                            onChange={(e) => {
                                                const id = e.target.value ? Number(e.target.value) : null;
                                                setCampaignWhatsAppTemplateId(id);
                                                if (id) {
                                                    const tpl = approvedWaTemplates.find((t) => t.id === id);
                                                    if (tpl?.content) setCampaignMessage(tpl.content);
                                                }
                                            }}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-900 dark:text-white"
                                        >
                                            <option value="">{t('campaignWhatsAppSessionMessage')}</option>
                                            {approvedWaTemplates.map((tpl) => (
                                                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                                            {campaignWhatsAppTemplateId
                                                ? t('campaignWhatsAppTemplateHint')
                                                : t('campaignWhatsAppSessionOnlyHint')}
                                        </p>
                                    </div>
                                )}
                                {campaignChannel === 'sms' && smsSettings && !smsSettings.is_enabled && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">{t('sms_error_not_configured')}</p>
                                )}
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 mt-1">{t('messageContent')}</label>
                                <AutoDirTextarea value={campaignMessage} onChange={(e) => setCampaignMessage(e.target.value)} rows={6} placeholder={t('messageContent')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm resize-y" />
                                {campaignChannel === 'whatsapp' && whatsAppLimits?.messaging_limit_tier && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('whatsAppMessagingLimit')}: {whatsAppLimits.messaging_limit_tier === 'TIER_250' ? '250' : whatsAppLimits.messaging_limit_tier === 'TIER_1K' ? '1,000' : whatsAppLimits.messaging_limit_tier === 'TIER_10K' ? '10,000' : whatsAppLimits.messaging_limit_tier === 'TIER_100K' ? '100,000' : whatsAppLimits.messaging_limit_tier} {t('conversationsPerDay')}{whatsAppLimits.quality_rating && ` · ${t('quality')}: ${whatsAppLimits.quality_rating}`}</p>}
                                {campaignProgress !== null && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('campaignSentCount').replace('{sent}', String(campaignProgress.sent)).replace('{failed}', String(campaignProgress.failed))}</p>}
                                {isRestrictedCampaignRole ? (
                                    <Button className="mt-3" onClick={handleSubmitCampaignRequest} disabled={campaignRequestSubmitting}>
                                        {campaignRequestSubmitting ? (
                                            <><Loader size="sm" variant="primary" className="me-2" /> {t('campaignSending')}</>
                                        ) : (
                                            <>{editingCampaignRequestId ? t('campaignEditAndResubmit') : t('messagingCenterSubmitForApproval')} ({campaignSelectedIds.size})</>
                                        )}
                                    </Button>
                                ) : (
                                    <Button className="mt-3" onClick={handleCampaignSend} disabled={campaignSending}>
                                        {campaignSending ? <><Loader size="sm" variant="primary" className="me-2" /> {t('campaignSending')}</> : <>{t('sendToSelected')} ({campaignSelectedIds.size})</>}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
                )}
                {smsCampaignPreviewModal}
                {rejectingRequestId != null && (
                    <Modal
                        isOpen={rejectingRequestId != null}
                        onClose={() => setRejectingRequestId(null)}
                        title={t('campaignReject')}
                    >
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('campaignRejectionReasonLabel')}
                            </label>
                            <AutoDirTextarea
                                value={rejectReasonDraft}
                                onChange={(e) => setRejectReasonDraft(e.target.value)}
                                rows={3}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm resize-y"
                                placeholder={t('campaignRejectionReasonLabel')}
                            />
                            {!rejectReasonDraft.trim() && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">{t('campaignRejectionReasonRequired')}</p>
                            )}
                            <div className="flex justify-end gap-2">
                                <Button variant="secondary" onClick={() => setRejectingRequestId(null)}>
                                    {t('cancel')}
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleRejectCampaignRequest}
                                    disabled={!rejectReasonDraft.trim() || reviewingRequestId === rejectingRequestId}
                                >
                                    {t('campaignReject')}
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )}
            </PageWrapper>
        );
};
