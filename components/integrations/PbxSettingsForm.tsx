import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPbxSettingsAPI,
  updatePbxSettingsAPI,
  rotatePbxConnectorKeyAPI,
  getPbxExtensionsAPI,
  savePbxExtensionAPI,
  deletePbxExtensionAPI,
  getUsersAPI,
  getPbxHealthAPI,
  downloadPbxConnectorPackageAPI,
  type PbxSettingsResponse,
} from '../../services/api';
import { Button, Card, Input, Loader, PageWrapper } from '../index';
import { EyeIcon, EyeOffIcon } from '../icons';
import { formatDateTimeToLocal } from '../../utils/dateUtils';

type IntegrationPolicyEntry = { enabled: boolean; message: string; scope: string };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {children}
    </label>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          ok
            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
        }`}
        aria-hidden
      >
        {ok ? '✓' : '○'}
      </span>
      <span className="text-gray-800 dark:text-gray-200">{label}</span>
    </li>
  );
}

export function PbxSettingsForm({
  t,
  integrationPolicyMap,
}: {
  t: (key: string) => string;
  integrationPolicyMap?: Record<string, IntegrationPolicyEntry>;
}) {
  const pbxPolicyDisabled = integrationPolicyMap?.pbx?.enabled === false;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<PbxSettingsResponse | null>(null);
  const [pbxHost, setPbxHost] = useState('');
  const [amiPort, setAmiPort] = useState('5038');
  const [amiUsername, setAmiUsername] = useState('');
  const [amiPassword, setAmiPassword] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoLog, setAutoLog] = useState(true);
  const [screenPop, setScreenPop] = useState(true);
  const [showAmiPassword, setShowAmiPassword] = useState(false);
  const [extUserId, setExtUserId] = useState('');
  const [extNumber, setExtNumber] = useState('');
  const [downloading, setDownloading] = useState(false);
  const queryClient = useQueryClient();

  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ['pbxHealth'],
    queryFn: getPbxHealthAPI,
    refetchInterval: 15000,
    enabled: !pbxPolicyDisabled,
  });

  const { data: extensions, refetch: refetchExtensions } = useQuery({
    queryKey: ['pbxExtensions'],
    queryFn: getPbxExtensionsAPI,
  });

  const { data: usersData } = useQuery({
    queryKey: ['usersForPbx'],
    queryFn: () => getUsersAPI(),
  });
  const users = usersData?.results ?? usersData ?? [];

  useEffect(() => {
    let cancelled = false;
    getPbxSettingsAPI()
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
        setPbxHost(data.pbx_host || '');
        setAmiPort(String(data.ami_port || 5038));
        setAmiUsername(data.ami_username || '');
        setIsEnabled(!!data.is_enabled);
        setAutoLog(data.auto_log_calls !== false);
        setScreenPop(data.screen_pop_enabled !== false);
      })
      .catch(() => { if (!cancelled) setError(t('failedToLoadPbxSettings')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [t]);

  const handleSave = () => {
    if (pbxPolicyDisabled) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    const payload: Parameters<typeof updatePbxSettingsAPI>[0] = {
      pbx_host: pbxHost,
      ami_port: parseInt(amiPort, 10) || 5038,
      ami_username: amiUsername,
      is_enabled: isEnabled,
      auto_log_calls: autoLog,
      screen_pop_enabled: screenPop,
    };
    if (amiPassword) payload.ami_password = amiPassword;
    updatePbxSettingsAPI(payload)
      .then((data) => {
        setSettings(data);
        setSuccess(true);
        setAmiPassword('');
        refetchHealth();
      })
      .catch((e: any) => setError(e?.message || t('failedToSavePbxSettings')))
      .finally(() => setSaving(false));
  };

  const handleRotateKey = () => {
    rotatePbxConnectorKeyAPI()
      .then(() => queryClient.invalidateQueries({ queryKey: ['pbxSettings'] }))
      .then(() => getPbxSettingsAPI())
      .then(setSettings)
      .catch((e: any) => setError(e?.message || t('failedToRotateConnectorKey')));
  };

  const handleAddExtension = () => {
    if (!extUserId || !extNumber) return;
    savePbxExtensionAPI({ user_id: parseInt(extUserId, 10), extension: extNumber })
      .then(() => {
        setExtUserId('');
        setExtNumber('');
        refetchExtensions();
        refetchHealth();
      })
      .catch((e: any) => setError(e?.message || t('failedToSavePbxExtension')));
  };

  const handleDownloadConnector = () => {
    setDownloading(true);
    setError(null);
    downloadPbxConnectorPackageAPI()
      .catch((e: any) => setError(e?.message || t('failedToLoadPbxSettings')))
      .finally(() => setDownloading(false));
  };

  const healthChecks = health?.checks;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader /></div>;
  }

  const inputClass =
    'w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm';

  return (
    <div className="space-y-6 max-w-3xl">
      {pbxPolicyDisabled ? (
        <div className="rounded-lg border px-4 py-3 text-sm bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
          {integrationPolicyMap?.pbx?.message || t('integrationDisabledDefaultMessage')}
        </div>
      ) : null}

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('pbxConnection')}</h3>
        <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            disabled={pbxPolicyDisabled}
          />
          <span>{t('enablePbxIntegration')}</span>
        </label>

        <div>
          <FieldLabel>{t('pbxHost')}</FieldLabel>
          <Input
            value={pbxHost}
            onChange={(e) => setPbxHost(e.target.value)}
            placeholder={t('pbxHostPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>{t('amiPort')}</FieldLabel>
            <Input value={amiPort} onChange={(e) => setAmiPort(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <FieldLabel>{t('amiUsername')}</FieldLabel>
            <Input value={amiUsername} onChange={(e) => setAmiUsername(e.target.value)} autoComplete="off" />
          </div>
        </div>

        <div>
          <FieldLabel>{t('amiPassword')}</FieldLabel>
          <div className="flex gap-2">
            <input
              type={showAmiPassword ? 'text' : 'password'}
              value={amiPassword}
              onChange={(e) => setAmiPassword(e.target.value)}
              placeholder={settings?.ami_password_masked ? '••••••••' : t('amiPasswordPlaceholder')}
              autoComplete="new-password"
              className={`flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={() => setShowAmiPassword((v) => !v)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title={showAmiPassword ? t('hide') : t('show')}
            >
              {showAmiPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input type="checkbox" checked={autoLog} onChange={(e) => setAutoLog(e.target.checked)} />
          <span>{t('pbxAutoLogCalls')}</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input type="checkbox" checked={screenPop} onChange={(e) => setScreenPop(e.target.checked)} />
          <span>{t('pbxScreenPop')}</span>
        </label>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-green-600 dark:text-green-400">{t('savedSuccessfully')}</p> : null}
        <Button onClick={handleSave} disabled={saving || pbxPolicyDisabled}>
          {saving ? t('saving') : t('save')}
        </Button>
      </Card>

      {settings ? (
        <Card className="p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('pbxConnector')}</h3>
            {(settings.connector_package_version || health?.connector_package_version) ? (
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300 px-2.5 py-0.5 text-xs font-semibold" dir="ltr">
                v{settings.connector_package_version || health?.connector_package_version}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('pbxConnectorHint')}</p>
          {(settings.connector_package_version || health?.connector_package_version) ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(t('pbxConnectorVersionHint') as string).replace(
                '{version}',
                settings.connector_package_version || health?.connector_package_version || ''
              )}
            </p>
          ) : null}
          <div>
            <FieldLabel>{t('webhookUrl')}</FieldLabel>
            <div className="flex gap-2 mt-1">
              <input readOnly value={settings.webhook_url || ''} className={`flex-1 font-mono text-xs ${inputClass}`} dir="ltr" />
              <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(settings.webhook_url || ''); }}>
                {t('copy')}
              </Button>
            </div>
          </div>
          <div>
            <FieldLabel>{t('connectorApiKey')}</FieldLabel>
            <div className="flex gap-2 mt-1">
              <input readOnly value={settings.connector_api_key || ''} className={`flex-1 font-mono text-xs ${inputClass}`} dir="ltr" />
              <Button variant="secondary" onClick={handleRotateKey}>{t('rotateKey')}</Button>
            </div>
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-200">
            {t('connectorStatus')}:{' '}
            <span className={settings.connector_online ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
              {settings.connector_online ? t('online') : t('offline')}
            </span>
          </p>
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('pbxDownloadConnector')}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('pbxDownloadConnectorHint')}</p>
            <Button variant="secondary" onClick={handleDownloadConnector} disabled={downloading || pbxPolicyDisabled}>
              {downloading ? t('saving') : t('pbxDownloadConnector')}
            </Button>
          </div>
        </Card>
      ) : null}

      {!pbxPolicyDisabled && healthChecks ? (
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('pbxSetupWizard')}</h3>
            {health?.connector_package_version ? (
              <span className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                {t('pbxConnectorVersion')}: v{health.connector_package_version}
              </span>
            ) : null}
          </div>
          <ul className="space-y-2">
            <CheckRow ok={healthChecks.integration_enabled} label={t('pbxCheckEnabled')} />
            <CheckRow ok={healthChecks.pbx_host_configured} label={t('pbxCheckHost')} />
            <CheckRow ok={healthChecks.ami_configured} label={t('pbxCheckAmi')} />
            <CheckRow ok={healthChecks.connector_online} label={t('pbxCheckConnector')} />
            <CheckRow ok={healthChecks.extensions_mapped} label={t('pbxCheckExtensions')} />
            <CheckRow ok={healthChecks.events_received} label={t('pbxCheckEvents')} />
          </ul>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>
              {t('pbxPushEventHint')}:{' '}
              <span className="font-mono text-gray-800 dark:text-gray-200" dir="ltr">
                {health?.push_event_url_hint || 'http://<connector-pc-ip>:8787'}
              </span>
            </p>
            <p>
              {t('pbxLastEvent')}:{' '}
              {health?.last_event_at
                ? formatDateTimeToLocal(health.last_event_at)
                : t('pbxNever')}
            </p>
          </div>
          <Button variant="secondary" onClick={() => refetchHealth()}>{t('refresh')}</Button>
        </Card>
      ) : null}

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('pbxUserExtensions')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('pbxUserExtensionsHint')}</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[180px]">
            <FieldLabel>{t('user')}</FieldLabel>
            <select
              value={extUserId}
              onChange={(e) => setExtUserId(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('selectUser')}</option>
              {(Array.isArray(users) ? users : []).map((u: any) => (
                <option key={u.id} value={u.id}>{u.username || u.email}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <FieldLabel>{t('extension')}</FieldLabel>
            <Input
              value={extNumber}
              onChange={(e) => setExtNumber(e.target.value)}
              placeholder={t('extensionPlaceholder')}
            />
          </div>
          <Button onClick={handleAddExtension}>{t('add')}</Button>
        </div>
        <ul className="divide-y dark:divide-gray-700">
          {(extensions || []).map((row: any) => (
            <li key={row.id} className="flex justify-between items-center py-2 text-sm">
              <span className="text-gray-800 dark:text-gray-200">
                {row.username} → {row.extension}
              </span>
              <button
                type="button"
                className="text-red-600 dark:text-red-400 hover:underline"
                onClick={() => deletePbxExtensionAPI(row.id).then(() => refetchExtensions())}
              >
                {t('delete')}
              </button>
            </li>
          ))}
          {!extensions?.length ? (
            <li className="py-4 text-sm text-center text-gray-500 dark:text-gray-400">{t('noExtensionsMapped')}</li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}

export function PbxSettingsPage({ t, integrationPolicyMap }: { t: (key: string) => string; integrationPolicyMap?: Record<string, IntegrationPolicyEntry> }) {
  return (
    <PageWrapper title={t('pbxIntegrationTitle')}>
      <PbxSettingsForm t={t} integrationPolicyMap={integrationPolicyMap} />
    </PageWrapper>
  );
}
