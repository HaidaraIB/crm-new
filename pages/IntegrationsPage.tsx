

import React, { useMemo, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, PlusIcon, FacebookIcon, TikTokIcon, WhatsappIcon, TrashIcon, SettingsIcon, Loader, SmsIcon } from '../components/index';
import { EyeIcon, EyeOffIcon } from '../components/icons';
import { Page } from '../types';
import { connectIntegrationAccountAPI, getConnectedAccountsAPI, getTikTokLeadgenConfigAPI, getTwilioSettingsAPI, updateTwilioSettingsAPI } from '../services/api';
import { useConnectedAccounts, useDeleteConnectedAccount } from '../hooks/useQueries';
import { useQuery } from '@tanstack/react-query';
import { SelectLeadFormModal } from '../components/modals/SelectLeadFormModal';

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
        currentPage, 
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
    } = useAppContext();

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

    // Delete account mutation
    const deleteAccountMutation = useDeleteConnectedAccount();
    const queryClient = useQueryClient();

    // Handle OAuth callback (when returning from Meta/WhatsApp in same tab or in popup)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const connected = urlParams.get('connected');
        const accountId = urlParams.get('account_id');
        if (connected !== 'true' || !accountId) return;
        const id = parseInt(accountId, 10);
        // If we are inside a popup opened by the integrations page, notify opener and close
        if (window.opener) {
            window.opener.postMessage({ type: 'oauth_connected', accountId: id }, window.location.origin);
            window.history.replaceState({}, document.title, window.location.pathname);
            window.close();
            return;
        }
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
                    setSelectLeadFormConfig({
                        accountId: id,
                        pageId: firstPage.id,
                        pageName: firstPage.name,
                    });
                    setIsSelectLeadFormModalOpen(true);
                }
            }).catch(console.error);
        }
    }, [queryClient, platformParam]);
    
    const handleSelectLeadForm = (account: any) => {
        if (account.platform === 'meta' && account.metadata?.pages) {
            const pages = account.metadata.pages;
            if (pages.length === 1) {
                // If only one page, use it directly
                setSelectLeadFormConfig({
                    accountId: account.id,
                    pageId: pages[0].id,
                    pageName: pages[0].name,
                });
                setIsSelectLeadFormModalOpen(true);
            } else if (pages.length > 1) {
                // TODO: Show page selection first, then lead form selection
                // For now, use first page
                setSelectLeadFormConfig({
                    accountId: account.id,
                    pageId: pages[0].id,
                    pageName: pages[0].name,
                });
                setIsSelectLeadFormModalOpen(true);
            }
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
                    try { popup.close(); } catch (_) {}
                    queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
                    if (platformParam === 'meta') {
                        getConnectedAccountsAPI(platformParam).then((accounts: any) => {
                            const list = Array.isArray(accounts) ? accounts : accounts?.results || [];
                            const account = list.find((a: any) => a.id === event.data.accountId);
                            if (account?.metadata?.pages?.length) {
                                const firstPage = account.metadata.pages[0];
                                setSelectLeadFormConfig({
                                    accountId: event.data.accountId,
                                    pageId: firstPage.id,
                                    pageName: firstPage.name,
                                });
                                setIsSelectLeadFormModalOpen(true);
                            }
                        }).catch(console.error);
                    }
                }
            };
            window.addEventListener('message', handleMessage);
            const poll = setInterval(() => {
                if (popup.closed) {
                    clearInterval(poll);
                    window.removeEventListener('message', handleMessage);
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
            <Card>
                {accounts.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {accounts.map(account => (
                            <li key={account.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                <div className="flex items-center gap-3 mb-2 sm:mb-0">
                                    <Icon className="w-8 h-8 text-primary" />
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
                                        <span className={`flex items-center text-xs ${account.status === 'Connected' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            <span className={`h-2 w-2 me-1.5 rounded-full ${account.status === 'Connected' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                            {account.status === 'Connected' ? t('connected') : t('disconnected')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(account.status !== 'Connected') && (
                                        <Button variant="primary" onClick={() => handleConnect(account.id)}>
                                            {t('connect') || 'Connect'}
                                        </Button>
                                    )}
                                    {account.status === 'Connected' && account.platform === 'meta' && (
                                        <Button variant="secondary" onClick={() => handleSelectLeadForm(account)}>
                                            {t('selectLeadForm') || 'Select Lead Form'}
                                        </Button>
                                    )}
                                    <Button variant="secondary" onClick={() => handleEdit(account)}><SettingsIcon className="w-4 h-4 me-2" /> {t('edit')}</Button>
                                    <Button variant="danger" onClick={() => handleDelete(account.id)}><TrashIcon className="w-4 h-4 me-2" /> {t('disconnect')}</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-16">
                        <Icon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">{t('noAccountsConnected')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('connectAccountPrompt')}</p>
                        {(platformParam === 'whatsapp' || platformParam === 'meta') && (
                            <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm">{t('addAccountThenConnectHint')}</p>
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
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
                    }}
                />
            )}
        </PageWrapper>
    );
};