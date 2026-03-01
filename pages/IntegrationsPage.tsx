

import React, { useMemo, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, Modal, PlusIcon, FacebookIcon, TikTokIcon, WhatsappIcon, TrashIcon, SettingsIcon, Loader, SmsIcon } from '../components/index';
import { EyeIcon, EyeOffIcon } from '../components/icons';
import { Page } from '../types';
import { connectIntegrationAccountAPI, getConnectedAccountsAPI, getConnectedAccountAPI, syncMetaPagesAPI, getTikTokLeadgenConfigAPI, getTwilioSettingsAPI, updateTwilioSettingsAPI, getMessageTemplatesAPI, sendWhatsAppMessageAPI, deleteMessageTemplateAPI } from '../services/api';
import type { MessageTemplateType } from '../services/api';
import { useConnectedAccounts, useDeleteConnectedAccount, useTestConnection } from '../hooks/useQueries';
import { useQuery } from '@tanstack/react-query';
import { SelectLeadFormModal } from '../components/modals/SelectLeadFormModal';
import { EditTemplateModal } from '../components/modals/EditTemplateModal';
import { StartNewConversationModal } from '../components/modals/StartNewConversationModal';
import { FileTextIcon, SearchIcon, EditIcon } from '../components/icons';

type Account = { id: number; name: string; status: string; link?: string; platform?: string; };

type PlatformDetails = {
    name: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    accounts: Account[];
    dataKey: keyof ReturnType<typeof useAppContext>['connectedAccounts'];
};

const platformConfig: Record<string, { name: string, icon: React.FC<React.SVGProps<SVGSVGElement>>, dataKey: keyof ReturnType<typeof useAppContext>['connectedAccounts'] }> = {
    'Meta': { name: 'Meta', icon: FacebookIcon, dataKey: 'facebook' },
    'TikTok': { name: 'TikTok', icon: TikTokIcon, dataKey: 'tiktok' },
    'WhatsApp': { name: 'WhatsApp', icon: WhatsappIcon, dataKey: 'whatsapp' },
};

