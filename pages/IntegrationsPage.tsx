

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, Modal, PlusIcon, WhatsappIcon, TrashIcon, SettingsIcon, Loader, PageLoadingState, SectionLoadingState, NumberInput, TableHorizontalScroll, Input, PhoneText, isPhoneLike } from '../components/index';
import { IntegrationPlatformIcon, integrationPlatformFromDataKey, integrationIconInAccentButtonClass, marketingAccentIconClass } from '../components/integrations/IntegrationPlatformIcon';
import { CheckIcon, EyeIcon, EyeOffIcon } from '../components/icons';
import { Page } from '../types';
import { connectIntegrationAccountAPI, completeWhatsAppEmbeddedSignupAPI, syncWhatsAppPhoneNumbersAPI, getConnectedAccountsAPI, getConnectedAccountAPI, syncMetaPagesAPI, getTikTokLeadgenConfigAPI, getLeadApiConfigAPI, getMujebConfigAPI, createLeadApiKeyAPI, rotateLeadApiKeyAPI, revokeLeadApiKeyAPI, getTwilioSettingsAPI, updateTwilioSettingsAPI, getOpenAISettingsAPI, updateOpenAISettingsAPI, testOpenAISettingsAPI, runAIAnalysisAPI, getMessageTemplatesAPI, sendWhatsAppMessageAPI, sendWhatsAppTemplateAPI, getWhatsAppSessionWindowAPI, sendLeadSMSAPI, deleteMessageTemplateAPI, deleteWhatsAppMessageAPI, deleteWhatsAppConversationAPI, getLeadsAPI, submitMessageTemplateToWhatsAppAPI, getWhatsAppLimitsAPI, syncWhatsAppTemplatesAPI, getIntegrationPolicyAPI, getMetaHealthAPI, updateConnectedAccountAPI, resolveLocalizedApiError, getWhatsAppContactByPhoneAPI, createCampaignBatchAPI, completeCampaignBatchAPI, recordCampaignFailureAPI, enableWhatsAppCallingAPI, type MetaHealthResponse } from '../services/api';
import { obtainWhatsAppEmbeddedSignupCode } from '../utils/whatsappEmbeddedSignup';
import {
    WhatsAppFormattedText,
    WhatsAppFormatToolbar,
    applyWhatsAppFormatToInput,
    textLooksWhatsAppFormatted,
    type WhatsAppFormatKind,
} from '../utils/whatsappFormatting';
import { useWhatsAppConversations, useWhatsAppChatMessages } from '../hooks/useQueries';
import type { MessageTemplateType } from '../services/api';
import { useConnectedAccounts, useCreateConnectedAccount, useDisconnectConnectedAccount, useTestConnection } from '../hooks/useQueries';
import { useQuery } from '@tanstack/react-query';
import { SelectLeadFormModal } from '../components/modals/SelectLeadFormModal';
import { EditTemplateModal } from '../components/modals/EditTemplateModal';
import { StartNewConversationModal } from '../components/modals/StartNewConversationModal';
import { SmsSendPreviewModal } from '../components/modals/SmsSendPreviewModal';
import { replaceSmsTemplatePlaceholders, leadHasPhone, resolveLeadPhoneRaw } from '../utils/smsSendHelpers';
import { FileTextIcon, SearchIcon, EditIcon, MegaphoneIcon, ClockIcon, RefreshIcon } from '../components/icons';
import {
    getWhatsAppContactAvatarLabel,
    getWhatsAppContactSubtitle,
    getWhatsAppContactTitle,
} from '../utils/whatsappContactDisplay';
import { TemplateManagementSettings } from './settings/TemplateManagementSettings';
import { MessageLogsPanel } from '../components/messaging/MessageLogsPanel';
import { navigateToCompanyRoute } from '../utils/routing';
import { resolveIntegrationPolicyMessage } from '../utils/integrationPolicyMessage';
import { PbxSettingsPage } from '../components/integrations/PbxSettingsForm';
import { LeadApiDocumentation } from '../components/integrations/LeadApiDocumentation';
import { leadApiDocT } from '../constants/leadApiDocumentation';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../utils/dateUtils';
import { ChatToast } from '../components/ChatToast';
import { CampaignLeadPicker } from '../components/campaign/CampaignLeadPicker';
import {
    isManualChatClient,
    loadManualConversations,
    loadManualMessages,
    loadSelectedManualPhone,
    mergeManualConversations,
    buildManualClientForPhone,
    normalizeChatPhone,
    saveManualConversations,
    saveManualMessages,
    saveSelectedManualPhone,
    removeManualConversationForPhone,
    type ChatMessageStatus,
    type ManualChatMessage,
} from '../utils/whatsappManualChatsStorage';
import { normalizeRole } from '../utils/roles';
import { clearFieldError } from '../utils/formFieldErrors';

type Account = { id: number; name: string; status: string; platform?: string; metadata?: Record<string, unknown>; is_active?: boolean };

type PlatformDetails = {
    name: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    accounts: Account[];
    dataKey: keyof ReturnType<typeof useAppContext>['connectedAccounts'];
};

const templateCategoryKey: Record<string, string> = { auth: 'categoryAuth', marketing: 'categoryMarketing', utility: 'categoryUtility' };

const platformConfig: Record<string, { name: string; dataKey: keyof ReturnType<typeof useAppContext>['connectedAccounts'] }> = {
    Meta: { name: 'Meta', dataKey: 'facebook' },
    WhatsApp: { name: 'WhatsApp', dataKey: 'whatsapp' },
};

/** Build props for SelectLeadFormModal from IntegrationAccount metadata.pages */
function buildMetaLeadFormModalConfig(account: any, accountId: number) {
    const raw = account?.metadata?.pages || [];
    const pages: { id: string; name: string }[] = raw.map((p: any) => ({
        id: String(p.id),
        name: String(p.name || p.id),
    }));
    if (!pages.length) return null;
    const linkedPid =
        account.metadata?.selected_page_id != null && String(account.metadata.selected_page_id).length
            ? String(account.metadata.selected_page_id)
            : '';
    const defaultPage = pages.find((p: { id: string; name: string }) => p.id === linkedPid) || pages[0];
    const isLinkedContext = Boolean(linkedPid && defaultPage.id === linkedPid);
    const formId = isLinkedContext ? String(account.metadata?.selected_form_id || '') : '';
    const mapping = account.metadata?.form_campaign_mapping || {};
    const campaignId = formId && mapping[formId] != null ? String(mapping[formId]) : '';
    return {
        accountId,
        pages,
        linkedPageId: linkedPid || undefined,
        linkedFormId: formId || undefined,
        linkedCampaignId: campaignId || undefined,
    };
}

type SmsProviderChoice = 'twilio' | 'otpiq';

type IntegrationPolicyEntry = { enabled: boolean; message: string; scope: string };

