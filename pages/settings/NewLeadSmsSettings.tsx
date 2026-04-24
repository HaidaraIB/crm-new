import React, { useEffect, useState } from 'react';
import { Card, Button } from '../../components/index';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { useAppContext } from '../../context/AppContext';
import { getTwilioSettingsAPI, updateTwilioSettingsAPI } from '../../services/api';
import { navigateToCompanyRoute } from '../../utils/routing';

const DEFAULT_TEMPLATE = "Hello [first_name], we'll contact you soon!";

export const NewLeadSmsSettings = () => {
    const { t, setCurrentPage, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    const [enabled, setEnabled] = useState(false);
    const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getTwilioSettingsAPI()
            .then((data) => {
                if (cancelled) return;
                setEnabled(!!data.lead_created_sms_enabled);
                const tpl = data.lead_created_sms_template;
                setTemplate(tpl != null && tpl !== '' ? tpl : DEFAULT_TEMPLATE);
            })
            .catch(() => {
                if (!cancelled) setError(t('failedToLoadTwilioSettings') || 'Failed to load settings');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [t]);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await updateTwilioSettingsAPI({
                lead_created_sms_enabled: enabled,
                lead_created_sms_template: template,
            });
            setSuccessMessage(t('settingsSaved') || 'Settings saved successfully!');
            setIsSuccessModalOpen(true);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg || t('failedToSaveTwilioSettings') || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const openTwilioIntegrations = () => {
        // Keep URL in sync with page state; App.tsx maps pathname → currentPage and would otherwise reset to Settings.
        navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Twilio');
        setCurrentPage('Twilio');
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
            <div className="max-w-2xl space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('newLeadSmsSettings')}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t('newLeadSmsIntegrationsNote')}
                    </p>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={openTwilioIntegrations}
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
                        onChange={(e) => setTemplate(e.target.value)}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-line">
                        {t('newLeadSmsPlaceholders')}
                    </p>
                </div>

                {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

                <Button type="button" onClick={handleSave} disabled={saving}>
                    {saving ? t('loading') || 'Saving…' : t('saveSettings')}
                </Button>
            </div>
        </Card>
    );
};
