import React, { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { NumberInput } from '../../components/NumberInput';
import { Alert } from '../../components/Alert';
import {
  IntegrationPageLayout,
  SecretField,
  SettingsFormCard,
} from '../../components/integrations/kit';
import { useAppContext } from '../../context/AppContext';
import { useIntegrationPolicy } from '../../hooks/integrations/useIntegrationPolicy';
import {
  getOpenAISettingsAPI,
  resolveLocalizedApiError,
  runAIAnalysisAPI,
  testOpenAISettingsAPI,
  updateOpenAISettingsAPI,
} from '../../services/api';
import { clearFieldError } from '../../utils/formFieldErrors';
import { normalizeRole } from '../../utils/roles';
import { integrationByPage } from './registry';

const MODELS = [
  { value: 'gpt-4o-mini', labelKey: 'openaiModelGpt4oMini' },
  { value: 'gpt-4o', labelKey: 'openaiModelGpt4o' },
  { value: 'gpt-4.1-mini', labelKey: 'openaiModelGpt41Mini' },
  { value: 'gpt-4.1', labelKey: 'openaiModelGpt41' },
] as const;

export const AiIntegrationPage = () => {
  const entry = integrationByPage('AI')!;
  const { t, currentUser } = useAppContext();
  const policy = useIntegrationPolicy('openai');
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
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const canRun = normalizeRole(currentUser?.role) === 'Owner' || normalizeRole(currentUser?.role) === 'Supervisor';

  useEffect(() => {
    let cancelled = false;
    getOpenAISettingsAPI()
      .then((data) => {
        if (cancelled) return;
        setIsEnabled(!!data.is_enabled);
        setModel(data.model || 'gpt-4o-mini');
        setAutoAnalyze(data.auto_analyze_enabled !== false);
        setMaxLeads(data.max_leads_per_run ?? 20);
        setApiKeyMasked(data.api_key_masked ?? null);
        setLastError(data.last_error ?? null);
      })
      .catch(() => { if (!cancelled) setError(t('failedToLoadOpenAISettings')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [t]);

  const save = () => {
    if (!apiKey.trim() && !apiKeyMasked) {
      setFieldError(t('openaiApiKeyRequired'));
      return;
    }
    setError(null);
    setSuccess(null);
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
        setSuccess(t('saveSucceeded'));
        setDirty(false);
        setApiKey('');
        setApiKeyMasked(data.api_key_masked ?? null);
        setLastError(data.last_error ?? null);
      })
      .catch((e: unknown) => setError(resolveLocalizedApiError(e as { message?: string }, t, t('failedToSaveOpenAISettings'))))
      .finally(() => setSaving(false));
  };

  const test = () => {
    setTesting(true);
    setTestMessage(null);
    setSuccess(null);
    setError(null);
    const draft = apiKey.trim();
    testOpenAISettingsAPI(draft ? { api_key: draft, model } : undefined)
      .then(() => setTestMessage({ ok: true, text: t('openaiConnectionOk') }))
      .catch((e: { code?: string; message?: string }) => {
        const text = e?.code === 'openai_not_configured'
          ? t('openaiNotConfigured')
          : e?.code === 'openai_no_api_key'
            ? t('openaiNoApiKey')
            : e?.message || t('openaiConnectionFailed');
        setTestMessage({ ok: false, text });
      })
      .finally(() => setTesting(false));
  };

  const analyze = () => {
    setRunning(true);
    setError(null);
    setSuccess(null);
    runAIAnalysisAPI(false)
      .then(() => setSuccess(t('openaiAnalyzeSuccess')))
      .catch((e: unknown) => setError(resolveLocalizedApiError(e as { message?: string }, t, t('openaiConnectionFailed'))))
      .finally(() => setRunning(false));
  };

  return (
    <IntegrationPageLayout
      title={t('aiIntegration')}
      subtitle={t('aiIntegrationDescription')}
      platform="ai"
      helpVideoPageKey={entry.helpVideoPageKey}
      policy={policy.disabled ? { message: policy.entry?.message, scope: policy.entry?.scope } : null}
      policyDisabled={policy.disabled}
      loading={loading}
    >
      <SettingsFormCard
        title={t('aiIntegrationTitle')}
        description={<><p>{t('aiIntegrationDescription')}</p><p className="text-xs mt-2">{t('openaiDataPrivacyNote')}</p></>}
        enabled={isEnabled}
        onEnabledChange={(value) => { setIsEnabled(value); setDirty(true); }}
        enabledLabel={t('openaiEnableIntegration')}
        enableDisabled={policy.disabled}
        dirty={dirty}
        saving={saving}
        onSave={save}
        saveDisabled={policy.disabled}
        error={error}
        success={success}
        extraActions={
          <>
            <Button variant="secondary" onClick={test} disabled={policy.disabled} loading={testing}>{t('openaiTestConnection')}</Button>
            {canRun ? (
              <Button variant="secondary" onClick={analyze} disabled={running || policy.disabled || !isEnabled} loading={running}>
                {t('openaiAnalyzeNow')}
              </Button>
            ) : null}
          </>
        }
      >
        {lastError ? <Alert variant="warning">{lastError}</Alert> : null}
        {testMessage ? <Alert variant={testMessage.ok ? 'success' : 'error'}>{testMessage.text}</Alert> : null}
        {running ? <p className="text-sm text-gray-500">{t('aiAnalysisRunning')}</p> : null}
        <SecretField
          id="openai-api-key"
          label={t('openaiApiKey')}
          value={apiKey}
          masked={apiKeyMasked}
          onChange={(value) => { setApiKey(value); setDirty(true); setFieldError(null); clearFieldError(() => undefined, 'apiKey'); }}
          placeholder={t('openaiApiKeyPlaceholder')}
          error={fieldError || undefined}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('openaiModel')}</label>
          <select
            value={model}
            onChange={(e) => { setModel(e.target.value); setDirty(true); }}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            {MODELS.map((item) => <option key={item.value} value={item.value}>{t(item.labelKey)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('openaiMaxLeadsPerRun')}</label>
          <NumberInput
            min={1}
            max={100}
            value={maxLeads}
            disabled={policy.disabled}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              setMaxLeads(!Number.isNaN(value) && value >= 1 ? Math.min(100, value) : 1);
              setDirty(true);
            }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={autoAnalyze} onChange={(e) => { setAutoAnalyze(e.target.checked); setDirty(true); }} />
          {t('openaiAutoAnalyze')}
        </label>
      </SettingsFormCard>
    </IntegrationPageLayout>
  );
};