function TwilioSMSForm({
    t,
    replaceTwilio,
    integrationPolicyMap,
}: {
    t(key: string): string;
    replaceTwilio: (str: string) => string;
    integrationPolicyMap?: Record<string, IntegrationPolicyEntry>;
}) {
    const { setCurrentPage, currentUser } = useAppContext();
    const [provider, setProvider] = useState<SmsProviderChoice>('twilio');
    const [accountSid, setAccountSid] = useState('');
    const [twilioNumber, setTwilioNumber] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [otpiqApiKey, setOtpiqApiKey] = useState('');
    const [senderId, setSenderId] = useState('');
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);
    const [showAccountSid, setShowAccountSid] = useState(false);
    const [showAuthToken, setShowAuthToken] = useState(false);
    const [showOtpiqApiKey, setShowOtpiqApiKey] = useState(false);
    const [authTokenMasked, setAuthTokenMasked] = useState<string | null>(null);
    const [otpiqApiKeyMasked, setOtpiqApiKeyMasked] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        getTwilioSettingsAPI()
            .then((data) => {
                if (!cancelled) {
                    setProvider(data.provider === 'otpiq' ? 'otpiq' : 'twilio');
                    setAccountSid(data.account_sid || '');
                    setTwilioNumber(data.twilio_number || '');
                    setAuthToken('');
                    setOtpiqApiKey('');
                    setAuthTokenMasked(data.auth_token_masked ?? null);
                    setOtpiqApiKeyMasked(data.otpiq_api_key_masked ?? null);
                    setSenderId(data.sender_id || '');
                    setIsEnabled(!!data.is_enabled);
                }
            })
            .catch(() => { if (!cancelled) setErrors({ general: t('failedToLoadTwilioSettings') }); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const twilioPolicyDisabled = integrationPolicyMap?.twilio?.enabled === false;
    const otpiqPolicyDisabled = integrationPolicyMap?.otpiq?.enabled === false;
    const selectedProviderPolicyDisabled =
        (provider === 'twilio' && twilioPolicyDisabled) || (provider === 'otpiq' && otpiqPolicyDisabled);
    const selectedProviderPolicyMessage =
        provider === 'otpiq'
            ? integrationPolicyMap?.otpiq?.message
            : integrationPolicyMap?.twilio?.message;

    const handleSave = () => {
        if (selectedProviderPolicyDisabled) {
            setErrors({
                general:
                    selectedProviderPolicyMessage ||
                    t('integrationDisabledDefaultMessage') ||
                    'This integration is currently disabled by your administrator.',
            });
            return;
        }

        const newErrors: Record<string, string> = {};
        if (provider === 'twilio') {
            if (!accountSid.trim()) newErrors.accountSid = t('accountSidRequired') || 'Account SID is required';
            if (!twilioNumber.trim()) newErrors.twilioNumber = t('twilioNumberRequired') || 'Twilio number is required';
            if (!authToken.trim() && !authTokenMasked) newErrors.authToken = t('authTokenRequired') || 'Auth token is required';
        } else if (!otpiqApiKey.trim() && !otpiqApiKeyMasked) {
            newErrors.otpiqApiKey = t('otpiqApiKeyRequired') || 'OTPIQ API key is required';
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setSuccess(false);
        setSaving(true);
        const payload: Parameters<typeof updateTwilioSettingsAPI>[0] = {
            provider,
            sender_id: senderId || undefined,
            is_enabled: isEnabled,
            otpiq_route_provider: 'sms',
        };
        if (provider === 'twilio') {
            payload.account_sid = accountSid || undefined;
            payload.twilio_number = twilioNumber || undefined;
            if (authToken) payload.auth_token = authToken;
        } else {
            if (otpiqApiKey) payload.otpiq_api_key = otpiqApiKey;
        }
        updateTwilioSettingsAPI(payload)
            .then((data) => {
                setSuccess(true);
                setAuthToken('');
                setOtpiqApiKey('');
                setAuthTokenMasked(data.auth_token_masked ?? authTokenMasked);
                setOtpiqApiKeyMasked(data.otpiq_api_key_masked ?? otpiqApiKeyMasked);
            })
            .catch((e: any) => setErrors({ general: e?.message || t('failedToSaveTwilioSettings') }))
            .finally(() => setSaving(false));
    };

    if (loading) {
        return (
            <Card>
                <SectionLoadingState className="py-12" label={t('loading') || 'Loading'} />
            </Card>
        );
    }

    return (
        <Card>
            <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <IntegrationPlatformIcon platform="sms" size="lg" variant="inline" />
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('twilioSmsIntegration')}
                        </h2>
                        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
                            {t('smsProviderNote')}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('twilioNewLeadSmsHint')}</p>
                        <Button
                            type="button"
                            variant="secondary"
                            className="mt-2 w-full sm:w-auto"
                            title={t('twilioOpenNewLeadSmsSettingsHint')}
                            onClick={() => {
                                try {
                                    localStorage.setItem('settingsActiveTab', 'NewLeadSms');
                                } catch {
                                    /* ignore */
                                }
                                navigateToCompanyRoute(
                                    currentUser?.company?.name,
                                    currentUser?.company?.domain,
                                    'Settings',
                                );
                                setCurrentPage('Settings');
                            }}
                        >
                            {t('twilioOpenNewLeadSmsSettings')}
                        </Button>
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('smsProvider') || 'SMS provider'}</label>
                        <select
                            value={provider}
                            onChange={(e) => {
                                setProvider(e.target.value as SmsProviderChoice);
                                clearFieldError(setErrors, 'accountSid');
                                clearFieldError(setErrors, 'twilioNumber');
                                clearFieldError(setErrors, 'authToken');
                                clearFieldError(setErrors, 'otpiqApiKey');
                            }}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                        >
                            <option value="twilio" disabled={twilioPolicyDisabled}>
                                Twilio{twilioPolicyDisabled ? ` (${t('smsProviderUnavailable') || 'unavailable'})` : ''}
                            </option>
                            <option value="otpiq" disabled={otpiqPolicyDisabled}>
                                OTPIQ{otpiqPolicyDisabled ? ` (${t('smsProviderUnavailable') || 'unavailable'})` : ''}
                            </option>
                        </select>
                        {selectedProviderPolicyDisabled && (
                            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                                {selectedProviderPolicyMessage ||
                                    t('integrationDisabledDefaultMessage') ||
                                    'This integration is currently disabled by your administrator.'}
                            </p>
                        )}
                    </div>
                    {provider === 'twilio' ? (
                    <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accountSid')}</label>
                        <div className="relative">
                            <input
                                type={showAccountSid ? 'text' : 'password'}
                                value={accountSid}
                                onChange={(e) => {
                                    setAccountSid(e.target.value);
                                    clearFieldError(setErrors, 'accountSid');
                                }}
                                autoComplete="off"
                                data-form-type="other"
                                data-lpignore="true"
                                className={`w-full rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 pr-10 text-sm ${errors.accountSid ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
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
                        {errors.accountSid && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.accountSid}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('twilioNumber')}</label>
                        <input
                            type="text"
                            value={twilioNumber}
                            onChange={(e) => {
                                setTwilioNumber(e.target.value);
                                clearFieldError(setErrors, 'twilioNumber');
                            }}
                            autoComplete="off"
                            data-form-type="other"
                            data-lpignore="true"
                            className={`w-full rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm ${errors.twilioNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            placeholder={t('twilioNumberPlaceholder')}
                        />
                        {errors.twilioNumber && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.twilioNumber}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('authToken')}</label>
                        <div className="relative">
                            <input
                                type={showAuthToken ? 'text' : 'password'}
                                value={authToken}
                                onChange={(e) => {
                                    setAuthToken(e.target.value);
                                    clearFieldError(setErrors, 'authToken');
                                }}
                                autoComplete="new-password"
                                data-form-type="other"
                                data-lpignore="true"
                                className={`w-full rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 pr-10 text-sm ${errors.authToken ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
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
                        {errors.authToken && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.authToken}</p>
                        )}
                    </div>
                    </>
                    ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('otpiqApiKey') || 'OTPIQ API key'}</label>
                        <div className="relative">
                            <input
                                type={showOtpiqApiKey ? 'text' : 'password'}
                                value={otpiqApiKey}
                                onChange={(e) => {
                                    setOtpiqApiKey(e.target.value);
                                    clearFieldError(setErrors, 'otpiqApiKey');
                                }}
                                autoComplete="new-password"
                                data-form-type="other"
                                data-lpignore="true"
                                className={`w-full rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 pr-10 text-sm ${errors.otpiqApiKey ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                placeholder={t('leaveBlankToKeepCurrent')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowOtpiqApiKey(!showOtpiqApiKey)}
                                className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title={showOtpiqApiKey ? (t('hide') || 'Hide') : (t('show') || 'Show')}
                            >
                                {showOtpiqApiKey ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            </button>
                        </div>
                        {errors.otpiqApiKey && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.otpiqApiKey}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('otpiqApiKeyHelp') || 'From your OTPIQ project dashboard.'}</p>
                    </div>
                    )}
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
                        {provider === 'otpiq' ? (
                            <div className="mt-1 space-y-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('otpiqSenderIdHelp')}
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    {t('otpiqSenderIdTestHint')}
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>

                {errors.general && <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>}
                {success && <p className="text-sm text-green-600 dark:text-green-400">{t('saveSucceeded')}</p>}

                <Button onClick={handleSave} disabled={saving || selectedProviderPolicyDisabled}>
                    {saving ? <Loader variant="primary" className="h-4 w-4" /> : t('save')}
                </Button>
            </div>
        </Card>
    );
}

const OPENAI_MODEL_OPTIONS: { value: string; labelKey: 'openaiModelGpt4oMini' | 'openaiModelGpt4o' | 'openaiModelGpt41Mini' | 'openaiModelGpt41' }[] = [
    { value: 'gpt-4o-mini', labelKey: 'openaiModelGpt4oMini' },
    { value: 'gpt-4o', labelKey: 'openaiModelGpt4o' },
    { value: 'gpt-4.1-mini', labelKey: 'openaiModelGpt41Mini' },
    { value: 'gpt-4.1', labelKey: 'openaiModelGpt41' },
];

function openaiTestErrorMessage(t: { (key: string): string }, err: { code?: string; message?: string }): string {
    if (err?.code === 'openai_not_configured') return t('openaiNotConfigured');
    if (err?.code === 'openai_no_api_key') return t('openaiNoApiKey');
    return err?.message || t('openaiConnectionFailed');
}

function OpenAISettingsForm({
    t,
    integrationPolicyMap,
}: {
    t(key: string): string;
    integrationPolicyMap?: Record<string, IntegrationPolicyEntry>;
}) {
    const { currentUser } = useAppContext();
    const [apiKey, setApiKey] = useState('');
    const [isEnabled, setIsEnabled] = useState(false);
    const [model, setModel] = useState('gpt-4o-mini');
    const [autoAnalyze, setAutoAnalyze] = useState(true);
    const [maxLeads, setMaxLeads] = useState(20);
    const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [running, setRunning] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    const openaiPolicyDisabled = integrationPolicyMap?.openai?.enabled === false;
    const openaiPolicyMessage = integrationPolicyMap?.openai?.message;
    const userRole = normalizeRole(currentUser?.role);
    const canRunAnalysis = userRole === 'Owner' || userRole === 'Supervisor';

    useEffect(() => {
        let cancelled = false;
        getOpenAISettingsAPI()
            .then((data) => {
                if (!cancelled) {
                    setIsEnabled(!!data.is_enabled);
                    setModel(data.model || 'gpt-4o-mini');
                    setAutoAnalyze(data.auto_analyze_enabled !== false);
                    setMaxLeads(data.max_leads_per_run ?? 20);
                    setApiKeyMasked(data.api_key_masked ?? null);
                    setLastError(data.last_error ?? null);
                    setApiKey('');
                }
            })
            .catch(() => {
                if (!cancelled) setErrors({ general: t('failedToLoadOpenAISettings') });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [t]);

    const handleSave = () => {
        if (openaiPolicyDisabled) {
            setErrors({ general: openaiPolicyMessage || t('integrationDisabledDefaultMessage') });
            return;
        }
        if (!apiKey.trim() && !apiKeyMasked) {
            setErrors({ apiKey: t('openaiApiKeyRequired') || 'API key is required' });
            return;
        }
        setErrors({});
        setSuccessMessage(null);
        setTestStatus('idle');
        setTestMessage(null);
        setSaving(true);
        const payload: Parameters<typeof updateOpenAISettingsAPI>[0] = {
            is_enabled: isEnabled,
            model,
            auto_analyze_enabled: autoAnalyze,
            max_leads_per_run: maxLeads,
        };
        if (apiKey) payload.api_key = apiKey;
        updateOpenAISettingsAPI(payload)
            .then((data) => {
                setSuccessMessage(t('saveSucceeded'));
                setApiKey('');
                setApiKeyMasked(data.api_key_masked ?? null);
                setLastError(data.last_error ?? null);
            })
            .catch((e: any) => setErrors({ general: e?.message || t('failedToSaveOpenAISettings') }))
            .finally(() => setSaving(false));
    };

    const handleTest = () => {
        if (openaiPolicyDisabled) {
            setErrors({ general: openaiPolicyMessage || t('integrationDisabledDefaultMessage') });
            return;
        }
        setTesting(true);
        setTestStatus('idle');
        setTestMessage(null);
        setSuccessMessage(null);
        setErrors({});
        const draftKey = apiKey.trim();
        const payload = draftKey ? { api_key: draftKey, model } : undefined;
        testOpenAISettingsAPI(payload)
            .then(() => {
                setTestStatus('success');
                setTestMessage(t('openaiConnectionOk'));
            })
            .catch((e: { code?: string; message?: string }) => {
                setTestStatus('error');
                setTestMessage(openaiTestErrorMessage(t, e));
            })
            .finally(() => setTesting(false));
    };

    const handleAnalyze = () => {
        setRunning(true);
        setErrors({});
        setSuccessMessage(null);
        setTestStatus('idle');
        setTestMessage(null);
        runAIAnalysisAPI(false)
            .then(() => {
                setSuccessMessage(t('openaiAnalyzeSuccess'));
                setErrors({});
            })
            .catch((e: any) => setErrors({ general: e?.message || t('openaiConnectionFailed') }))
            .finally(() => setRunning(false));
    };

    if (loading) {
        return (
            <Card>
                <SectionLoadingState className="py-12" label={t('loading')} />
            </Card>
        );
    }

    return (
        <Card>
            <div className="max-w-2xl space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('aiIntegrationTitle')}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('aiIntegrationDescription')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{t('openaiDataPrivacyNote')}</p>
                </div>

                {openaiPolicyDisabled && (
                    <div className="rounded-lg border px-4 py-3 text-sm bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
                        {openaiPolicyMessage || t('integrationDisabledDefaultMessage')}
                    </div>
                )}

                {lastError ? (
                    <p className="text-sm text-amber-700 dark:text-amber-300">{lastError}</p>
                ) : null}

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsEnabled(!isEnabled)}
                        disabled={openaiPolicyDisabled}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                    >
                        {isEnabled && <span className="w-2 h-2 rounded-full bg-green-500" />}
                        {t('openaiEnableIntegration')}
                    </button>
                </div>

                <div className="grid gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('openaiApiKey')}
                            {apiKeyMasked ? (
                                <span className="text-xs text-gray-500 ms-2">({apiKeyMasked})</span>
                            ) : null}
                        </label>
                        <div className="relative">
                            <input
                                id="openai-api-key"
                                name="openai_api_key"
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    clearFieldError(setErrors, 'apiKey');
                                }}
                                autoComplete="new-password"
                                data-form-type="other"
                                data-lpignore="true"
                                className={`w-full rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 pr-10 text-sm ${errors.apiKey ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                placeholder={t('openaiApiKeyPlaceholder')}
                            />
                            <button
                                type="button"
                                className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-500"
                                onClick={() => setShowApiKey(!showApiKey)}
                                title={showApiKey ? t('hide') : t('show')}
                                aria-label={showApiKey ? t('hide') : t('show')}
                            >
                                {showApiKey ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        {errors.apiKey && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.apiKey}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('openaiModel')}</label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                        >
                            {OPENAI_MODEL_OPTIONS.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {t(m.labelKey)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('openaiMaxLeadsPerRun')}
                        </label>
                        <NumberInput
                            id="openai-max-leads-per-run"
                            name="openai_max_leads_per_run"
                            min={1}
                            max={100}
                            step={1}
                            value={maxLeads}
                            disabled={openaiPolicyDisabled}
                            onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                if (!isNaN(value) && value >= 1) {
                                    setMaxLeads(Math.min(100, value));
                                } else if (e.target.value === '') {
                                    setMaxLeads(1);
                                }
                            }}
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                            type="checkbox"
                            checked={autoAnalyze}
                            onChange={(e) => setAutoAnalyze(e.target.checked)}
                        />
                        {t('openaiAutoAnalyze')}
                    </label>
                </div>

                {errors.general && (
                    <div className="rounded-lg border px-4 py-3 text-sm bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
                        {errors.general}
                    </div>
                )}
                {testStatus === 'success' && testMessage ? (
                    <div className="rounded-lg border px-4 py-3 text-sm bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200">
                        {testMessage}
                    </div>
                ) : null}
                {testStatus === 'error' && testMessage ? (
                    <div className="rounded-lg border px-4 py-3 text-sm bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
                        {testMessage}
                    </div>
                ) : null}
                {running && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('aiAnalysisRunning')}</p>
                )}
                {successMessage && !running && testStatus === 'idle' && (
                    <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
                )}

                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSave} disabled={saving || openaiPolicyDisabled} loading={saving}>
                        {t('save')}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleTest}
                        disabled={openaiPolicyDisabled}
                        loading={testing}
                    >
                        {t('openaiTestConnection')}
                    </Button>
                    {canRunAnalysis ? (
                        <Button
                            variant="secondary"
                            onClick={handleAnalyze}
                            disabled={running || openaiPolicyDisabled || !isEnabled}
                            loading={running}
                        >
                            {t('openaiAnalyzeNow')}
                        </Button>
                    ) : null}
                </div>
            </div>
        </Card>
    );
}

export const IntegrationsPage = () => {
    const { 
        t, 
        language,
        currentPage,
        setCurrentPage,
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
        setAlertMessage,
        setAlertVariant,
        setIsAlertModalOpen,
    } = useAppContext();

    const companyId = currentUser?.company?.id as number | string | undefined;

    const showAlert = (message: string, variant: 'info' | 'warning' | 'error' = 'info') => {
        setAlertMessage(message);
        setAlertVariant(variant);
        setIsAlertModalOpen(true);
    };

    const userRole = normalizeRole(currentUser?.role);
    // Same staff roles as Sidebar: may use WhatsApp chats, but not connect/manage accounts.
    const isEmployee = userRole === 'Employee' || userRole === 'Doctor';

    // Get platform param based on currentPage
    const platformParam = useMemo(() => {
        if (currentPage === 'Meta' || currentPage === 'Integrations') {
            return 'meta';
        } else if (currentPage === 'TikTok') {
            return 'tiktok';
        } else if (currentPage === 'WhatsApp' || currentPage === 'Chats' || currentPage === 'Messaging Center') {
            return 'whatsapp';
        } else if (currentPage === 'Twilio') {
            return 'twilio';
        } else if (currentPage === 'AI') {
            return 'openai';
        } else if (currentPage === 'Lead API') {
            return 'api';
        } else if (currentPage === 'Mujeb') {
            return 'mujeb';
        } else if (currentPage === 'PBX') {
            return 'pbx';
        }
        return undefined;
    }, [currentPage]);
    const needsIntegrationPolicy = !!platformParam || currentPage === 'Twilio' || currentPage === 'AI' || currentPage === 'Lead API' || currentPage === 'Mujeb' || currentPage === 'PBX';
    const { data: integrationPolicyMap } = useQuery({
        queryKey: ['integrationPolicy'],
        queryFn: getIntegrationPolicyAPI,
        enabled: needsIntegrationPolicy,
    });

    // Get dataKey based on currentPage (memoized)
    const dataKey = useMemo(() => {
        let platformKey: string;
        switch (currentPage) {
            case 'Integrations':
            case 'Meta':
                platformKey = 'Meta';
                break;
            case 'WhatsApp':
            case 'Chats':
            case 'Messaging Center':
                platformKey = 'WhatsApp';
                break;
            default:
                return null;
        }
        return platformConfig[platformKey]?.dataKey || null;
    }, [currentPage]);

    const accountsQueryEnabled = platformParam === 'meta' || platformParam === 'whatsapp';
    const { data: accountsResponse, isLoading: loading } = useConnectedAccounts(platformParam, {
        enabled: accountsQueryEnabled,
    });
    const { data: leadgenConfig, isLoading: leadgenLoading } = useQuery({
        queryKey: ['tiktokLeadgenConfig'],
        queryFn: getTikTokLeadgenConfigAPI,
        enabled: currentPage === 'TikTok',
    });

    const isLeadApiPage = currentPage === 'Lead API';
    const { data: leadApiConfig, isLoading: leadApiLoading, refetch: refetchLeadApiConfig } = useQuery({
        queryKey: ['leadApiConfig'],
        queryFn: getLeadApiConfigAPI,
        enabled: isLeadApiPage,
    });
    const isMujebPage = currentPage === 'Mujeb';
    const { data: mujebConfig, isLoading: mujebLoading, refetch: refetchMujebConfig } = useQuery({
        queryKey: ['mujebConfig'],
        queryFn: getMujebConfigAPI,
        enabled: isMujebPage,
    });
    const [leadApiKeyName, setLeadApiKeyName] = useState('');
    const [leadApiSecretModal, setLeadApiSecretModal] = useState<string | null>(null);
    const [leadApiKeyBusy, setLeadApiKeyBusy] = useState(false);
    const [leadApiKeyError, setLeadApiKeyError] = useState<string | null>(null);
    const [showLeadApiSecret, setShowLeadApiSecret] = useState(false);
    const [leadApiTab, setLeadApiTab] = useState<'setup' | 'docs'>('setup');

    // WhatsApp Messaging Center state (hooks at top level); persist tab in localStorage (employees cannot see 'accounts')
    const [whatsAppTab, setWhatsAppTab] = useState<'chats' | 'templates' | 'accounts' | 'campaigns'>(() => {
        try {
            const s = localStorage.getItem('whatsapp_messaging_tab');
            if (s === 'chats' || s === 'templates' || s === 'campaigns') return s;
            if (s === 'accounts') return 'accounts'; // will be clamped for employees in WhatsApp block
        } catch (_) {}
        return 'chats';
    });
    const setWhatsAppTabPersisted = (tab: 'chats' | 'templates' | 'accounts' | 'campaigns') => {
        const next = isEmployee && tab === 'accounts' ? 'chats' : tab;
        setWhatsAppTab(next);
        try {
            localStorage.setItem('whatsapp_messaging_tab', next);
        } catch (_) {}
    };
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplateType | null>(null);
    const [submittingTemplateId, setSubmittingTemplateId] = useState<number | null>(null);
    const [syncingTemplates, setSyncingTemplates] = useState(false);
    const [syncingPhoneAccountId, setSyncingPhoneAccountId] = useState<number | null>(null);
    const [enablingCallingAccountId, setEnablingCallingAccountId] = useState<number | null>(null);
    const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');
    const [isStartNewConversationOpen, setIsStartNewConversationOpen] = useState(false);
    const [extraConversations, setExtraConversations] = useState<Array<{ client: any }>>([]);
    const manualChatsHydratedRef = useRef(false);
    const [selectedChatClient, setSelectedChatClient] = useState<any>(null);
    const [optimisticMessages, setOptimisticMessages] = useState<ManualChatMessage[]>([]);
    const [chatToast, setChatToast] = useState<{ message: string; variant: 'error' | 'warning' } | null>(null);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

    // Staff must not stay on Accounts if role/localStorage left them there.
    useEffect(() => {
        if (isEmployee && whatsAppTab === 'accounts') {
            setWhatsAppTabPersisted('chats');
        }
    }, [isEmployee, whatsAppTab]);

    // Staff no longer use Integrations → WhatsApp for chats; send them to Chats.
    useEffect(() => {
        if (isEmployee && currentPage === 'WhatsApp') {
            setCurrentPage('Chats');
            navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Chats');
        }
    }, [isEmployee, currentPage, currentUser?.company?.name, currentUser?.company?.domain, setCurrentPage]);

    const isChatsPage = currentPage === 'Chats';
    const isChatPollingPage = isChatsPage;
    const { data: conversationsList = [], refetch: refetchConversations } = useWhatsAppConversations({
        enabled: isChatPollingPage,
        refetchInterval: isChatPollingPage ? 8000 : false,
    });
    const selectedChatLeadId =
        selectedChatClient && typeof selectedChatClient.id === 'number' ? selectedChatClient.id : undefined;
    const selectedChatPhone = selectedChatClient ? normalizeChatPhone(selectedChatClient) : '';
    const {
        data: leadWhatsAppMessages = [],
        refetch: refetchLeadWhatsApp,
        isFetching: isFetchingChatMessages,
    } = useWhatsAppChatMessages({
        clientId: selectedChatLeadId,
        phone: selectedChatPhone || undefined,
        enabled: isChatPollingPage && !!selectedChatClient,
        refetchInterval: isChatPollingPage && !!selectedChatClient ? 5000 : false,
    });

    // Link manual-number chat to CRM lead once Meta/webhook created or matched a client
    useEffect(() => {
        if (!isChatPollingPage || !selectedChatPhone || !selectedChatClient) return;
        if (!isManualChatClient(selectedChatClient)) return;
        let cancelled = false;
        getWhatsAppContactByPhoneAPI(selectedChatPhone).then((contact) => {
            if (cancelled || !contact?.id) return;
            setSelectedChatClient({
                id: contact.id,
                name: contact.name,
                phone_number: contact.phone_number || selectedChatPhone,
                lead_company_name: contact.lead_company_name || contact.company_name || '',
            });
            saveSelectedManualPhone(companyId, null);
            refetchConversations();
            refetchLeadWhatsApp();
        });
        return () => {
            cancelled = true;
        };
    }, [isChatPollingPage, selectedChatPhone, selectedChatClient?.id, companyId]);

    // Drop optimistic "sent" rows once the server thread has them; keep sending/failed
    useEffect(() => {
        if (!leadWhatsAppMessages.length) return;
        setOptimisticMessages((prev) => prev.filter((m) => m.status === 'sending' || m.status === 'failed'));
    }, [leadWhatsAppMessages]);

    const { data: waSession, refetch: refetchWaSession } = useQuery({
        queryKey: ['whatsappSession', selectedChatLeadId, selectedChatPhone],
        queryFn: () =>
            typeof selectedChatLeadId === 'number'
                ? getWhatsAppSessionWindowAPI({ clientId: selectedChatLeadId })
                : getWhatsAppSessionWindowAPI({ phone: selectedChatPhone }),
        enabled:
            isChatPollingPage &&
            (typeof selectedChatLeadId === 'number' ||
                (!!selectedChatPhone && selectedChatPhone.replace(/\D/g, '').length >= 7)),
    });

    const conversations = useMemo(() => {
        const fromApi = (conversationsList as any[]).map((c: any) => ({
            client: {
                id: c.id,
                name: c.name,
                phone_number: c.phone_number || '',
                lead_company_name: c.lead_company_name || '',
            },
        }));
        const extra = extraConversations.filter((e) => {
            const ep = normalizeChatPhone(e.client);
            return !fromApi.some((a: any) => {
                const ap = normalizeChatPhone(a.client);
                return a.client.id === e.client.id || (ep && ap === ep);
            });
        });
        return [...fromApi, ...extra];
    }, [conversationsList, extraConversations]);

    useEffect(() => {
        if (!companyId || !isChatPollingPage) return;
        const merged = mergeManualConversations(companyId);
        setExtraConversations(merged);
        manualChatsHydratedRef.current = true;
        const phone = loadSelectedManualPhone(companyId);
        if (!phone) return;
        const match = merged.find((e) => normalizeChatPhone(e.client) === phone);
        const client = match?.client ?? buildManualClientForPhone(phone);
        if (!match) {
            setExtraConversations((prev) => {
                if (prev.some((e) => normalizeChatPhone(e.client) === phone)) return prev;
                return [{ client }, ...prev];
            });
        }
        setSelectedChatClient(client);
        setOptimisticMessages(loadManualMessages(companyId, phone));
    }, [companyId, isChatPollingPage]);

    useEffect(() => {
        if (!companyId || !manualChatsHydratedRef.current) return;
        saveManualConversations(companyId, extraConversations);
    }, [companyId, extraConversations]);
    const [messageInput, setMessageInput] = useState('');
    const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
    const [chatTemplateSendId, setChatTemplateSendId] = useState<number | ''>('');
    const [chatTemplateSending, setChatTemplateSending] = useState(false);
    const [resendingMessageId, setResendingMessageId] = useState<string | null>(null);
    const [infoAlert, setInfoAlert] = useState<{ title: string; message: string } | null>(null);

    useEffect(() => {
        setChatTemplateSendId('');
    }, [selectedChatLeadId]);

    // Message campaign state (WhatsApp tab: campaigns)
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
    const [metaHealthModalOpen, setMetaHealthModalOpen] = useState(false);
    const [metaHealthLoading, setMetaHealthLoading] = useState(false);
    const [metaHealthData, setMetaHealthData] = useState<MetaHealthResponse | null>(null);
    const [metaHealthAccountId, setMetaHealthAccountId] = useState<number | null>(null);
    const [testConnectionAccountId, setTestConnectionAccountId] = useState<number | null>(null);
    const [selectLeadFormAccountId, setSelectLeadFormAccountId] = useState<number | null>(null);
    const [metaHealthSelectedPageId, setMetaHealthSelectedPageId] = useState<string>('');
    const [metaPixelDrafts, setMetaPixelDrafts] = useState<Record<number, string>>({});
    const [metaPixelSavingId, setMetaPixelSavingId] = useState<number | null>(null);
    const [metaPixelSavedId, setMetaPixelSavedId] = useState<number | null>(null);
    const [messagingCenterTab, setMessagingCenterTab] = useState<'campaign' | 'template' | 'logs'>(() => {
        try {
            const s = localStorage.getItem('messaging_center_tab');
            if (s === 'campaign' || s === 'template' || s === 'logs') return s;
        } catch (_) {}
        return 'campaign';
    });
    const setMessagingCenterTabPersisted = (tab: 'campaign' | 'template' | 'logs') => {
        setMessagingCenterTab(tab);
        try {
            localStorage.setItem('messaging_center_tab', tab);
        } catch (_) {}
    };

    const { data: templates = [], refetch: refetchTemplates } = useQuery({
        queryKey: ['messageTemplates'],
        queryFn: getMessageTemplatesAPI,
        enabled: isChatsPage || currentPage === 'Messaging Center',
    });

    const approvedWaTemplates = useMemo(
        () =>
            (templates as MessageTemplateType[]).filter((tpl) => {
                const ch = (tpl.channel_type || '').toLowerCase();
                if (ch !== 'whatsapp' && ch !== 'whatsapp_api') return false;
                return (tpl.meta_status || '').toUpperCase() === 'APPROVED';
            }),
        [templates]
    );

    const { data: whatsAppLimits } = useQuery({
        queryKey: ['whatsAppLimits'],
        queryFn: getWhatsAppLimitsAPI,
        enabled: (currentPage === 'Messaging Center') && campaignChannel === 'whatsapp',
    });

    const { data: smsSettings } = useQuery({
        queryKey: ['twilioSettings'],
        queryFn: getTwilioSettingsAPI,
        enabled:
            currentPage === 'Messaging Center' &&
            campaignChannel === 'sms',
    });

    useEffect(() => {
        setCampaignWhatsAppTemplateId(null);
    }, [campaignChannel]);
    const accounts: Account[] = useMemo(() => {
        const accountsData = Array.isArray(accountsResponse) 
            ? accountsResponse 
            : (accountsResponse?.results || []);
        
        return accountsData.map((acc: any): Account => ({
            id: acc.id,
            name: acc.name,
            status: acc.status === 'connected' ? 'Connected' : acc.status === 'disconnected' ? 'Disconnected' : acc.status_display || 'Disconnected',
            platform: acc.platform,
            metadata: acc.metadata,
            is_active: acc.is_active !== false,
        }));
    }, [accountsResponse]);

    // Get platform details (memoized)
    const platform = useMemo(() => {
        if (!dataKey) return null;
        const config = platformConfig[Object.keys(platformConfig).find(key => platformConfig[key].dataKey === dataKey) || ''];
        if (!config) return null;
        return {
            name: config.name,
            dataKey: dataKey,
        };
    }, [dataKey]);

    const currentPolicy = platformParam ? integrationPolicyMap?.[platformParam] : undefined;

    function renderSmsProviderPolicyBanners() {
        if (currentPage !== 'Twilio' || !integrationPolicyMap) return null;
        const providers: { key: 'twilio' | 'otpiq'; label: string }[] = [
            { key: 'twilio', label: 'Twilio' },
            { key: 'otpiq', label: 'OTPIQ' },
        ];
        const disabled = providers.filter((p) => integrationPolicyMap[p.key]?.enabled === false);
        if (!disabled.length) return null;
        return (
            <>
                {disabled.map(({ key, label }) => {
                    const policy = integrationPolicyMap[key];
                    const title = (t('smsProviderDisabledTitle') || '{provider} SMS is unavailable').replace(
                        '{provider}',
                        label,
                    );
                    return (
                        <div
                            key={key}
                            className="mb-4 rounded-lg border px-4 py-3 text-sm bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200"
                        >
                            <div className="font-semibold">{title}</div>
                            <div className="mt-1">
                                {resolveIntegrationPolicyMessage(policy?.message, policy?.scope, t)}
                            </div>
                        </div>
                    );
                })}
            </>
        );
    }

    /** Admin/plan policy: only show a banner when the integration is turned off (no redundant "all good" green bar). */
    function renderPolicyBanner() {
        if (currentPage === 'Twilio') return null;
        const policy = currentPolicy;
        if (!policy || policy.enabled !== false) return null;
        return (
            <div className="mb-4 rounded-lg border px-4 py-3 text-sm bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
                <div className="font-semibold">{t('integrationStatusDisabled') || 'Integration is disabled'}</div>
                <div className="mt-1">
                    {resolveIntegrationPolicyMessage(policy.message, policy.scope, t)}
                </div>
            </div>
        );
    }

    // SMS integration (Twilio or OTPIQ)
    const replaceTwilio = (str: string) => (str || '').replace(/\{\{twilio\}\}/g, t('twilioWord') || 'Twilio');
    if (currentPage === 'Twilio') {
        return (
            <PageWrapper title={t('twilioSmsIntegration') || 'SMS Notifications Integration'}>
                {renderSmsProviderPolicyBanners()}
                <TwilioSMSForm t={t} replaceTwilio={replaceTwilio} integrationPolicyMap={integrationPolicyMap} />
            </PageWrapper>
        );
    }

    if (currentPage === 'PBX') {
        return <PbxSettingsPage t={t} integrationPolicyMap={integrationPolicyMap} />;
    }

    if (currentPage === 'AI') {
        const openaiPolicy = integrationPolicyMap?.openai;
        return (
            <PageWrapper title={t('aiIntegration')}>
                {openaiPolicy?.enabled === false ? (
                    <div className="mb-4 rounded-lg border px-4 py-3 text-sm bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
                        <div className="font-semibold">{t('integrationStatusDisabled')}</div>
                        <div className="mt-1">
                            {resolveIntegrationPolicyMessage(openaiPolicy.message, openaiPolicy.scope, t)}
                        </div>
                    </div>
                ) : null}
                <OpenAISettingsForm t={t} integrationPolicyMap={integrationPolicyMap} />
            </PageWrapper>
        );
    }

    if (currentPage === 'Mujeb') {
        const endpointUrl = mujebConfig?.endpoint_url || '';
        const statusRaw = String(mujebConfig?.integration_status || 'disconnected');
        const mujebPolicy = integrationPolicyMap?.mujeb;
        const mujebDisabled = mujebPolicy?.enabled === false;
        const isConnected = !mujebDisabled && (statusRaw === 'connected' || (mujebConfig?.keys?.length ?? 0) > 0);
        const lastReceivedAt = mujebConfig?.last_received_at
            ? new Date(mujebConfig.last_received_at).toLocaleString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' }))
            : null;
        const isCompanyAdmin = userRole === 'Owner';
        const setupSteps = [
            { step: 1, text: t('mujebStep1') },
            { step: 2, text: t('mujebStep2') },
            { step: 3, text: t('mujebStep3') },
            { step: 4, text: t('mujebStep4') },
        ];
        const handleGenerateKey = async () => {
            if (mujebDisabled) {
                showAlert(resolveIntegrationPolicyMessage(mujebPolicy?.message, mujebPolicy?.scope, t), 'warning');
                return;
            }
            const name = leadApiKeyName.trim();
            if (!name) {
                setLeadApiKeyError(t('leadApiKeyNameRequired') || t('leadApiKeyName') || 'Key name is required');
                return;
            }
            setLeadApiKeyError(null);
            setLeadApiKeyBusy(true);
            try {
                const data = await createLeadApiKeyAPI(name);
                setLeadApiKeyName('');
                setLeadApiSecretModal(data.api_key);
                setShowLeadApiSecret(true);
                refetchMujebConfig();
            } catch (e: any) {
                setLeadApiKeyError(e?.message || t('leadApiKeyCreateFailed'));
            } finally {
                setLeadApiKeyBusy(false);
            }
        };
        const handleRotateKey = async (keyId: number) => {
            if (mujebDisabled) {
                showAlert(resolveIntegrationPolicyMessage(mujebPolicy?.message, mujebPolicy?.scope, t), 'warning');
                return;
            }
            setLeadApiKeyBusy(true);
            try {
                const data = await rotateLeadApiKeyAPI(keyId);
                setLeadApiSecretModal(data.api_key);
                setShowLeadApiSecret(true);
                refetchMujebConfig();
            } catch (e: any) {
                showAlert(e?.message || t('leadApiKeyRotateFailed'), 'error');
            } finally {
                setLeadApiKeyBusy(false);
            }
        };
        return (
            <PageWrapper title={t('mujebTitle')}>
                {renderPolicyBanner()}
                <Card>
                    <div className="max-w-2xl space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-500/10 ring-1 ring-teal-500/25">
                                <FileTextIcon className="h-8 w-8 text-teal-700 dark:text-teal-200" />
                            </span>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('mujebTitle')}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('mujebDescription')}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            mujebDisabled
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                : isConnected
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                        }`}
                                    >
                                        {mujebDisabled
                                            ? t('integrationStatusDisabled')
                                            : isConnected
                                            ? t('mujebStatusConnected')
                                            : t('mujebStatusPending')}
                                    </span>
                                    {!mujebDisabled && lastReceivedAt && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('mujebLastReceived')} {lastReceivedAt}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {mujebLoading ? (
                            <div className="flex items-center justify-center py-8"><Loader variant="primary" className="h-8" /></div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('mujebEndpoint')}
                                    </label>
                                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                                        {t('mujebEndpointHint')}
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={endpointUrl}
                                            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm font-mono"
                                        />
                                        <Button
                                            variant="secondary"
                                            disabled={mujebDisabled}
                                            onClick={() => { if (endpointUrl) navigator.clipboard.writeText(endpointUrl); showAlert(t('copied') || 'Copied', 'info'); }}
                                        >
                                            {t('copy')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/50">
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                        {t('mujebSetupSteps')}
                                    </h3>
                                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                        {setupSteps.map(({ step, text }) => (
                                            <li key={step}>{text}</li>
                                        ))}
                                    </ol>
                                </div>
                                <div className={`space-y-4 ${mujebDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                            {t('leadApiKeys')}
                                        </h3>
                                        {(mujebConfig?.keys?.length ?? 0) > 0 && (
                                            <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:text-teal-200">
                                                {mujebConfig?.keys?.length}
                                            </span>
                                        )}
                                    </div>
                                    {!isCompanyAdmin && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400">{t('leadApiAdminOnly')}</p>
                                    )}
                                    {isCompanyAdmin && (
                                        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/40 p-4">
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
                                                {t('leadApiGenerateKey')}
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                                <div className="flex-1 min-w-0">
                                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        {t('leadApiKeyName')}
                                                    </label>
                                                    <Input
                                                        value={leadApiKeyName}
                                                        onChange={(e) => {
                                                            setLeadApiKeyName(e.target.value);
                                                            setLeadApiKeyError(null);
                                                        }}
                                                        placeholder={t('leadApiKeyNamePlaceholder')}
                                                        disabled={mujebDisabled}
                                                        className={leadApiKeyError ? 'border-red-500 dark:border-red-500' : ''}
                                                    />
                                                    {leadApiKeyError && (
                                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{leadApiKeyError}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="primary"
                                                    className="shrink-0 w-full sm:w-auto"
                                                    disabled={leadApiKeyBusy || mujebDisabled}
                                                    loading={leadApiKeyBusy}
                                                    onClick={handleGenerateKey}
                                                >
                                                    <PlusIcon className="h-4 w-4" />
                                                    {t('leadApiGenerateKey')}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    {(mujebConfig?.keys?.length ?? 0) === 0 ? (
                                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-8 text-center">
                                            <FileTextIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('leadApiNoKeys')}</p>
                                        </div>
                                    ) : (
                                        <ul className="space-y-3">
                                            {(mujebConfig?.keys || []).map((k) => {
                                                const dateLocale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US';
                                                const dateOpts = withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' });
                                                const createdLabel = k.created_at
                                                    ? new Date(k.created_at).toLocaleString(dateLocale, dateOpts)
                                                    : '—';
                                                const lastUsedLabel = k.last_used_at
                                                    ? new Date(k.last_used_at).toLocaleString(dateLocale, dateOpts)
                                                    : t('leadApiKeyNeverUsed');
                                                return (
                                                    <li
                                                        key={k.id}
                                                        className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/60 shadow-sm overflow-hidden"
                                                    >
                                                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="flex min-w-0 flex-1 items-start gap-3">
                                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
                                                                    <FileTextIcon className="h-5 w-5" />
                                                                </span>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                                        {k.name}
                                                                    </p>
                                                                    <bdi
                                                                        dir="ltr"
                                                                        className="mt-1 block max-w-full rounded-md bg-gray-100 dark:bg-gray-900/80 px-2 py-1 font-mono text-xs text-gray-600 dark:text-gray-300 text-left [unicode-bidi:isolate]"
                                                                    >
                                                                        <span className="text-gray-900 dark:text-gray-100">{k.key_prefix}</span>
                                                                        <span className="text-gray-400 dark:text-gray-500 select-none tracking-wider">
                                                                            {'•'.repeat(12)}
                                                                        </span>
                                                                        {k.key_suffix ? (
                                                                            <span className="text-gray-900 dark:text-gray-100">{k.key_suffix}</span>
                                                                        ) : null}
                                                                    </bdi>
                                                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                                        <span>
                                                                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                                                                {t('leadApiKeyCreated')}:
                                                                            </span>{' '}
                                                                            {createdLabel}
                                                                        </span>
                                                                        <span>
                                                                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                                                                {t('leadApiKeyLastUsed')}:
                                                                            </span>{' '}
                                                                            {lastUsedLabel}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isCompanyAdmin && (
                                                                <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-stretch lg:flex-row">
                                                                    <Button
                                                                        variant="secondary"
                                                                        className="flex-1 sm:flex-none text-sm px-3 py-1.5"
                                                                        disabled={leadApiKeyBusy || mujebDisabled}
                                                                        title={t('leadApiRotateKey')}
                                                                        onClick={() => handleRotateKey(k.id)}
                                                                    >
                                                                        {t('leadApiRotateKey')}
                                                                    </Button>
                                                                    <Button
                                                                        variant="danger"
                                                                        className="flex-1 sm:flex-none text-sm px-3 py-1.5 inline-flex items-center justify-center gap-1.5"
                                                                        disabled={leadApiKeyBusy || mujebDisabled}
                                                                        title={t('leadApiRevokeKey')}
                                                                        onClick={() => {
                                                                            setConfirmDeleteConfig({
                                                                                title: t('leadApiRevokeKey'),
                                                                                message: t('leadApiConfirmRevokeMessage'),
                                                                                itemName: k.name,
                                                                                onConfirm: async () => {
                                                                                    setLeadApiKeyBusy(true);
                                                                                    try {
                                                                                        await revokeLeadApiKeyAPI(k.id);
                                                                                        refetchMujebConfig();
                                                                                        showAlert(t('leadApiRevokeKey'), 'info');
                                                                                    } catch (e: any) {
                                                                                        showAlert(e?.message || t('leadApiKeyRevokeFailed'), 'error');
                                                                                    } finally {
                                                                                        setLeadApiKeyBusy(false);
                                                                                    }
                                                                                },
                                                                            });
                                                                            setIsConfirmDeleteModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <TrashIcon className="h-4 w-4" />
                                                                        {t('leadApiRevokeKey')}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </Card>
                <Modal
                    isOpen={!!leadApiSecretModal}
                    onClose={() => { setLeadApiSecretModal(null); setShowLeadApiSecret(false); }}
                    title={t('leadApiNewKeyTitle')}
                >
                    <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">{t('leadApiNewKeyWarning')}</p>
                    <div className="flex gap-2">
                        <input
                            readOnly
                            type={showLeadApiSecret ? 'text' : 'password'}
                            value={leadApiSecretModal || ''}
                            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono"
                        />
                        <button
                            type="button"
                            className="p-2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowLeadApiSecret((v) => !v)}
                            aria-label="Toggle visibility"
                        >
                            {showLeadApiSecret ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                if (leadApiSecretModal) navigator.clipboard.writeText(leadApiSecretModal);
                                showAlert(t('copied') || 'Copied', 'info');
                            }}
                        >
                            {t('copy')}
                        </Button>
                    </div>
                </Modal>
            </PageWrapper>
        );
    }

    if (currentPage === 'Lead API') {
        const endpointUrl = leadApiConfig?.endpoint_url || '';
        const docLanguage = language === 'ar' ? 'ar' : 'en';
        const statusRaw = String(leadApiConfig?.integration_status || 'disconnected');
        const isConnected = statusRaw === 'connected' || (leadApiConfig?.keys?.length ?? 0) > 0;
        const lastReceivedAt = leadApiConfig?.last_received_at
            ? new Date(leadApiConfig.last_received_at).toLocaleString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' }))
            : null;
        const isCompanyAdmin = userRole === 'Owner';
        const apiPolicy = integrationPolicyMap?.api;
        const setupSteps = [
            { step: 1, text: t('leadApiSetupStep1') },
            { step: 2, text: t('leadApiSetupStep2') },
            { step: 3, text: t('leadApiSetupStep3') },
        ];
        const handleGenerateKey = async () => {
            const name = leadApiKeyName.trim();
            if (!name) {
                setLeadApiKeyError(t('leadApiKeyNameRequired') || t('leadApiKeyName') || 'Key name is required');
                return;
            }
            setLeadApiKeyError(null);
            setLeadApiKeyBusy(true);
            try {
                const data = await createLeadApiKeyAPI(name);
                setLeadApiKeyName('');
                setLeadApiSecretModal(data.api_key);
                setShowLeadApiSecret(true);
                refetchLeadApiConfig();
            } catch (e: any) {
                setLeadApiKeyError(e?.message || t('leadApiKeyCreateFailed'));
            } finally {
                setLeadApiKeyBusy(false);
            }
        };
        const handleRotateKey = async (keyId: number) => {
            setLeadApiKeyBusy(true);
            try {
                const data = await rotateLeadApiKeyAPI(keyId);
                setLeadApiSecretModal(data.api_key);
                setShowLeadApiSecret(true);
                refetchLeadApiConfig();
            } catch (e: any) {
                showAlert(e?.message || t('leadApiKeyRotateFailed'), 'error');
            } finally {
                setLeadApiKeyBusy(false);
            }
        };
        return (
            <PageWrapper title={t('leadApiTitle')}>
                {apiPolicy?.enabled === false ? (
                    <div className="mb-4 rounded-lg border px-4 py-3 text-sm bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
                        <div className="font-semibold">{t('integrationStatusDisabled')}</div>
                        <div className="mt-1">{resolveIntegrationPolicyMessage(apiPolicy.message, apiPolicy.scope, t)}</div>
                    </div>
                ) : null}
                <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                    <button
                        type="button"
                        onClick={() => setLeadApiTab('setup')}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            leadApiTab === 'setup'
                                ? 'bg-primary text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        {leadApiDocT(docLanguage, 'leadApiDocTabSetup')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setLeadApiTab('docs')}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            leadApiTab === 'docs'
                                ? 'bg-primary text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        {leadApiDocT(docLanguage, 'leadApiDocTabDocs')}
                    </button>
                </div>
                {leadApiTab === 'docs' ? (
                    <Card>
                        <LeadApiDocumentation
                            endpointUrl={endpointUrl}
                            onBack={() => setLeadApiTab('setup')}
                        />
                    </Card>
                ) : null}
                {leadApiTab === 'setup' ? (
                <Card>
                    <div className="max-w-2xl space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/25">
                                <FileTextIcon className="h-8 w-8 text-primary-700 dark:text-primary-200" />
                            </span>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('leadApiTitle')}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('leadApiDescription')}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            isConnected
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                        }`}
                                    >
                                        {isConnected ? t('leadApiStatusConnected') : t('leadApiStatusPending')}
                                    </span>
                                    {lastReceivedAt && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('leadApiLastReceived')} {lastReceivedAt}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {leadApiLoading ? (
                            <div className="flex items-center justify-center py-8"><Loader variant="primary" className="h-8" /></div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('leadApiEndpoint')}
                                    </label>
                                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                                        {t('leadApiEndpointHint')}
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={endpointUrl}
                                            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm font-mono"
                                        />
                                        <Button
                                            variant="secondary"
                                            onClick={() => { if (endpointUrl) navigator.clipboard.writeText(endpointUrl); showAlert(t('copied') || 'Copied', 'info'); }}
                                        >
                                            {t('copy')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/50">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                            {t('tiktokSetupSteps')}
                                        </h3>
                                        <Button variant="secondary" className="text-xs" onClick={() => setLeadApiTab('docs')}>
                                            {leadApiDocT(docLanguage, 'leadApiDocViewDocumentation')}
                                        </Button>
                                    </div>
                                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                        {setupSteps.map(({ step, text }) => (
                                            <li key={step}>{text}</li>
                                        ))}
                                    </ol>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                            {t('leadApiKeys')}
                                        </h3>
                                        {(leadApiConfig?.keys?.length ?? 0) > 0 && (
                                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary-800 dark:text-primary-200">
                                                {leadApiConfig?.keys?.length}
                                            </span>
                                        )}
                                    </div>
                                    {!isCompanyAdmin && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400">{t('leadApiAdminOnly')}</p>
                                    )}
                                    {isCompanyAdmin && (
                                        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/40 p-4">
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
                                                {t('leadApiGenerateKey')}
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                                <div className="flex-1 min-w-0">
                                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        {t('leadApiKeyName')}
                                                    </label>
                                                    <Input
                                                        value={leadApiKeyName}
                                                        onChange={(e) => {
                                                            setLeadApiKeyName(e.target.value);
                                                            setLeadApiKeyError(null);
                                                        }}
                                                        placeholder={t('leadApiKeyNamePlaceholder')}
                                                        className={leadApiKeyError ? 'border-red-500 dark:border-red-500' : ''}
                                                    />
                                                    {leadApiKeyError && (
                                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{leadApiKeyError}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="primary"
                                                    className="shrink-0 w-full sm:w-auto"
                                                    disabled={leadApiKeyBusy}
                                                    loading={leadApiKeyBusy}
                                                    onClick={handleGenerateKey}
                                                >
                                                    <PlusIcon className="h-4 w-4" />
                                                    {t('leadApiGenerateKey')}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    {(leadApiConfig?.keys?.length ?? 0) === 0 ? (
                                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-8 text-center">
                                            <FileTextIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('leadApiNoKeys')}</p>
                                        </div>
                                    ) : (
                                        <ul className="space-y-3">
                                            {(leadApiConfig?.keys || []).map((k) => {
                                                const dateLocale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US';
                                                const dateOpts = withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' });
                                                const createdLabel = k.created_at
                                                    ? new Date(k.created_at).toLocaleString(dateLocale, dateOpts)
                                                    : '—';
                                                const lastUsedLabel = k.last_used_at
                                                    ? new Date(k.last_used_at).toLocaleString(dateLocale, dateOpts)
                                                    : t('leadApiKeyNeverUsed');
                                                return (
                                                    <li
                                                        key={k.id}
                                                        className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/60 shadow-sm overflow-hidden"
                                                    >
                                                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="flex min-w-0 flex-1 items-start gap-3">
                                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                                                                    <FileTextIcon className="h-5 w-5" />
                                                                </span>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                                        {k.name}
                                                                    </p>
                                                                    <bdi
                                                                        dir="ltr"
                                                                        className="mt-1 block max-w-full rounded-md bg-gray-100 dark:bg-gray-900/80 px-2 py-1 font-mono text-xs text-gray-600 dark:text-gray-300 text-left [unicode-bidi:isolate]"
                                                                    >
                                                                        <span className="text-gray-900 dark:text-gray-100">{k.key_prefix}</span>
                                                                        <span className="text-gray-400 dark:text-gray-500 select-none tracking-wider">
                                                                            {'•'.repeat(12)}
                                                                        </span>
                                                                        {k.key_suffix ? (
                                                                            <span className="text-gray-900 dark:text-gray-100">{k.key_suffix}</span>
                                                                        ) : null}
                                                                    </bdi>
                                                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                                        <span>
                                                                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                                                                {t('leadApiKeyCreated')}:
                                                                            </span>{' '}
                                                                            {createdLabel}
                                                                        </span>
                                                                        <span>
                                                                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                                                                {t('leadApiKeyLastUsed')}:
                                                                            </span>{' '}
                                                                            {lastUsedLabel}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isCompanyAdmin && (
                                                                <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-stretch lg:flex-row">
                                                                    <Button
                                                                        variant="secondary"
                                                                        className="flex-1 sm:flex-none text-sm px-3 py-1.5"
                                                                        disabled={leadApiKeyBusy}
                                                                        title={t('leadApiRotateKey')}
                                                                        onClick={() => handleRotateKey(k.id)}
                                                                    >
                                                                        {t('leadApiRotateKey')}
                                                                    </Button>
                                                                    <Button
                                                                        variant="danger"
                                                                        className="flex-1 sm:flex-none text-sm px-3 py-1.5 inline-flex items-center justify-center gap-1.5"
                                                                        disabled={leadApiKeyBusy}
                                                                        title={t('leadApiRevokeKey')}
                                                                        onClick={() => {
                                                                            setConfirmDeleteConfig({
                                                                                title: t('leadApiRevokeKey'),
                                                                                message: t('leadApiConfirmRevokeMessage'),
                                                                                itemName: k.name,
                                                                                onConfirm: async () => {
                                                                                    setLeadApiKeyBusy(true);
                                                                                    try {
                                                                                        await revokeLeadApiKeyAPI(k.id);
                                                                                        refetchLeadApiConfig();
                                                                                        showAlert(t('leadApiRevokeKey'), 'info');
                                                                                    } catch (e: any) {
                                                                                        showAlert(e?.message || t('leadApiKeyRevokeFailed'), 'error');
                                                                                    } finally {
                                                                                        setLeadApiKeyBusy(false);
                                                                                    }
                                                                                },
                                                                            });
                                                                            setIsConfirmDeleteModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <TrashIcon className="h-4 w-4" />
                                                                        {t('leadApiRevokeKey')}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </Card>
                ) : null}
                <Modal
                    isOpen={!!leadApiSecretModal}
                    onClose={() => { setLeadApiSecretModal(null); setShowLeadApiSecret(false); }}
                    title={t('leadApiNewKeyTitle')}
                >
                    <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">{t('leadApiNewKeyWarning')}</p>
                    <div className="flex gap-2">
                        <input
                            readOnly
                            type={showLeadApiSecret ? 'text' : 'password'}
                            value={leadApiSecretModal || ''}
                            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono"
                        />
                        <button
                            type="button"
                            className="p-2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowLeadApiSecret((v) => !v)}
                            aria-label="Toggle visibility"
                        >
                            {showLeadApiSecret ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                if (leadApiSecretModal) navigator.clipboard.writeText(leadApiSecretModal);
                                showAlert(t('copied') || 'Copied', 'info');
                            }}
                        >
                            {t('copy')}
                        </Button>
                    </div>
                </Modal>
            </PageWrapper>
        );
    }

    // TikTok = Lead Gen webhook only (no user-managed integration accounts).
    if (currentPage === 'TikTok') {
        const webhookUrl = leadgenConfig?.webhook_url || '';
        const statusRaw = String(leadgenConfig?.integration_status || 'disconnected');
        const isConnected = statusRaw === 'connected';
        const lastReceivedAt = leadgenConfig?.last_received_at
            ? new Date(leadgenConfig.last_received_at).toLocaleString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' }))
            : null;
        const setupSteps = [
            { step: 1, text: t('tiktokStep1') || 'Copy the Webhook URL below (it is unique to your company).' },
            { step: 2, text: t('tiktokStep2') || 'In TikTok Ads Manager go to Leads Center → CRM integration → TikTok Custom API with Webhooks.' },
            { step: 3, text: t('tiktokStep3') || 'Paste the Webhook URL and save. Enable the integration if required.' },
            { step: 4, text: t('tiktokStep4') || 'Create a Lead Gen campaign with an Instant Form. New leads will appear as clients here automatically.' },
        ];
        return (
            <PageWrapper title={`${t('tikTok')} ${t('integration')}`}>
                {renderPolicyBanner()}
                <Card>
                    <div className="max-w-2xl space-y-6">
                        <div className="flex items-center gap-3">
                            <IntegrationPlatformIcon platform="tiktok" size="lg" variant="inline" />
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('tiktokLeadGen') || 'TikTok Lead Gen'}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('tiktokLeadGenDescription') || 'Receive leads from TikTok Instant Forms instantly in your CRM. Follow the steps below to connect TikTok Ads Manager.'}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            isConnected
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                        }`}
                                    >
                                        {isConnected ? (t('tiktokStatusConnected') || 'Connected') : (t('tiktokStatusPending') || 'Pending setup')}
                                    </span>
                                    {lastReceivedAt && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {(t('tiktokLastLeadReceivedAt') || 'Last lead received:')} {lastReceivedAt}
                                        </span>
                                    )}
                                </div>
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
                                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                                        {t('tiktokWebhookUrlHint') || 'Use this exact URL in TikTok Ads Manager. Do not edit company_id or signature.'}
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={webhookUrl}
                                            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm font-mono"
                                        />
                                        <Button
                                            variant="secondary"
                                            onClick={() => { if (webhookUrl) navigator.clipboard.writeText(webhookUrl); showAlert(t('copied') || 'Copied', 'info'); }}
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
    
    if (!platform || !dataKey) {
        return <PageWrapper title={t('integrations')}><div>{t('unknownIntegration')}</div></PageWrapper>;
    }

    const { name } = platform;
    const integrationPlatform = integrationPlatformFromDataKey(dataKey);
    const pageTitle = `${name} ${t('integration')}`;

    // Handlers for Connect / Edit / Disconnect (must be defined before any early return so WhatsApp "accounts" tab can use them)
    const disconnectAccountMutation = useDisconnectConnectedAccount();
    const createAccountMutation = useCreateConnectedAccount();
    const testConnectionMutation = useTestConnection();
    const queryClient = useQueryClient();
    const [isStartingConnect, setIsStartingConnect] = useState(false);
    const [connectingAccountId, setConnectingAccountId] = useState<number | null>(null);
    const connectingAccountIdRef = useRef<number | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const connected = urlParams.get('connected');
        const accountId = urlParams.get('account_id');
        if (connected !== 'true' || !accountId) return;
        const id = parseInt(accountId, 10);
        if (window.opener) return;
        window.history.replaceState({}, document.title, window.location.pathname);
        queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
        if (platformParam === 'meta') {
            getConnectedAccountsAPI(platformParam).then((accounts: any) => {
                const account = Array.isArray(accounts)
                    ? accounts.find((a: any) => a.id === id)
                    : accounts?.results?.find((a: any) => a.id === id);
                const cfg = account ? buildMetaLeadFormModalConfig(account, id) : null;
                if (cfg) {
                    setSelectLeadFormConfig(cfg);
                    setIsSelectLeadFormModalOpen(true);
                }
            }).catch(console.error);
        }
    }, [queryClient, platformParam]);

    const handleSelectLeadForm = async (account: any) => {
        if (account.platform !== 'meta') return;
        try {
            setSelectLeadFormAccountId(account.id);
            let baseAccount = account;
            let pages = account.metadata?.pages || [];
            try {
                const full = await getConnectedAccountAPI(account.id);
                if (full) {
                    baseAccount = full;
                    pages = full?.metadata?.pages || pages;
                }
            } catch (e) {
                console.error('Failed to load account pages:', e);
            }
            try {
                const res = await syncMetaPagesAPI(account.id);
                const syncedPages = res?.pages || [];
                if (syncedPages.length) {
                    pages = syncedPages;
                    queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
                }
            } catch (e) {
                console.error('Failed to sync Meta pages:', e);
            }
            if (!pages?.length) {
                setInfoAlert({
                    title: t('noFacebookPagesFound') || 'No Facebook pages found',
                    message: t('noFacebookPagesReconnectHint') || 'No Facebook pages were found for this account. Try disconnecting and reconnecting the account.',
                });
                return;
            }
            const merged = { ...baseAccount, metadata: { ...(baseAccount.metadata || {}), pages } };
            const cfg = buildMetaLeadFormModalConfig(merged, account.id);
            if (cfg) {
                setSelectLeadFormConfig(cfg);
                setIsSelectLeadFormModalOpen(true);
            }
        } finally {
            setSelectLeadFormAccountId(null);
        }
    };

    const handleTestConnection = async (accountId: number) => {
        try {
            setTestConnectionAccountId(accountId);
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
        } finally {
            setTestConnectionAccountId(null);
        }
    };

    const handleCheckMetaHealth = async (accountId: number, subscribe = false, pageId?: string) => {
        try {
            setMetaHealthAccountId(accountId);
            setMetaHealthLoading(true);
            const data = await getMetaHealthAPI(accountId, subscribe, pageId);
            setMetaHealthData(data);
            const defaultPageId =
                (pageId && data.pages.some((p) => p.id === pageId) ? pageId : '') ||
                (data.selection.selected_page_id && data.pages.some((p) => p.id === data.selection.selected_page_id)
                    ? data.selection.selected_page_id
                    : '') ||
                (data.pages[0]?.id || '');
            setMetaHealthSelectedPageId(defaultPageId);
            setMetaHealthModalOpen(true);
        } catch (error: any) {
            const msg = error?.message || error?.data?.error || t('metaHealthLoadFailed') || 'Failed to load Meta health.';
            setInfoAlert({ title: t('metaHealth') || 'Meta health', message: msg });
        } finally {
            setMetaHealthLoading(false);
        }
    };

    useEffect(() => {
        const next: Record<number, string> = {};
        for (const acc of accounts) {
            if (acc.platform === 'meta' && acc.metadata?.pixel_id != null) {
                next[acc.id] = String(acc.metadata.pixel_id);
            }
        }
        setMetaPixelDrafts((prev) => ({ ...prev, ...next }));
    }, [accounts]);

    const handleSaveMetaPixel = async (accountId: number) => {
        try {
            setMetaPixelSavingId(accountId);
            const pixel_id = (metaPixelDrafts[accountId] ?? '').trim();
            await updateConnectedAccountAPI(accountId, { pixel_id });
            await queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
            setMetaPixelSavedId(accountId);
            setTimeout(() => setMetaPixelSavedId((id) => (id === accountId ? null : id)), 2500);
        } catch (error: any) {
            const msg = error?.message || error?.data?.error || t('failedToSavePixelId');
            setInfoAlert({ title: t('metaPixelId'), message: msg });
        } finally {
            setMetaPixelSavingId(null);
        }
    };

    const handleDelete = (accountId: number) => {
        const account = accounts.find((acc: Account) => acc.id === accountId);
        if (account) {
            setConfirmDeleteConfig({
                title: t('disconnect') || 'Disconnect Account',
                message: t('confirmDisconnectAccount') || 'Are you sure you want to disconnect',
                itemName: account.name,
                onConfirm: async () => {
                    try {
                        await disconnectAccountMutation.mutateAsync(accountId);
                    } catch (error: any) {
                        console.error('Error disconnecting account:', error);
                        showAlert(error?.message || t('errorDeletingAccount') || 'Failed to disconnect account', 'error');
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const finalizeOAuthConnect = (accountId: number) => {
        queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
        if (platformParam === 'meta') {
            getConnectedAccountsAPI(platformParam).then((accounts: any) => {
                const list = Array.isArray(accounts) ? accounts : accounts?.results || [];
                const account = list.find((a: any) => a.id === accountId);
                const cfg = account ? buildMetaLeadFormModalConfig(account, accountId) : null;
                if (cfg) {
                    setSelectLeadFormConfig(cfg);
                    setIsSelectLeadFormModalOpen(true);
                }
            }).catch(console.error);
        }
    };

    const releaseConnectLock = (accountId: number) => {
        if (connectingAccountIdRef.current !== accountId) return;
        connectingAccountIdRef.current = null;
        setConnectingAccountId(null);
    };

    const openConnectPopup = async (accountId: number) => {
        if (connectingAccountIdRef.current != null) return;
        connectingAccountIdRef.current = accountId;
        setConnectingAccountId(accountId);
        let keepBlockedForPopup = false;
        try {
            const response = await connectIntegrationAccountAPI(accountId);

            if (response.embedded_signup?.enabled && response.embedded_signup.config_id) {
                const es = response.embedded_signup;
                const signup = await obtainWhatsAppEmbeddedSignupCode({
                    app_id: es.app_id,
                    config_id: es.config_id,
                    graph_api_version: es.graph_api_version,
                });
                if (!signup.code) {
                    showAlert(t('connectionCancelled'), 'info');
                    return;
                }
                await completeWhatsAppEmbeddedSignupAPI(accountId, signup.code, {
                    waba_id: signup.waba_id,
                    phone_number_id: signup.phone_number_id,
                    business_id: signup.business_id,
                    signup_event: signup.signup_event,
                });
                if (!signup.waba_id || !signup.phone_number_id) {
                    showAlert(
                        t('whatsappEmbeddedSignupMissingIds') ||
                            'Connected to Meta, but phone number IDs were not returned. Click "Refresh phone numbers" on the Accounts tab, or reconnect after fixing Login for Business permissions (whatsapp_business_messaging).',
                        'warning'
                    );
                }
                finalizeOAuthConnect(accountId);
                setSuccessMessage(t('connectionSuccessful') || 'Connected successfully.');
                setIsSuccessModalOpen(true);
                return;
            }

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
                showAlert(t('popupBlocked') || 'Please allow popups for this site and try again.', 'warning');
                return;
            }
            keepBlockedForPopup = true;
            const handleMessage = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                if (event.data?.type === 'oauth_connected' && event.data?.accountId != null) {
                    window.removeEventListener('message', handleMessage);
                    releaseConnectLock(accountId);
                    finalizeOAuthConnect(event.data.accountId);
                }
                if (event.data?.type === 'oauth_failed') {
                    window.removeEventListener('message', handleMessage);
                    releaseConnectLock(accountId);
                    queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
                }
            };
            window.addEventListener('message', handleMessage);
            const poll = setInterval(() => {
                if (popup.closed) {
                    clearInterval(poll);
                    window.removeEventListener('message', handleMessage);
                    releaseConnectLock(accountId);
                    queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
                }
            }, 500);
        } catch (error: any) {
            console.error('Error connecting account:', error);
            showAlert(error?.message || t('errorConnectingAccount') || 'Failed to connect account', 'error');
        } finally {
            if (!keepBlockedForPopup) {
                releaseConnectLock(accountId);
            }
        }
    };

    const handleConnect = (accountId: number) => {
        if (connectingAccountIdRef.current != null) return;
        openConnectPopup(accountId);
    };

    const handleSyncWhatsAppPhoneNumbers = async (accountId: number) => {
        setSyncingPhoneAccountId(accountId);
        try {
            const res = await syncWhatsAppPhoneNumbersAPI(accountId);
            queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
            const display = res.display_phone_number || res.phone_number_id || '';
            showAlert(
                display ? (
                    <>
                        {t('whatsappPhoneNumbersSynced') || 'Phone numbers synced.'}{' '}
                        <PhoneText>{display}</PhoneText>
                    </>
                ) : (
                    t('whatsappPhoneNumbersSynced') || 'Phone numbers synced.'
                ),
                'info'
            );
        } catch (error: any) {
            const key = error?.error_key || error?.code;
            const msg =
                (key && t(key)) ||
                error?.message ||
                t('whatsapp_phone_numbers_not_synced') ||
                'Could not sync phone numbers from Meta.';
            showAlert(msg, 'error');
        } finally {
            setSyncingPhoneAccountId(null);
        }
    };

    const handleEnableWhatsAppCalling = async (integrationAccountId: number) => {
        setEnablingCallingAccountId(integrationAccountId);
        try {
            const res = await enableWhatsAppCallingAPI();
            showAlert(
                res.calling_enabled
                    ? t('enableWhatsAppCallingSuccess')
                    : t('enableWhatsAppCallingHint'),
                'info'
            );
        } catch (error: any) {
            showAlert(resolveLocalizedApiError(error, t, t('whatsappCallFailed')), 'error');
        } finally {
            setEnablingCallingAccountId(null);
        }
    };

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

    const handleAddNew = async () => {
        if (accounts.length > 0) {
            showAlert(t('oneIntegrationAccountPerPlatformHint'), 'info');
            return;
        }
        if (connectingAccountIdRef.current != null || isStartingConnect) return;
        if (platformParam === 'meta' || platformParam === 'whatsapp') {
            setIsStartingConnect(true);
            try {
                const created = await createAccountMutation.mutateAsync({
                    platform: platformParam,
                    name: platformParam === 'meta' ? 'Meta' : 'WhatsApp',
                });
                if (created?.id) {
                    setPendingConnectAccountId(created.id);
                }
            } catch (error: any) {
                showAlert(error?.message || t('errorSavingAccount'), 'error');
            } finally {
                setIsStartingConnect(false);
            }
            return;
        }
        setEditingAccount(null);
        setIsManageIntegrationAccountModalOpen(true);
    };

    // WhatsApp settings or Messaging Center (Marketing) — Chats live in ChatsPage
    const isMessagingCenterPage = currentPage === 'Messaging Center';
    if (currentPage === 'WhatsApp' || isMessagingCenterPage) {
        const ensureManualConversationListed = (client: any) => {
            const phone = normalizeChatPhone(client);
            if (!phone || !isManualChatClient(client)) return;
            setExtraConversations((prev) => {
                if (prev.some((c) => normalizeChatPhone(c.client) === phone)) return prev;
                return [{ client }, ...prev];
            });
        };

        const addConversation = (client: any) => {
            const phone = normalizeChatPhone(client);
            ensureManualConversationListed(client);
            setSelectedChatClient(client);
            const history = phone && companyId ? loadManualMessages(companyId, phone) : [];
            setOptimisticMessages(history);
            if (phone) saveSelectedManualPhone(companyId, phone);
        };

        const selectChatClient = (client: any) => {
            setChatToast(null);
            setSelectedChatClient(client);
            const phone = normalizeChatPhone(client);
            if (isManualChatClient(client)) {
                setOptimisticMessages(phone && companyId ? loadManualMessages(companyId, phone) : []);
                saveSelectedManualPhone(companyId, phone || null);
            } else {
                setOptimisticMessages([]);
                saveSelectedManualPhone(companyId, null);
            }
        };

        const pushManualChatMessages = (client: any, updater: (prev: ManualChatMessage[]) => ManualChatMessage[]) => {
            ensureManualConversationListed(client);
            setOptimisticMessages((prev) => {
                const next = updater(prev);
                if (isManualChatClient(client)) {
                    const phone = normalizeChatPhone(client);
                    if (phone && companyId) saveManualMessages(companyId, phone, next);
                }
                return next;
            });
        };

        const patchChatMessageStatus = (client: any, msgId: string, status: ChatMessageStatus) => {
            pushManualChatMessages(client, (prev) => prev.map((m) => (m.id === msgId ? { ...m, status } : m)));
        };

        const removeChatMessage = (client: any, msgId: string) => {
            pushManualChatMessages(client, (prev) => prev.filter((m) => m.id !== msgId));
        };

        const inferTemplateIdForMessage = (msg: ManualChatMessage): number | undefined => {
            if (msg.templateId) return msg.templateId;
            const body = (msg.body || '').trim();
            if (!body) return undefined;
            for (const tpl of approvedWaTemplates) {
                let preview = selectedChatClient
                    ? replaceTemplatePlaceholders(tpl.content || '', selectedChatClient)
                    : (tpl.content || '');
                preview = preview.replace(/^\(Imported from Meta:[^)]+\)\s*/i, '').trim();
                if (preview && preview === body) return tpl.id;
            }
            return undefined;
        };

        const finalizeOutboundSuccess = async (client: any, msgId: string) => {
            const phone = getClientPhone(client);
            if (typeof client.id !== 'number' && phone) {
                try {
                    const contact = await getWhatsAppContactByPhoneAPI(phone);
                    if (contact?.id) {
                        setSelectedChatClient({
                            id: contact.id,
                            name: contact.name,
                            phone_number: contact.phone_number || phone,
                            lead_company_name: contact.lead_company_name || contact.company_name || '',
                        });
                        saveSelectedManualPhone(companyId, null);
                        await refetchLeadWhatsApp();
                        setOptimisticMessages((prev) => prev.filter((m) => m.id !== msgId));
                        refetchWaSession();
                        refetchConversations();
                        return;
                    }
                } catch {
                    /* keep optimistic sent state */
                }
            }
            if (typeof client.id === 'number') {
                await refetchLeadWhatsApp();
                setOptimisticMessages((prev) => prev.filter((m) => m.id !== msgId));
            } else {
                patchChatMessageStatus(client, msgId, 'sent');
            }
            refetchWaSession();
            refetchConversations();
        };

        const handleOutboundSendError = (client: any, msgId: string, e: unknown, restoreText?: string) => {
            patchChatMessageStatus(client, msgId, 'failed');
            if (restoreText !== undefined) setMessageInput(restoreText);
            setChatToast({
                message: resolveLocalizedApiError(e as { data?: unknown; message?: string }, t, t('chatMessageFailed')),
                variant: 'error',
            });
        };

        const sendOutboundMessage = async (
            client: any,
            msgId: string,
            payload: { kind: 'text'; body: string } | { kind: 'template'; templateId: number; previewBody: string }
        ) => {
            const to = getClientPhone(client);
            if (!to) {
                handleOutboundSendError(client, msgId, { message: t('sms_error_invalid_to_number') });
                return;
            }
            patchChatMessageStatus(client, msgId, 'sending');
            try {
                if (payload.kind === 'template') {
                    await sendWhatsAppTemplateAPI({
                        to,
                        template_id: payload.templateId,
                        ...(typeof client.id === 'number' ? { client_id: client.id } : {}),
                    });
                } else {
                    const req: { to: string; message: string; client_id?: number } = { to, message: payload.body };
                    if (typeof client.id === 'number') req.client_id = client.id;
                    await sendWhatsAppMessageAPI(req);
                }
                await finalizeOutboundSuccess(client, msgId);
            } catch (e: unknown) {
                handleOutboundSendError(client, msgId, e, payload.kind === 'text' ? payload.body : undefined);
            }
        };

        const handleDeleteChatMessage = (msg: ManualChatMessage) => {
            if (!selectedChatClient || !msg.id || msg.status === 'sending') return;
            const idStr = String(msg.id);
            setConfirmDeleteConfig({
                title: t('delete'),
                message: t('deleteChatMessageConfirm'),
                confirmButtonText: t('delete'),
                confirmButtonVariant: 'danger',
                onConfirm: async () => {
                    setDeletingMessageId(idStr);
                    try {
                        if (idStr.startsWith('api-')) {
                            const apiId = parseInt(idStr.slice(4), 10);
                            if (!Number.isNaN(apiId)) {
                                await deleteWhatsAppMessageAPI(apiId);
                                await refetchLeadWhatsApp();
                                refetchConversations();
                            }
                        } else {
                            removeChatMessage(selectedChatClient, idStr);
                        }
                    } catch (e: unknown) {
                        setChatToast({
                            message: resolveLocalizedApiError(e as { data?: unknown; message?: string }, t, t('error')),
                            variant: 'error',
                        });
                    } finally {
                        setDeletingMessageId(null);
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        };

        const handleDeleteConversation = (client: any) => {
            const phone = normalizeChatPhone(client);
            const clientId = typeof client.id === 'number' ? client.id : undefined;
            const label = getWhatsAppContactTitle(client) || String(phone || '');
            setConfirmDeleteConfig({
                title: t('delete'),
                message: t('deleteConversationConfirm'),
                itemName: label,
                confirmButtonText: t('delete'),
                confirmButtonVariant: 'danger',
                onConfirm: async () => {
                    try {
                        if (clientId || phone) {
                            await deleteWhatsAppConversationAPI({ clientId, phone: phone || undefined });
                        }
                        if (phone) {
                            removeManualConversationForPhone(companyId, phone);
                        }
                        setExtraConversations((prev) =>
                            prev.filter((e) => {
                                const ep = normalizeChatPhone(e.client);
                                return e.client.id !== client.id && (!phone || ep !== phone);
                            })
                        );
                        if (
                            selectedChatClient &&
                            (selectedChatClient.id === client.id ||
                                (phone && normalizeChatPhone(selectedChatClient) === phone))
                        ) {
                            setSelectedChatClient(null);
                            setOptimisticMessages([]);
                            saveSelectedManualPhone(companyId, null);
                        }
                        await refetchConversations();
                        await refetchLeadWhatsApp();
                    } catch (e: unknown) {
                        showAlert(
                            resolveLocalizedApiError(e as { data?: unknown; message?: string }, t, t('error')),
                            'error'
                        );
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        };

        const handleDeleteFailedMessage = (msgId: string) => {
            handleDeleteChatMessage({ id: msgId, body: '', direction: 'out', time: '' });
        };

        const handleResendFailedMessage = async (msg: ManualChatMessage) => {
            if (!selectedChatClient || !msg.id || resendingMessageId) return;
            setResendingMessageId(msg.id);
            try {
                const templateId = msg.sendKind === 'text' ? undefined : inferTemplateIdForMessage(msg);
                if (templateId) {
                    await sendOutboundMessage(selectedChatClient, msg.id, {
                        kind: 'template',
                        templateId,
                        previewBody: msg.body,
                    });
                } else if (msg.sendKind === 'template') {
                    setChatToast({ message: t('selectApprovedTemplate') || 'Select an approved template', variant: 'warning' });
                } else {
                    await sendOutboundMessage(selectedChatClient, msg.id, { kind: 'text', body: msg.body });
                }
            } finally {
                setResendingMessageId(null);
            }
        };

        const newChatMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const getClientPhone = (c: any) => normalizeChatPhone(c);

        const CHAT_AVATAR_CLASS =
            'w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center text-primary-800 dark:text-primary-50 font-bold text-sm shrink-0 ring-2 ring-primary-200/80 dark:ring-primary-600';

        const getChatAvatarLabel = (client: any): string => getWhatsAppContactAvatarLabel(client);

        const formatChatTime = () =>
            new Date().toLocaleTimeString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ hour: '2-digit', minute: '2-digit' }));

        /** Replace template placeholders (EN and AR) with actual lead/client values; if no value, leave placeholder as-is */
        const replaceTemplatePlaceholders = (text: string, client: any): string => {
            if (!client) return text;
            const customerName = (client.name || client.contact_name || (client.first_name && client.last_name ? `${client.first_name} ${client.last_name}`.trim() : '') || '').trim();
            const leadCompany = String(client.lead_company_name || '').trim();
            const tenantCompany = (currentUser?.company?.name || '').trim();
            const company = tenantCompany || leadCompany;
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

        const buildTemplatePreviewBody = (templateId: number): string => {
            const tpl = approvedWaTemplates.find((t) => t.id === templateId);
            if (!tpl) return 'Template';
            let body = selectedChatClient ? replaceTemplatePlaceholders(tpl.content || '', selectedChatClient) : (tpl.content || '');
            body = body.replace(/^\(Imported from Meta:[^)]+\)\s*/i, '').trim();
            return body || tpl.name || 'Template';
        };

        const blockFreeTextWhatsApp =
            typeof selectedChatClient?.id === 'number' &&
            waSession != null &&
            !waSession.in_session;

        const hasConnectedWhatsApp = accounts.some(
            (a: { status?: string; platform?: string; is_active?: boolean }) =>
                a.platform === 'whatsapp' && a.status === 'Connected' && a.is_active !== false
        );
        const whatsappSendBlocked = !hasConnectedWhatsApp;

        const handleSendMessage = async () => {
            if (!selectedChatClient || !messageInput.trim()) return;
            if (whatsappSendBlocked) {
                showAlert(t('whatsappReconnectRequired') || 'WhatsApp is disconnected. Reconnect an account to send messages.', 'warning');
                return;
            }
            const to = getClientPhone(selectedChatClient);
            if (!to) {
                showAlert(t('sms_error_invalid_to_number') || 'No phone number for this client', 'warning');
                return;
            }
            if (blockFreeTextWhatsApp) {
                showAlert(
                    t('whatsappOutsideSessionUseTemplate') ||
                        'This contact is outside the 24-hour messaging window. Send an approved WhatsApp template instead.',
                    'warning'
                );
                return;
            }
            const body = messageInput.trim();
            setMessageInput('');
            const msgId = newChatMessageId();
            pushManualChatMessages(selectedChatClient, (prev) => [
                ...prev,
                { id: msgId, body, direction: 'out' as const, time: formatChatTime(), status: 'sending', sendKind: 'text' },
            ]);
            await sendOutboundMessage(selectedChatClient, msgId, { kind: 'text', body });
        };

        const handleSendMetaTemplate = async () => {
            if (!selectedChatClient || chatTemplateSendId === '') {
                showAlert(t('selectApprovedTemplate') || 'Select an approved template', 'warning');
                return;
            }
            if (whatsappSendBlocked) {
                showAlert(t('whatsappReconnectRequired') || 'WhatsApp is disconnected. Reconnect an account to send messages.', 'warning');
                return;
            }
            const to = getClientPhone(selectedChatClient);
            if (!to) {
                showAlert(t('sms_error_invalid_to_number') || 'No phone number for this client', 'warning');
                return;
            }
            setChatTemplateSending(true);
            const templateId = chatTemplateSendId as number;
            const previewBody = buildTemplatePreviewBody(templateId);
            const msgId = newChatMessageId();
            pushManualChatMessages(selectedChatClient, (prev) => [
                ...prev,
                {
                    id: msgId,
                    body: previewBody,
                    direction: 'out' as const,
                    time: formatChatTime(),
                    status: 'sending',
                    sendKind: 'template',
                    templateId,
                },
            ]);
            try {
                await sendOutboundMessage(selectedChatClient, msgId, {
                    kind: 'template',
                    templateId,
                    previewBody,
                });
            } finally {
                setChatTemplateSending(false);
            }
        };

        const handleApplyQuickTemplate = (content: string) => {
            const resolved = selectedChatClient ? replaceTemplatePlaceholders(content, selectedChatClient) : content;
            setMessageInput((prev) => prev + (prev ? '\n' : '') + resolved);
        };

        const handleCopyTemplate = (content: string) => {
            navigator.clipboard.writeText(content);
            showAlert(t('copied'), 'info');
        };

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

        // Messaging Center (Marketing): Message Campaign + Template tabs
        if (isMessagingCenterPage) {
            return (
                <PageWrapper
                    title={
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/12 dark:bg-primary/25 ring-1 ring-primary/25 dark:ring-primary/40 flex items-center justify-center">
                                    <MegaphoneIcon className={`w-7 h-7 ${marketingAccentIconClass}`} />
                                </span>
                                <span>{t('messagingCenter')}</span>
                            </div>
                            <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">{t('messagingCenterDesc')}</p>
                        </div>
                    }
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
                            onClick={() => setMessagingCenterTabPersisted('logs')}
                            className={`px-4 py-2 rounded-t flex items-center gap-2 text-sm font-medium ${messagingCenterTab === 'logs' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        >
                            <ClockIcon className={`w-4 h-4 shrink-0 ${messagingCenterTab === 'logs' ? 'text-white' : marketingAccentIconClass}`} /> {t('messageLogs')}
                        </button>
                    </div>
                    {messagingCenterTab === 'template' ? (
                        <TemplateManagementSettings />
                    ) : messagingCenterTab === 'logs' ? (
                        <MessageLogsPanel />
                    ) : (
                    <div className="space-y-4">
                        <Card className="overflow-hidden">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
                                <CampaignLeadPicker
                                    enabled={messagingCenterTab === 'campaign'}
                                    selectedIds={campaignSelectedIds}
                                    onSelectedIdsChange={setCampaignSelectedIds}
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
                                    <textarea value={campaignMessage} onChange={(e) => setCampaignMessage(e.target.value)} rows={6} placeholder={t('messageContent')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm resize-y" />
                                    {campaignChannel === 'whatsapp' && whatsAppLimits?.messaging_limit_tier && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('whatsAppMessagingLimit')}: {whatsAppLimits.messaging_limit_tier === 'TIER_250' ? '250' : whatsAppLimits.messaging_limit_tier === 'TIER_1K' ? '1,000' : whatsAppLimits.messaging_limit_tier === 'TIER_10K' ? '10,000' : whatsAppLimits.messaging_limit_tier === 'TIER_100K' ? '100,000' : whatsAppLimits.messaging_limit_tier} {t('conversationsPerDay')}{whatsAppLimits.quality_rating && ` · ${t('quality')}: ${whatsAppLimits.quality_rating}`}</p>}
                                    {campaignProgress !== null && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('campaignSentCount').replace('{sent}', String(campaignProgress.sent)).replace('{failed}', String(campaignProgress.failed))}</p>}
                                    <Button className="mt-3" onClick={handleCampaignSend} disabled={campaignSending}>
                                        {campaignSending ? <><Loader variant="primary" className="w-4 h-4 me-2" /> {t('campaignSending')}</> : <>{t('sendToSelected')} ({campaignSelectedIds.size})</>}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                    )}
                    {smsCampaignPreviewModal}
                </PageWrapper>
            );
        }

        // Integrations → WhatsApp: account settings only (chats are on ChatsPage)
        return (
            <PageWrapper
                title={
                    <div>
                        <div className="flex items-center gap-2">
                            <IntegrationPlatformIcon platform="whatsapp" size="md" variant="inline" />
                            <span>{t('whatsApp')}</span>
                        </div>
                        <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">{t('whatsAppIntegrationDesc')}</p>
                    </div>
                }
                actions={
                    !isEmployee ? (
                        <Button onClick={handleAddNew} loading={isStartingConnect} disabled={isStartingConnect || connectingAccountId != null}>
                            <PlusIcon className="w-4 h-4 me-2" /> {t('addNewAccount')}
                        </Button>
                    ) : undefined
                }
            >
                {renderPolicyBanner()}

                <Card>
                        {accounts.length > 0 ? (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {accounts.map((account: Account) => {
                                    const isCoexistence =
                                        account.metadata?.coexistence === true ||
                                        account.metadata?.is_on_biz_app === true;
                                    return (
                                    <li key={account.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                        <div className="flex items-center gap-3 mb-2 sm:mb-0">
                                            <IntegrationPlatformIcon platform="whatsapp" size="md" />
                                            <div>
                                                {isPhoneLike(account.name) ? (
                                                    <PhoneText as="p" className="font-semibold text-gray-900 dark:text-white">{account.name}</PhoneText>
                                                ) : (
                                                    <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
                                                )}
                                                <span className={`flex items-center text-xs ${account.status === 'Connected' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    <span className={`h-2 w-2 me-1.5 rounded-full ${account.status === 'Connected' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                    {account.status === 'Connected' ? t('connected') : t('disconnected')}
                                                    {isCoexistence && account.status === 'Connected' ? (
                                                        <span
                                                            className="ms-2 text-amber-600 dark:text-amber-400"
                                                            title={t('enableWhatsAppCallingCoexistenceHint')}
                                                        >
                                                            · {t('whatsappCoexistenceBadge')}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {account.status === 'Connected' && (
                                                <>
                                                <Button
                                                    variant="ghost"
                                                    disabled={syncingPhoneAccountId === account.id}
                                                    onClick={() => handleSyncWhatsAppPhoneNumbers(account.id)}
                                                    className="rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    {syncingPhoneAccountId === account.id ? t('syncing') : t('refreshWhatsAppPhoneNumbers')}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    disabled={
                                                        isCoexistence ||
                                                        enablingCallingAccountId === account.id
                                                    }
                                                    onClick={() => {
                                                        if (isCoexistence) {
                                                            showAlert(
                                                                t('whatsapp_calling_coexistence_unsupported'),
                                                                'info'
                                                            );
                                                            return;
                                                        }
                                                        void handleEnableWhatsAppCalling(account.id);
                                                    }}
                                                    title={
                                                        isCoexistence
                                                            ? t('enableWhatsAppCallingCoexistenceHint')
                                                            : t('enableWhatsAppCallingHint')
                                                    }
                                                    className="rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                                                >
                                                    {enablingCallingAccountId === account.id
                                                        ? t('loading')
                                                        : t('enableWhatsAppCalling')}
                                                </Button>
                                                </>
                                            )}
                                            {account.status !== 'Connected' && (
                                                <Button
                                                    variant="primary"
                                                    onClick={() => handleConnect(account.id)}
                                                    loading={connectingAccountId === account.id}
                                                    disabled={connectingAccountId != null || isStartingConnect}
                                                >
                                                    {t('connect')}
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleEdit(account)}
                                                className="rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <SettingsIcon className="w-4 h-4" /> <span className="sm:inline">{t('edit')}</span>
                                            </Button>
                                            {account.status === 'Connected' && (
                                                <Button variant="danger" onClick={() => handleDelete(account.id)}><TrashIcon className="w-4 h-4 me-2" /> {t('disconnect')}</Button>
                                            )}
                                        </div>
                                    </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="text-center py-16">
                                <IntegrationPlatformIcon platform="whatsapp" size="xl" variant="muted" className="mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">{t('noAccountsConnected')}</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('connectAccountPrompt')}</p>
                            </div>
                        )}
                    </Card>
            </PageWrapper>
        );
    }

    if (loading) {
        return (
            <PageWrapper title={pageTitle}>
                <PageLoadingState label={t('loadingIntegrations')} />
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title={pageTitle}
            actions={
                <Button onClick={handleAddNew} loading={isStartingConnect} disabled={isStartingConnect || connectingAccountId != null}>
                    <PlusIcon className="w-4 h-4" /> {t('addNewAccount')}
                </Button>
            }
        >
            {renderPolicyBanner()}
            <Card className="overflow-hidden p-0">
                {accounts.length > 0 ? (
                    <ul className="divide-y divide-gray-200/80 dark:divide-gray-700/80">
                        {accounts.map((account: Account) => (
                            <li
                                key={account.id}
                                className="p-5 sm:p-6 flex flex-col gap-4 bg-white dark:bg-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                                <div className="flex items-center gap-4 min-w-0">
                                    {integrationPlatform && (
                                        <IntegrationPlatformIcon platform={integrationPlatform} size="md" />
                                    )}
                                    <div className="min-w-0">
                                        {isPhoneLike(account.name) ? (
                                            <PhoneText as="p" className="font-semibold text-gray-900 dark:text-white truncate">{account.name}</PhoneText>
                                        ) : (
                                            <p className="font-semibold text-gray-900 dark:text-white truncate">{account.name}</p>
                                        )}
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
                                        <Button
                                            variant="primary"
                                            onClick={() => handleConnect(account.id)}
                                            loading={connectingAccountId === account.id}
                                            disabled={connectingAccountId != null || isStartingConnect}
                                            className="rounded-lg shadow-sm"
                                        >
                                            {t('connect') || 'Connect'}
                                        </Button>
                                    )}
                                    {account.status === 'Connected' && account.platform === 'meta' && (
                                        <>
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleTestConnection(account.id)}
                                                loading={testConnectionMutation.isPending && testConnectionAccountId === account.id}
                                                className="rounded-lg text-sm"
                                            >
                                                {t('testConnection') || 'Test connection'}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleSelectLeadForm(account)}
                                                loading={selectLeadFormAccountId === account.id}
                                                className="rounded-lg text-sm"
                                            >
                                                {t('selectLeadForm') || 'Select Lead Form'}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleCheckMetaHealth(account.id)}
                                                loading={metaHealthLoading && metaHealthAccountId === account.id}
                                                className="rounded-lg text-sm"
                                            >
                                                {t('checkMetaHealth') || 'Check Meta Health'}
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleEdit(account)}
                                        className="rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <SettingsIcon className="w-4 h-4" /> <span className="sm:inline">{t('edit')}</span>
                                    </Button>
                                    {account.status === 'Connected' && (
                                        <Button
                                            variant="danger"
                                            onClick={() => handleDelete(account.id)}
                                            className="rounded-lg ml-auto sm:ml-0 border border-transparent hover:border-red-500/30"
                                        >
                                            <TrashIcon className="w-4 h-4" /> <span className="sm:inline">{t('disconnect')}</span>
                                        </Button>
                                    )}
                                </div>
                                </div>
                                {account.status === 'Connected' && account.platform === 'meta' && (
                                    <div className="w-full pt-3 border-t border-gray-200/80 dark:border-gray-700/80">
                                        <label className={`block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 ${language === 'ar' ? '' : 'uppercase tracking-wide'}`}>
                                            {t('metaPixelId')}
                                        </label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                            {t('metaPixelIdHint')}
                                        </p>
                                        <div className={`flex flex-col sm:flex-row gap-2 sm:items-center ${language === 'ar' ? 'sm:flex-row-reverse sm:justify-end' : ''}`}>
                                            <Input
                                                id={`meta-pixel-${account.id}`}
                                                value={metaPixelDrafts[account.id] ?? String(account.metadata?.pixel_id ?? '')}
                                                onChange={(e) => setMetaPixelDrafts((prev) => ({ ...prev, [account.id]: e.target.value }))}
                                                placeholder={t('metaPixelIdPlaceholder')}
                                                dir={language === 'ar' ? 'rtl' : 'ltr'}
                                                className="sm:max-w-md"
                                            />
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleSaveMetaPixel(account.id)}
                                                loading={metaPixelSavingId === account.id}
                                                className="rounded-lg text-sm shrink-0"
                                            >
                                                {t('savePixelId')}
                                            </Button>
                                            {metaPixelSavedId === account.id && (
                                                <span className="text-xs text-green-600 dark:text-green-400">
                                                    {t('metaPixelIdSaved')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-16 px-6">
                        {integrationPlatform && (
                            <IntegrationPlatformIcon platform={integrationPlatform} size="xl" variant="muted" className="mx-auto mb-5" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('noAccountsConnected')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">{t('connectAccountPrompt')}</p>
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
                    pages={selectLeadFormConfig.pages}
                    linkedPageId={selectLeadFormConfig.linkedPageId}
                    linkedFormId={selectLeadFormConfig.linkedFormId}
                    linkedCampaignId={selectLeadFormConfig.linkedCampaignId}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
                    }}
                />
            )}
            {metaHealthModalOpen && metaHealthData && (
                <Modal
                    isOpen={metaHealthModalOpen}
                    onClose={() => setMetaHealthModalOpen(false)}
                    title={t('metaHealth') || 'Meta Health'}
                >
                    <div className="space-y-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t('metaHealthHint') || 'Use this diagnostic to verify token, selected form/page, and per-page webhook subscription state.'}
                        </div>
                        <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
                            <div className="font-semibold text-sm mb-2">{t('tokenStatus') || 'Token status'}</div>
                            <div className="text-sm">
                                {metaHealthData.token.valid ? (
                                    <span className="text-green-600 dark:text-green-400">{t('connected') || 'Connected'}</span>
                                ) : (
                                    <span className="text-red-600 dark:text-red-400">{t('connectionInvalid') || 'Connection invalid'}</span>
                                )}
                            </div>
                            {!!metaHealthData.token.error && (
                                <div className="text-xs text-red-600 dark:text-red-400 mt-1">{metaHealthData.token.error}</div>
                            )}
                        </div>
                        <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
                            <div className="font-semibold text-sm mb-2">{t('metaHealthSelection')}</div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                <div>{t('selectedPage') || 'Selected page'}: {metaHealthData.selection.selected_page_id || '-'}</div>
                                <div>{t('leadForm') || 'Lead Form'}: {metaHealthData.selection.selected_form_id || '-'}</div>
                                <div>{t('pageInMetadata') || 'Page in metadata'}: {metaHealthData.selection.page_in_metadata ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                        {metaHealthData.conversion_leads && (
                            <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
                                <div className="font-semibold text-sm mb-2">{t('metaQualification')}</div>
                                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <div>{t('metaPixelId')}: {metaHealthData.conversion_leads.pixel_id || '-'}</div>
                                    <div>
                                        {t('metaPixelConfigured')}:{' '}
                                        {metaHealthData.conversion_leads.pixel_configured ? (
                                            <span className="text-green-600 dark:text-green-400">{t('yes')}</span>
                                        ) : (
                                            <span className="text-amber-600 dark:text-amber-400">{t('no')}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
                            <div className="font-semibold text-sm mb-2">{t('metaHealthPages')}</div>
                            <div className="mb-3">
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {t('selectFacebookPage') || 'Facebook Page'}
                                </label>
                                <select
                                    value={metaHealthSelectedPageId}
                                    onChange={(e) => setMetaHealthSelectedPageId(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    {metaHealthData.pages.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-auto custom-scrollbar">
                                {metaHealthData.pages.map((p) => (
                                    <div key={p.id} className="rounded border border-gray-100 dark:border-gray-700 p-2 text-sm">
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{p.id}</div>
                                        <div className="text-xs mt-1">
                                            <span className={p.app_installed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                {t('appInstalled') || 'App installed'}: {p.app_installed ? 'Yes' : 'No'}
                                            </span>
                                            {' · '}
                                            <span className={p.leadgen_subscribed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                {t('leadgenSubscribed') || 'Leadgen subscribed'}: {p.leadgen_subscribed ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        {!!p.error && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{p.error}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
                            <div className="font-semibold text-sm mb-2">{t('recentActivity') || 'Recent activity'}</div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                <div>{t('leadsLast7Days') || 'Leads last 7 days'}: {metaHealthData.recent_activity.leads_last_7d}</div>
                                <div>{t('errorsLast7Days') || 'Errors last 7 days'}: {metaHealthData.recent_activity.errors_last_7d}</div>
                                <div>{t('lastLeadReceivedAt') || 'Last lead received at'}: {metaHealthData.recent_activity.last_lead_received_at || '-'}</div>
                            </div>
                        </div>
                        <div className="rounded border border-amber-300/60 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-900/10 p-3">
                            <div className="font-semibold text-sm mb-2 text-amber-900 dark:text-amber-300">
                                {t('assignCrmGuideTitle') || 'Assign LOOP CRM in Meta Business Suite'}
                            </div>
                            <ol className="list-decimal list-inside text-sm text-amber-900/90 dark:text-amber-200 space-y-1">
                                <li>{t('assignCrmGuideStep1') || 'Open Meta Business Settings.'}</li>
                                <li>{t('assignCrmGuideStep2') || 'Go to Integrations -> Leads Access.'}</li>
                                <li>{t('assignCrmGuideStep3') || 'Select the Page used by your lead ads.'}</li>
                                <li>{t('assignCrmGuideStep4') || 'Open the CRMs tab on the right panel.'}</li>
                                <li>{t('assignCrmGuideStep5') || 'Click Assign CRM and choose LOOP CRM.'}</li>
                                <li>{t('assignCrmGuideStep6') || 'Confirm LOOP CRM appears under CRMs with leads access.'}</li>
                                <li>{t('assignCrmGuideStep7') || 'If needed, remove LOOP CRM then assign it again.'}</li>
                            </ol>
                        </div>
                        <div className="flex justify-between gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    if (metaHealthAccountId != null && metaHealthSelectedPageId) {
                                        handleCheckMetaHealth(metaHealthAccountId, true, metaHealthSelectedPageId);
                                    }
                                }}
                                disabled={metaHealthLoading || !metaHealthSelectedPageId}
                            >
                                {t('subscribeSelectedPage') || 'Subscribe selected page to leadgen'}
                            </Button>
                            <Button onClick={() => setMetaHealthModalOpen(false)}>
                                {t('close') || 'Close'}
                            </Button>
                        </div>
                    </div>
                </Modal>
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