function TwilioSMSForm({ t, replaceTwilio }: { t: (key: string) => string; replaceTwilio: (str: string) => string }) {
    const [accountSid, setAccountSid] = useState('');
    const [twilioNumber, setTwilioNumber] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [senderId, setSenderId] = useState('');
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showAccountSid, setShowAccountSid] = useState(false);
    const [showAuthToken, setShowAuthToken] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getTwilioSettingsAPI()
            .then((data) => {
                if (!cancelled) {
                    setAccountSid(data.account_sid || '');
                    setTwilioNumber(data.twilio_number || '');
                    setAuthToken('');
                    setSenderId(data.sender_id || '');
                    setIsEnabled(!!data.is_enabled);
                }
            })
            .catch(() => { if (!cancelled) setError(t('failedToLoadTwilioSettings')); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handleSave = () => {
        setError(null);
        setSuccess(false);
        setSaving(true);
        updateTwilioSettingsAPI({
            account_sid: accountSid || undefined,
            twilio_number: twilioNumber || undefined,
            auth_token: authToken || undefined,
            sender_id: senderId || undefined,
            is_enabled: isEnabled,
        })
            .then(() => { setSuccess(true); setAuthToken(''); })
            .catch((e: any) => setError(e?.message || t('failedToSaveTwilioSettings')))
            .finally(() => setSaving(false));
    };

    if (loading) {
        return (
            <Card>
                <div className="flex justify-center py-12"><Loader variant="primary" className="h-8" /></div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <SmsIcon className="w-10 h-10 text-primary" />
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {replaceTwilio(t('twilioSmsIntegration'))}
                        </h2>
                        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
                            {replaceTwilio(t('twilioOnlyNote'))}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsEnabled(!isEnabled)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                    >
                        {isEnabled && <span className="w-2 h-2 rounded-full bg-green-500" />}
                        {t('twilioIntegrationEnabled')}
                    </button>
                </div>

                <div className="grid gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accountSid')}</label>
                        <div className="relative">
                            <input
                                type={showAccountSid ? 'text' : 'password'}
                                value={accountSid}
                                onChange={(e) => setAccountSid(e.target.value)}
                                autoComplete="off"
                                data-form-type="other"
                                data-lpignore="true"
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 pr-10 text-sm"
                                placeholder={t('accountSidPlaceholder')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowAccountSid(!showAccountSid)}
                                className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title={showAccountSid ? (t('hide') || 'Hide') : (t('show') || 'Show')}
                            >
                                {showAccountSid ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{replaceTwilio(t('twilioNumber'))}</label>
                        <input
                            type="text"
                            value={twilioNumber}
                            onChange={(e) => setTwilioNumber(e.target.value)}
                            autoComplete="off"
                            data-form-type="other"
                            data-lpignore="true"
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                            placeholder={t('twilioNumberPlaceholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('authToken')}</label>
                        <div className="relative">
                            <input
                                type={showAuthToken ? 'text' : 'password'}
                                value={authToken}
                                onChange={(e) => setAuthToken(e.target.value)}
                                autoComplete="new-password"
                                data-form-type="other"
                                data-lpignore="true"
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 pr-10 text-sm"
                                placeholder={t('leaveBlankToKeepCurrent')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowAuthToken(!showAuthToken)}
                                className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title={showAuthToken ? (t('hide') || 'Hide') : (t('show') || 'Show')}
                            >
                                {showAuthToken ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('senderId')}</label>
                        <input
                            type="text"
                            value={senderId}
                            onChange={(e) => setSenderId(e.target.value)}
                            autoComplete="off"
                            data-form-type="other"
                            data-lpignore="true"
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                            placeholder={t('senderIdPlaceholder')}
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                {success && <p className="text-sm text-green-600 dark:text-green-400">{t('saveSucceeded')}</p>}

                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader variant="primary" className="h-4 w-4" /> : t('save')}
                </Button>
            </div>
        </Card>
    );
}

export const IntegrationsPage = () => {
    const { 
        t, 
        language,
        currentPage, 
        currentUser,
        setIsManageIntegrationAccountModalOpen, 
        setEditingAccount, 
        setConfirmDeleteConfig, 
        setIsConfirmDeleteModalOpen,
        isSelectLeadFormModalOpen,
        setIsSelectLeadFormModalOpen,
        selectLeadFormConfig,
        setSelectLeadFormConfig,
        pendingConnectAccountId,
        setPendingConnectAccountId,
        setSuccessMessage,
        setIsSuccessModalOpen,
    } = useAppContext();

    const isEmployee = (currentUser?.role ?? '').toLowerCase() === 'employee';

    // Get platform param based on currentPage
    const platformParam = useMemo(() => {
        if (currentPage === 'Meta' || currentPage === 'Integrations') {
            return 'meta';
        } else if (currentPage === 'TikTok') {
            return 'tiktok';
        } else if (currentPage === 'WhatsApp') {
            return 'whatsapp';
        }
        return undefined;
    }, [currentPage]);

    // Get dataKey based on currentPage (memoized)
    const dataKey = useMemo(() => {
        let platformKey: string;
        switch (currentPage) {
            case 'Integrations':
            case 'Meta':
                platformKey = 'Meta';
                break;
            case 'TikTok':
                platformKey = 'TikTok';
                break;
            case 'WhatsApp':
                platformKey = 'WhatsApp';
                break;
            default:
                return null;
        }
        return platformConfig[platformKey]?.dataKey || null;
    }, [currentPage]);

    const { data: accountsResponse, isLoading: loading } = useConnectedAccounts(platformParam);
    const { data: leadgenConfig, isLoading: leadgenLoading } = useQuery({
        queryKey: ['tiktokLeadgenConfig'],
        queryFn: getTikTokLeadgenConfigAPI,
        enabled: currentPage === 'TikTok',
    });

    // WhatsApp Messaging Center state (hooks at top level); persist tab in localStorage (employees cannot see 'accounts')
    const [whatsAppTab, setWhatsAppTab] = useState<'chats' | 'templates' | 'accounts'>(() => {
        try {
            const s = localStorage.getItem('whatsapp_messaging_tab');
            if (s === 'chats' || s === 'templates') return s;
            if (s === 'accounts') return 'accounts'; // will be clamped for employees in WhatsApp block
        } catch (_) {}
        return 'chats';
    });
    const setWhatsAppTabPersisted = (tab: 'chats' | 'templates' | 'accounts') => {
        setWhatsAppTab(tab);
        try {
            localStorage.setItem('whatsapp_messaging_tab', tab);
        } catch (_) {}
    };
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplateType | null>(null);
    const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
    const [isStartNewConversationOpen, setIsStartNewConversationOpen] = useState(false);
    const [conversations, setConversations] = useState<Array<{ client: any }>>([]);
    const [selectedChatClient, setSelectedChatClient] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<Record<number, Array<{ body: string; direction: 'in' | 'out'; time: string }>>>({});
    const [messageInput, setMessageInput] = useState('');
    const [infoAlert, setInfoAlert] = useState<{ title: string; message: string } | null>(null);

    const { data: templates = [], refetch: refetchTemplates } = useQuery({
        queryKey: ['messageTemplates'],
        queryFn: getMessageTemplatesAPI,
        enabled: currentPage === 'WhatsApp',
    });

    const accounts = useMemo(() => {
        const accountsData = Array.isArray(accountsResponse) 
            ? accountsResponse 
            : (accountsResponse?.results || []);
        
        return accountsData.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            status: acc.status === 'connected' ? 'Connected' : acc.status === 'disconnected' ? 'Disconnected' : acc.status_display || 'Disconnected',
            link: acc.account_link,
            phone: acc.phone_number,
            platform: acc.platform,
            metadata: acc.metadata,
        }));
    }, [accountsResponse]);

    // Get platform details (memoized)
    const platform = useMemo(() => {
        if (!dataKey) return null;
        const config = platformConfig[Object.keys(platformConfig).find(key => platformConfig[key].dataKey === dataKey) || ''];
        if (!config) return null;
        return {
            name: config.name,
            icon: config.icon,
            dataKey: dataKey,
        };
    }, [dataKey]);

    // Twilio SMS: we only accept Twilio for SMS. Credentials form and "integration enabled" toggle.
    const replaceTwilio = (str: string) => (str || '').replace(/\{\{twilio\}\}/g, t('twilioWord') || 'Twilio');
    if (currentPage === 'Twilio') {
        return (
            <PageWrapper title={replaceTwilio(t('twilioSmsIntegration')) || 'SMS (Twilio) Notifications Integration'}>
                <TwilioSMSForm t={t} replaceTwilio={replaceTwilio} />
            </PageWrapper>
        );
    }
    
    if (!platform || !dataKey) {
        return <PageWrapper title={t('integrations')}><div>{t('unknownIntegration')}</div></PageWrapper>;
    }

    const { name, icon: Icon } = platform;
    const pageTitle = `${name} ${t('integration')}`;

    // TikTok = Lead Gen only (like Meta lead forms). Show webhook URL and setup steps for subscribers.
    if (currentPage === 'TikTok') {
        const webhookUrl = leadgenConfig?.webhook_url || '';
        const setupSteps = [
            { step: 1, text: t('tiktokStep1') || 'Copy the Webhook URL below (it is unique to your company).' },
            { step: 2, text: t('tiktokStep2') || 'In TikTok Ads Manager go to Leads Center → CRM integration → TikTok Custom API with Webhooks.' },
            { step: 3, text: t('tiktokStep3') || 'Paste the Webhook URL and save. Enable the integration if required.' },
            { step: 4, text: t('tiktokStep4') || 'Create a Lead Gen campaign with an Instant Form. New leads will appear as clients here automatically.' },
        ];
        return (
            <PageWrapper title={pageTitle}>
                <Card>
                    <div className="max-w-2xl space-y-6">
                        <div className="flex items-center gap-3">
                            <TikTokIcon className="w-10 h-10 text-primary" />
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('tiktokLeadGen') || 'TikTok Lead Gen'}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('tiktokLeadGenDescription') || 'Receive leads from TikTok Instant Forms instantly in your CRM. Follow the steps below to connect TikTok Ads Manager.'}
                                </p>
                            </div>
                        </div>
                        {leadgenLoading ? (
                            <div className="flex items-center justify-center py-8"><Loader variant="primary" className="h-8" /></div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('webhookUrl') || 'Webhook URL'}
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={webhookUrl}
                                            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                                        />
                                        <Button
                                            variant="secondary"
                                            onClick={() => { if (webhookUrl) navigator.clipboard.writeText(webhookUrl); alert(t('copied') || 'Copied'); }}
                                        >
                                            {t('copy') || 'Copy'}
                                        </Button>
                                    </div>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/50">
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                        {t('tiktokSetupSteps') || 'How to integrate TikTok with your CRM'}
                                    </h3>
                                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                        {setupSteps.map(({ step, text }) => (
                                            <li key={step}>{text}</li>
                                        ))}
                                    </ol>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </PageWrapper>
        );
    }

    // WhatsApp: Messaging Center (Chats | Template Management | WhatsApp Accounts)
    if (currentPage === 'WhatsApp') {
        const addConversation = (client: any) => {
            setConversations((prev) => {
                const exists = prev.some((c) => c.client.id === client.id);
                if (exists) return prev;
                return [{ client }, ...prev];
            });
            setSelectedChatClient(client);
        };

        const getClientPhone = (c: any) => (c.phone_number || c.phone || '').replace(/\s+/g, '').replace(/^\+/, '') || '';

        const handleSendMessage = async () => {
            if (!selectedChatClient || !messageInput.trim()) return;
            const to = getClientPhone(selectedChatClient);
            if (!to) {
                alert(t('sms_error_invalid_to_number') || 'No phone number for this client');
                return;
            }
            try {
                await sendWhatsAppMessageAPI({ to, message: messageInput.trim() });
                const id = selectedChatClient.id;
                setChatMessages((prev) => ({
                    ...prev,
                    [id]: [...(prev[id] || []), { body: messageInput.trim(), direction: 'out', time: new Date().toLocaleTimeString() }],
                }));
                setMessageInput('');
            } catch (e: any) {
                alert(e?.message || t('failedToSendSms'));
            }
        };

        /** Replace template placeholders (EN and AR) with actual lead/client values; if no value, leave placeholder as-is */
        const replaceTemplatePlaceholders = (text: string, client: any): string => {
            if (!client) return text;
            const customerName = (client.name || client.contact_name || (client.first_name && client.last_name ? `${client.first_name} ${client.last_name}`.trim() : '') || '').trim();
            const company = (typeof client.company_name === 'string' ? client.company_name : (client.company && (typeof client.company === 'string' ? client.company : client.company.name)) || '').trim();
            const amount = client.amount ?? client.last_invoice_amount ?? '';
            const amountStr = amount !== undefined && amount !== null && String(amount).trim() !== '' ? String(amount).trim() : null;
            const invoiceNumber = client.invoice_number ?? client.last_invoice_number ?? '';
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
        };

        const handleApplyQuickTemplate = (content: string) => {
            const resolved = selectedChatClient ? replaceTemplatePlaceholders(content, selectedChatClient) : content;
            setMessageInput((prev) => prev + (prev ? '\n' : '') + resolved);
        };

        const handleCopyTemplate = (content: string) => {
            navigator.clipboard.writeText(content);
            alert(t('copied'));
        };

        const effectiveTab = isEmployee && whatsAppTab === 'accounts' ? 'chats' : whatsAppTab;

        return (
            <PageWrapper
                title={
                    <div>
                        <div className="flex items-center gap-2">
                            <WhatsappIcon className="w-8 h-8 text-primary" />
                            <span>{t('messagingCenter')}</span>
                        </div>
                        <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">{t('messagingCenterDesc')}</p>
                    </div>
                }
                actions={
                    !isEmployee && (
                        <Button onClick={() => { setEditingAccount(null); setIsManageIntegrationAccountModalOpen(true); }}>
                            <PlusIcon className="w-4 h-4 me-2" /> {t('addNewAccount')}
                        </Button>
                    )
                }
            >
                <div className="flex border-b border-gray-200 dark:border-gray-700 gap-1 mb-4">
                    <button
                        type="button"
                        onClick={() => setWhatsAppTabPersisted('chats')}
                        className={`px-4 py-2 rounded-t flex items-center gap-2 text-sm font-medium ${effectiveTab === 'chats' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                    >
                        <WhatsappIcon className="w-4 h-4" /> {t('chats')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setWhatsAppTabPersisted('templates')}
                        className={`px-4 py-2 rounded-t flex items-center gap-2 text-sm font-medium ${effectiveTab === 'templates' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                    >
                        <FileTextIcon className="w-4 h-4" /> {t('templateManagement')}
                    </button>
                    {!isEmployee && (
                        <button
                            type="button"
                            onClick={() => setWhatsAppTabPersisted('accounts')}
                            className={`px-4 py-2 rounded-t flex items-center gap-2 text-sm font-medium ${effectiveTab === 'accounts' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                        >
                            <SettingsIcon className="w-4 h-4" /> {t('whatsAppAccounts')}
                        </button>
                    )}
                </div>

                {effectiveTab === 'chats' && (
                    <Card className="overflow-hidden">
                        <div className="flex flex-col md:flex-row min-h-[500px]">
                            <div className="w-full md:w-80 border-e border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col">
                                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                    <Button className="w-full" onClick={() => setIsStartNewConversationOpen(true)}>
                                        <PlusIcon className="w-4 h-4 me-2" /> {t('startNewConversation')}
                                    </Button>
                                </div>
                                <div className="p-2">
                                    <div className="relative">
                                        <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder={t('searchConversations')}
                                            dir="auto"
                                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ps-8 pe-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                                <ul className="flex-1 overflow-y-auto">
                                    {conversations.map(({ client }) => (
                                        <li key={client.id}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedChatClient(client)}
                                                className={`w-full flex items-center gap-3 p-3 text-start ${selectedChatClient?.id === client.id ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                                                    {(client.company_name || client.name || '?').charAt(0)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">{client.company_name || client.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{client.name || client.phone_number}</p>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                    {conversations.length === 0 && (
                                        <li className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">{t('chooseClientFromDb')}</li>
                                    )}
                                </ul>
                            </div>
                            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
                                {selectedChatClient ? (
                                    <>
                                        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                                                {(selectedChatClient.company_name || selectedChatClient.name || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{selectedChatClient.company_name || selectedChatClient.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedChatClient.phone_number && (t('connectedWhatsAppApi') + ' · ' + selectedChatClient.phone_number)}</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                            <p className="text-center text-xs text-gray-400 py-2">{t('today')}</p>
                                            {(chatMessages[selectedChatClient.id] || []).map((msg, i) => (
                                                <div
                                                    key={i}
                                                    className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.direction === 'out' ? 'ms-auto bg-primary text-white' : 'me-auto bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
                                                >
                                                    <p className="text-sm">{msg.body}</p>
                                                    <p className="text-xs opacity-80 mt-1">{msg.time}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                                            {templates.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-full">{t('quickTemplates')}</span>
                                                    {templates.slice(0, 4).map((tpl) => (
                                                        <button
                                                            key={tpl.id}
                                                            type="button"
                                                            onClick={() => handleApplyQuickTemplate(tpl.content)}
                                                            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        >
                                                            {tpl.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={messageInput}
                                                    onChange={(e) => setMessageInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                                    placeholder={t('typeMessageWhatsApp')}
                                                    className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                                />
                                                <Button onClick={handleSendMessage}>{t('sendSms')}</Button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                        {t('startNewConversation')} {t('chooseClientFromDb')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                {effectiveTab === 'templates' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FileTextIcon className="w-5 h-5 text-primary" /> {t('templateManagement')}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('templateManagementDesc')}</p>
                            </div>
                            <Button
                                onClick={() => {
                                    setEditingTemplate(null);
                                    setIsEditTemplateOpen(true);
                                }}
                            >
                                <PlusIcon className="w-4 h-4 me-2" /> {t('newTemplate')}
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map((tpl) => (
                                <React.Fragment key={tpl.id}>
                                <Card className="flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs px-2 py-0.5 rounded ${tpl.channel_type === 'sms' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                                            {tpl.channel_type === 'sms' ? 'SMS' : 'WHATSAPP'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingTemplate(tpl);
                                                    setIsEditTemplateOpen(true);
                                                }}
                                                className="text-gray-500 hover:text-primary"
                                                title={t('edit')}
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setConfirmDeleteConfig({
                                                        title: t('deleteTemplate'),
                                                        message: t('deleteTemplateConfirm'),
                                                        itemName: tpl.name,
                                                        confirmButtonText: t('delete'),
                                                        confirmButtonVariant: 'danger',
                                                        onConfirm: async () => {
                                                            await deleteMessageTemplateAPI(tpl.id);
                                                            refetchTemplates();
                                                        },
                                                    });
                                                    setIsConfirmDeleteModalOpen(true);
                                                }}
                                                className="text-gray-500 hover:text-red-600"
                                                title={t('deleteTemplate')}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{tpl.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 flex-1 line-clamp-3 mb-2">{tpl.content}</p>
                                    <div className="flex justify-between items-center">
                                        <Button variant="secondary" className="text-sm py-1.5 px-3" onClick={() => handleCopyTemplate(tpl.content)}>
                                            {t('copyTemplate')}
                                        </Button>
                                        <span className="text-xs text-gray-400">{tpl.category_display || tpl.category}</span>
                                    </div>
                                </Card>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}

                {effectiveTab === 'accounts' && (
                    <Card>
                        {accounts.length > 0 ? (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {accounts.map((account) => (
                                    <li key={account.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                        <div className="flex items-center gap-3 mb-2 sm:mb-0">
                                            <WhatsappIcon className="w-8 h-8 text-primary" />
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
                                                <span className={`flex items-center text-xs ${account.status === 'Connected' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    <span className={`h-2 w-2 me-1.5 rounded-full ${account.status === 'Connected' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                    {account.status === 'Connected' ? t('connected') : t('disconnected')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {account.status !== 'Connected' && (
                                                <Button variant="primary" onClick={() => handleConnect(account.id)}>{t('connect')}</Button>
                                            )}
                                            <Button variant="secondary" onClick={() => handleEdit(account)}><SettingsIcon className="w-4 h-4 me-2" /> {t('edit')}</Button>
                                            <Button variant="danger" onClick={() => handleDelete(account.id)}><TrashIcon className="w-4 h-4 me-2" /> {t('disconnect')}</Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-16">
                                <WhatsappIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">{t('noAccountsConnected')}</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('connectAccountPrompt')}</p>
                                <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm">{t('addAccountThenConnectHint')}</p>
                            </div>
                        )}
                    </Card>
                )}

                <EditTemplateModal
                    isOpen={isEditTemplateOpen}
                    onClose={() => { setIsEditTemplateOpen(false); setEditingTemplate(null); }}
                    template={editingTemplate}
                    t={t}
                    language={language}
                    onSuccess={() => { refetchTemplates(); }}
                />
                <StartNewConversationModal
                    isOpen={isStartNewConversationOpen}
                    onClose={() => setIsStartNewConversationOpen(false)}
                    t={t}
                    onSelectClient={addConversation}
                />
            </PageWrapper>
        );
    }

    // Delete account mutation
    const deleteAccountMutation = useDeleteConnectedAccount();
    const testConnectionMutation = useTestConnection();
    const queryClient = useQueryClient();

    // Handle OAuth callback when returning in same tab (popup uses /oauth-callback page)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const connected = urlParams.get('connected');
        const accountId = urlParams.get('account_id');
        if (connected !== 'true' || !accountId) return;
        const id = parseInt(accountId, 10);
        if (window.opener) return;
        // Same-tab redirect: clean URL and refetch
        window.history.replaceState({}, document.title, window.location.pathname);
        queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
        if (platformParam === 'meta') {
            getConnectedAccountsAPI(platformParam).then((accounts: any) => {
                const account = Array.isArray(accounts)
                    ? accounts.find((a: any) => a.id === id)
                    : accounts?.results?.find((a: any) => a.id === id);
                if (account?.metadata?.pages?.length) {
                    const firstPage = account.metadata.pages[0];
                    const pageIdStr = String(firstPage.id);
                    const isThisPageLinked = account.metadata?.selected_page_id === pageIdStr;
                    const formId = isThisPageLinked ? (account.metadata?.selected_form_id || '') : '';
                    const mapping = account.metadata?.form_campaign_mapping || {};
                    const campaignId = formId && mapping[formId] != null ? String(mapping[formId]) : '';
                    setSelectLeadFormConfig({
                        accountId: id,
                        pageId: pageIdStr,
                        pageName: firstPage.name || pageIdStr,
                        linkedFormId: formId || undefined,
                        linkedCampaignId: campaignId || undefined,
                    });
                    setIsSelectLeadFormModalOpen(true);
                }
            }).catch(console.error);
        }
    }, [queryClient, platformParam]);
    
    const handleSelectLeadForm = async (account: any) => {
        if (account.platform !== 'meta') return;
        let pages = account.metadata?.pages;
        if (!pages?.length) {
            try {
                const full = await getConnectedAccountAPI(account.id);
                pages = full?.metadata?.pages || [];
            } catch (e) {
                console.error('Failed to load account pages:', e);
            }
        }
        if (!pages?.length) {
            try {
                const res = await syncMetaPagesAPI(account.id);
                pages = res?.pages || [];
                if (pages?.length) queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
            } catch (e) {
                console.error('Failed to sync Meta pages:', e);
            }
        }
        if (!pages?.length) {
            setInfoAlert({
                title: t('noFacebookPagesFound') || 'No Facebook pages found',
                message: t('noFacebookPagesReconnectHint') || 'No Facebook pages were found for this account. Try disconnecting and reconnecting the account.',
            });
            return;
        }
        const first = pages[0];
        const pageIdStr = String(first.id);
        const isThisPageLinked = account.metadata?.selected_page_id === pageIdStr;
        const formId = isThisPageLinked ? (account.metadata?.selected_form_id || '') : '';
        const mapping = account.metadata?.form_campaign_mapping || {};
        const campaignId = formId && mapping[formId] != null ? String(mapping[formId]) : '';
        setSelectLeadFormConfig({
            accountId: account.id,
            pageId: pageIdStr,
            pageName: first.name || pageIdStr,
            linkedFormId: formId || undefined,
            linkedCampaignId: campaignId || undefined,
        });
        setIsSelectLeadFormModalOpen(true);
    };

    const handleTestConnection = async (accountId: number) => {
        try {
            const result = await testConnectionMutation.mutateAsync(accountId);
            if (result.valid) {
                setSuccessMessage(t('connectionValid') || result.message || 'Connection is valid.');
                setIsSuccessModalOpen(true);
            } else {
                setInfoAlert({
                    title: t('connectionInvalid') || 'Connection check',
                    message: result.message || (t('connectionInvalidPleaseReconnect') || 'Token is no longer valid. Please disconnect and connect again.'),
                });
            }
        } catch (error: any) {
            const msg = error?.message || error?.data?.error || t('errorTestingConnection') || 'Failed to test connection.';
            setInfoAlert({ title: t('connectionCheck') || 'Connection check', message: msg });
        }
    };

    const handleDelete = async (accountId: number) => {
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
            setConfirmDeleteConfig({
                title: t('disconnect') || 'Disconnect Account',
                message: t('confirmDisconnectAccount') || 'Are you sure you want to disconnect',
                itemName: account.name,
                onConfirm: async () => {
                    try {
                        await deleteAccountMutation.mutateAsync(accountId);
                    } catch (error: any) {
                        console.error('Error deleting account:', error);
                        alert(error?.message || t('errorDeletingAccount') || 'Failed to delete account');
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const openConnectPopup = async (accountId: number) => {
        try {
            const response = await connectIntegrationAccountAPI(accountId);
            if (!response.authorization_url) return;
            const width = 600;
            const height = 700;
            const left = Math.round((window.screen.width - width) / 2);
            const top = Math.round((window.screen.height - height) / 2);
            const popup = window.open(
                response.authorization_url,
                'oauth_popup',
                `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
            );
            if (!popup) {
                alert(t('popupBlocked') || 'Please allow popups for this site and try again.');
                return;
            }
            const handleMessage = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                if (event.data?.type === 'oauth_connected' && event.data?.accountId != null) {
                    window.removeEventListener('message', handleMessage);
                    queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
                    if (platformParam === 'meta') {
                        getConnectedAccountsAPI(platformParam).then((accounts: any) => {
                            const list = Array.isArray(accounts) ? accounts : accounts?.results || [];
                            const account = list.find((a: any) => a.id === event.data.accountId);
                            if (account?.metadata?.pages?.length) {
                                const firstPage = account.metadata.pages[0];
                                const pageIdStr = String(firstPage.id);
                                const isThisPageLinked = account.metadata?.selected_page_id === pageIdStr;
                                const formId = isThisPageLinked ? (account.metadata?.selected_form_id || '') : '';
                                const mapping = account.metadata?.form_campaign_mapping || {};
                                const campaignId = formId && mapping[formId] != null ? String(mapping[formId]) : '';
                                setSelectLeadFormConfig({
                                    accountId: event.data.accountId,
                                    pageId: pageIdStr,
                                    pageName: firstPage.name || pageIdStr,
                                    linkedFormId: formId || undefined,
                                    linkedCampaignId: campaignId || undefined,
                                });
                                setIsSelectLeadFormModalOpen(true);
                            }
                        }).catch(console.error);
                    }
                }
                if (event.data?.type === 'oauth_failed') {
                    window.removeEventListener('message', handleMessage);
                    queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
                }
            };
            window.addEventListener('message', handleMessage);
            const poll = setInterval(() => {
                if (popup.closed) {
                    clearInterval(poll);
                    window.removeEventListener('message', handleMessage);
                    queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
                }
            }, 500);
        } catch (error: any) {
            console.error('Error connecting account:', error);
            alert(error?.message || t('errorConnectingAccount') || 'Failed to connect account');
        }
    };

    const handleConnect = (accountId: number) => {
        openConnectPopup(accountId);
    };

    // بعد إنشاء حساب جديد (Meta/WhatsApp) من المودال، فتح نافذة الربط تلقائياً
    useEffect(() => {
        if (pendingConnectAccountId == null) return;
        const id = pendingConnectAccountId;
        setPendingConnectAccountId(null);
        openConnectPopup(id);
    }, [pendingConnectAccountId]);

    const handleEdit = (account: Account) => {
        setEditingAccount(account);
        setIsManageIntegrationAccountModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingAccount(null); // Ensure we are in "add" mode
        setIsManageIntegrationAccountModalOpen(true);
    };

    if (loading) {
        return (
            <PageWrapper title={pageTitle}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title={pageTitle}
            actions={
                <Button onClick={handleAddNew}>
                    <PlusIcon className="w-4 h-4" /> {t('addNewAccount')}
                </Button>
            }
        >
            <Card className="overflow-hidden p-0">
                {accounts.length > 0 ? (
                    <ul className="divide-y divide-gray-200/80 dark:divide-gray-700/80">
                        {accounts.map(account => (
                            <li
                                key={account.id}
                                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center ring-1 ring-primary/20 dark:ring-primary/30">
                                        <Icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 dark:text-white truncate">{account.name}</p>
                                        <span
                                            className={`inline-flex items-center gap-1.5 mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                                                account.status === 'Connected'
                                                    ? 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-500/20'
                                                    : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/80'
                                            }`}
                                        >
                                            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${account.status === 'Connected' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            {account.status === 'Connected' ? t('connected') : t('disconnected')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-2">
                                    {(account.status !== 'Connected') && (
                                        <Button variant="primary" onClick={() => handleConnect(account.id)} className="rounded-lg shadow-sm">
                                            {t('connect') || 'Connect'}
                                        </Button>
                                    )}
                                    {account.status === 'Connected' && account.platform === 'meta' && (
                                        <>
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleTestConnection(account.id)}
                                                disabled={testConnectionMutation.isPending}
                                                className="rounded-lg text-sm"
                                            >
                                                {testConnectionMutation.isPending ? (t('testing') || 'Testing...') : (t('testConnection') || 'Test connection')}
                                            </Button>
                                            <Button variant="secondary" onClick={() => handleSelectLeadForm(account)} className="rounded-lg text-sm">
                                                {t('selectLeadForm') || 'Select Lead Form'}
                                            </Button>
                                        </>
                                    )}
                                    <Button variant="ghost" onClick={() => handleEdit(account)} className="rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <SettingsIcon className="w-4 h-4" /> <span className="sm:inline">{t('edit')}</span>
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={() => handleDelete(account.id)}
                                        className="rounded-lg ml-auto sm:ml-0 border border-transparent hover:border-red-500/30"
                                    >
                                        <TrashIcon className="w-4 h-4" /> <span className="sm:inline">{t('disconnect')}</span>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-16 px-6">
                        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                            <Icon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('noAccountsConnected')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">{t('connectAccountPrompt')}</p>
                        {(platformParam === 'whatsapp' || platformParam === 'meta') && (
                            <p className="text-gray-400 dark:text-gray-500 mt-3 text-sm">{t('addAccountThenConnectHint')}</p>
                        )}
                    </div>
                )}
            </Card>
            
            {/* Select Lead Form Modal */}
            {selectLeadFormConfig && (
                <SelectLeadFormModal
                    isOpen={isSelectLeadFormModalOpen}
                    onClose={() => {
                        setIsSelectLeadFormModalOpen(false);
                        setSelectLeadFormConfig(null);
                    }}
                    accountId={selectLeadFormConfig.accountId}
                    pageId={selectLeadFormConfig.pageId}
                    pageName={selectLeadFormConfig.pageName}
                    linkedFormId={selectLeadFormConfig.linkedFormId}
                    linkedCampaignId={selectLeadFormConfig.linkedCampaignId}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
                    }}
                />
            )}
            {/* Info alert (e.g. no Facebook pages) - styled like app dialogs */}
            {infoAlert && (
                <Modal
                    isOpen={true}
                    onClose={() => setInfoAlert(null)}
                    title={infoAlert.title}
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">{infoAlert.message}</p>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setInfoAlert(null)}>{t('ok') || 'OK'}</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </PageWrapper>
    );
};