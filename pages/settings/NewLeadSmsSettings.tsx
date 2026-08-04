import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button } from '../../components/index';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { useAppContext } from '../../context/AppContext';
import {
    getTwilioSettingsAPI,
    updateTwilioSettingsAPI,
    getMessageTemplatesAPI,
    type MessageTemplateType,
} from '../../services/api';
import { navigateToCompanyRoute } from '../../utils/routing';
import { scrollToFirstFieldError } from '../../utils/formFieldErrors';

const DEFAULT_TEMPLATE = "Hello [first_name], we'll contact you soon!";

function isApprovedWhatsAppTemplate(tpl: MessageTemplateType): boolean {
    const ch = (tpl.channel_type || '').toLowerCase();
    if (ch !== 'whatsapp' && ch !== 'whatsapp_api') return false;
    return (tpl.meta_status || '').toUpperCase() === 'APPROVED';
}

export const NewLeadSmsSettings = () => {
    const { t, setCurrentPage, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    const [enabled, setEnabled] = useState(false);
    const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
    const [waEnabled, setWaEnabled] = useState(false);
    const [waTemplateId, setWaTemplateId] = useState<number | null>(null);
    const [waTemplates, setWaTemplates] = useState<MessageTemplateType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([getTwilioSettingsAPI(), getMessageTemplatesAPI()])
            .then(([data, templates]) => {
                if (cancelled) return;
                setEnabled(!!data.lead_created_sms_enabled);
                const tpl = data.lead_created_sms_template;
                setTemplate(tpl != null && tpl !== '' ? tpl : DEFAULT_TEMPLATE);
                setWaEnabled(!!data.lead_created_whatsapp_enabled);
                const savedId = data.lead_created_whatsapp_template;
                setWaTemplateId(typeof savedId === 'number' ? savedId : savedId != null ? Number(savedId) : null);
                setWaTemplates(Array.isArray(templates) ? templates : []);
            })
            .catch(() => {
                if (!cancelled) setErrors({ general: t('failedToLoadTwilioSettings') || 'Failed to load settings' });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [t]);

    const approvedWaTemplates = useMemo(
        () => waTemplates.filter(isApprovedWhatsAppTemplate),
        [waTemplates]
    );

    const selectedWaTemplate = useMemo(
        () => approvedWaTemplates.find((tpl) => tpl.id === waTemplateId) || null,
        [approvedWaTemplates, waTemplateId]
    );

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (enabled && !template.trim()) {
            newErrors.template = t('newLeadSmsTemplateRequired') || 'Template is required when this is enabled';
        }
        if (waEnabled && !waTemplateId) {
            newErrors.waTemplate =
                t('newLeadWhatsAppTemplateRequired') ||
                'An approved WhatsApp template is required when WhatsApp welcome is enabled';
        }
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            requestAnimationFrame(() =>
                scrollToFirstFieldError(newErrors, {
                    template: 'lead-sms-template',
                    waTemplate: 'lead-wa-template',
                })
            );
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }
        setSaving(true);
        setErrors({});
        try {
            await updateTwilioSettingsAPI({
                lead_created_sms_enabled: enabled,
                lead_created_sms_template: template,
                lead_created_whatsapp_enabled: waEnabled,
                lead_created_whatsapp_template: waEnabled ? waTemplateId : null,
            });
            setSuccessMessage(t('settingsSaved') || 'Settings saved successfully!');
            setIsSuccessModalOpen(true);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setErrors({ general: msg || t('failedToSaveTwilioSettings') || 'Failed to save' });
        } finally {
            setSaving(false);
        }
    };

    const handleTemplateChange = (value: string) => {
        setTemplate(value);
        if (errors.template) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next.template;
                return next;
            });
        }
    };

    const handleWaTemplateChange = (value: string) => {
        const id = value ? Number(value) : null;
        setWaTemplateId(Number.isFinite(id) ? id : null);
        if (errors.waTemplate) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next.waTemplate;
                return next;
            });
        }
    };

    const openSmsIntegrations = () => {
        navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Twilio');
        setCurrentPage('Twilio');
    };

    const openWhatsAppIntegrations = () => {
        try {
            localStorage.setItem('whatsapp_messaging_tab', 'accounts');
        } catch {
            /* ignore */
        }
        navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Messaging Center');
        setCurrentPage('Messaging Center');
    };

    const openTemplateManagement = () => {
        try {
            localStorage.setItem('whatsapp_messaging_tab', 'templates');
        } catch {
            /* ignore */
        }
        navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Messaging Center');
        setCurrentPage('Messaging Center');
    };

    if (loading) {
        return (
            <Card>
                <p className="text-sm text-gray-600 dark:text-gray-400 py-6">{t('loading') || 'Loading…'}</p>
            </Card>
        );
    }

    return (
        <Card>
            <div className="max-w-2xl space-y-8">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('newLeadSmsSettings')}
                    </h2>
                </div>

                {/* SMS welcome */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            {t('newLeadSmsChannelTitle') || 'SMS'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {t('newLeadSmsIntegrationsNote')}
                        </p>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={openSmsIntegrations}
                            className="mt-3 w-full sm:w-auto"
                            title={t('newLeadSmsGoIntegrationsHint')}
                        >
                            {t('newLeadSmsGoIntegrations')}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {t('newLeadSmsEnable')}
                        </span>
                        <ToggleSwitch enabled={enabled} setEnabled={setEnabled} />
                    </div>

                    <div>
                        <label
                            htmlFor="lead-sms-template"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                            {t('newLeadSmsTemplate')}
                        </label>
                        <textarea
                            id="lead-sms-template"
                            rows={4}
                            value={template}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            className={`w-full rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm ${errors.template ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        />
                        {errors.template && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.template}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-line">
                            {t('newLeadSmsPlaceholders')}
                        </p>
                    </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* WhatsApp welcome */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            {t('newLeadWhatsAppChannelTitle') || 'WhatsApp'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {t('newLeadWhatsAppIntegrationsNote')}
                        </p>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={openWhatsAppIntegrations}
                            className="mt-3 w-full sm:w-auto"
                            title={t('newLeadWhatsAppGoIntegrationsHint')}
                        >
                            {t('newLeadWhatsAppGoIntegrations')}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {t('newLeadWhatsAppEnable')}
                        </span>
                        <ToggleSwitch enabled={waEnabled} setEnabled={setWaEnabled} />
                    </div>

                    <div>
                        <label
                            htmlFor="lead-wa-template"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                            {t('newLeadWhatsAppTemplate')}
                        </label>
                        {approvedWaTemplates.length === 0 ? (
                            <div className="space-y-2">
                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                    {t('newLeadWhatsAppNoApprovedTemplates')}
                                </p>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={openTemplateManagement}
                                    className="w-full sm:w-auto"
                                >
                                    {t('newLeadWhatsAppGoTemplates')}
                                </Button>
                            </div>
                        ) : (
                            <>
                                <select
                                    id="lead-wa-template"
                                    value={waTemplateId ?? ''}
                                    onChange={(e) => handleWaTemplateChange(e.target.value)}
                                    className={`w-full rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm ${errors.waTemplate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                >
                                    <option value="">
                                        {t('selectApprovedTemplate') || 'Select an approved template'}
                                    </option>
                                    {approvedWaTemplates.map((tpl) => (
                                        <option key={tpl.id} value={tpl.id}>
                                            {tpl.name}
                                            {tpl.language ? ` (${tpl.language})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.waTemplate && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.waTemplate}</p>
                                )}
                                {selectedWaTemplate?.content ? (
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
                                        {selectedWaTemplate.content}
                                    </p>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>

                {errors.general ? <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p> : null}

                <Button type="button" onClick={handleSave} disabled={saving}>
                    {saving ? t('loading') || 'Saving…' : t('saveSettings')}
                </Button>
            </div>
        </Card>
    );
};
