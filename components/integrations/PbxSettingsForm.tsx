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
import { EyeIcon, EyeOffIcon, TrashIcon } from '../icons';
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
  const [addingExtension, setAddingExtension] = useState(false);
  const [extensionBusyId, setExtensionBusyId] = useState<number | null>(null);
  const [healthRefreshNotice, setHealthRefreshNotice] = useState<'success' | 'error' | null>(null);
  const queryClient = useQueryClient();

  const {
    data: health,
    refetch: refetchHealth,
    isFetching: healthFetching,
    dataUpdatedAt: healthUpdatedAt,
  } = useQuery({
    queryKey: ['pbxHealth'],
    queryFn: getPbxHealthAPI,
    refetchInterval: 15000,
    enabled: !pbxPolicyDisabled,
  });

  const { data: extensions, refetch: refetchExtensions, isFetching: extensionsFetching } = useQuery({
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
    setAddingExtension(true);
    setError(null);
    savePbxExtensionAPI({ user_id: parseInt(extUserId, 10), extension: extNumber.trim() })
      .then(() => {
        setExtUserId('');
        setExtNumber('');
        refetchExtensions();
        refetchHealth();
      })
      .catch((e: any) => setError(e?.message || t('failedToSavePbxExtension')))
      .finally(() => setAddingExtension(false));
  };

  const handleDeleteExtension = (id: number) => {
    setExtensionBusyId(id);
    setError(null);
    deletePbxExtensionAPI(id)
      .then(() => {
        refetchExtensions();
        refetchHealth();
      })
      .catch((e: any) => setError(e?.message || t('failedToSavePbxExtension')))
      .finally(() => setExtensionBusyId(null));
  };

  const handleRefreshHealth = async () => {
    setHealthRefreshNotice(null);
    setError(null);
    try {
      await Promise.all([
        refetchHealth(),
        getPbxSettingsAPI().then(setSettings),
        refetchExtensions(),
      ]);
      setHealthRefreshNotice('success');
      window.setTimeout(() => setHealthRefreshNotice(null), 3500);
    } catch {
      setHealthRefreshNotice('error');
      setError(t('failedToLoadPbxSettings'));
    }
  };

  const healthRefreshing = healthFetching;

  const handleDownloadConnector = () => {
    setDownloading(true);
    setError(null);
    downloadPbxConnectorPackageAPI()
      .catch((e: any) => setError(e?.message || t('failedToLoadPbxSettings')))
      .finally(() => setDownloading(false));
  };

  const healthChecks = health?.checks;
  const extensionList = Array.isArray(extensions) ? extensions : [];
  const mappedUserIds = new Set(extensionList.map((row: { user_id?: number }) => row.user_id).filter(Boolean));

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEnabled(!isEnabled)}
            disabled={pbxPolicyDisabled}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
          >
            {isEnabled && <span className="w-2 h-2 rounded-full bg-green-500" />}
            {t('enablePbxIntegration')}
          </button>
        </div>

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
            {healthUpdatedAt ? (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {t('pbxLastChecked')}: {formatDateTimeToLocal(new Date(healthUpdatedAt).toISOString())}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => void handleRefreshHealth()}
              loading={healthRefreshing}
              disabled={healthRefreshing}
            >
              {healthRefreshing ? t('pbxRefreshing') : t('refresh')}
            </Button>
            {healthRefreshNotice === 'success' ? (
              <span className="text-sm text-green-600 dark:text-green-400 animate-pulse">
                {t('pbxRefreshed')}
              </span>
            ) : null}
            {healthRefreshNotice === 'error' ? (
              <span className="text-sm text-red-600 dark:text-red-400">{t('failedToLoadPbxSettings')}</span>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('pbxUserExtensions')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('pbxUserExtensionsHint')}</p>
          </div>
          {extensionList.length > 0 ? (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
              {(t('extensionCount') as string).replace('{count}', String(extensionList.length))}
            </span>
          ) : null}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(7rem,9rem)_auto] gap-3 items-end">
            <div>
              <FieldLabel>{t('user')}</FieldLabel>
              <select
                value={extUserId}
                onChange={(e) => setExtUserId(e.target.value)}
                className={inputClass}
                disabled={addingExtension}
              >
                <option value="">{t('selectUser')}</option>
                {(Array.isArray(users) ? users : []).map((u: any) => (
                  <option key={u.id} value={u.id} disabled={mappedUserIds.has(u.id)}>
                    {u.username || u.email}
                    {mappedUserIds.has(u.id) ? ` (${t('extension')})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>{t('extension')}</FieldLabel>
              <Input
                value={extNumber}
                onChange={(e) => setExtNumber(e.target.value)}
                placeholder={t('extensionPlaceholder')}
                disabled={addingExtension}
              />
            </div>
            <Button
              onClick={handleAddExtension}
              disabled={!extUserId || !extNumber.trim() || addingExtension}
              loading={addingExtension}
              className="sm:mb-0 w-full sm:w-auto"
            >
              {addingExtension ? t('pbxAddingExtension') : t('add')}
            </Button>
          </div>
        </div>

        <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {extensionsFetching && !extensionList.length ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : extensionList.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('noExtensionsMapped')}
            </div>
          ) : (
            <>
              <div className="hidden sm:grid sm:grid-cols-3 sm:justify-items-center gap-4 px-4 py-2.5 bg-gray-100/90 dark:bg-gray-800/90 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 text-center">
                <span className="w-full">{t('user')}</span>
                <span className="w-full">{t('extension')}</span>
                <span className="w-full">{t('pbxExtensionActions')}</span>
              </div>
              <ul className={`divide-y divide-gray-200 dark:divide-gray-700 ${extensionsFetching ? 'opacity-60 pointer-events-none' : ''}`}>
                {extensionList.map((row: any) => (
                  <li
                    key={row.id}
                    className="grid grid-cols-1 sm:grid-cols-3 sm:justify-items-center gap-3 sm:gap-4 sm:items-center px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors text-center"
                  >
                    <div className="flex w-full flex-col items-center justify-center min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden mb-1">{t('user')}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-full">
                        {row.username || '—'}
                      </p>
                    </div>
                    <div className="flex w-full flex-col items-center justify-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden mb-1">{t('extension')}</p>
                      <span
                        className="inline-flex items-center justify-center font-mono text-sm font-semibold text-primary-700 dark:text-primary-300 bg-primary/10 dark:bg-primary/20 px-2.5 py-1 rounded-md"
                        dir="ltr"
                      >
                        {row.extension}
                      </span>
                    </div>
                    <div className="flex w-full flex-col items-center justify-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden mb-1">{t('pbxExtensionActions')}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-2 !py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        onClick={() => handleDeleteExtension(row.id)}
                        loading={extensionBusyId === row.id}
                        disabled={extensionBusyId !== null}
                        title={t('pbxRemoveExtension')}
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="sm:hidden ms-1">{t('delete')}</span>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {extensionsFetching && extensionList.length > 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/40">
              <Loader size="sm" />
            </div>
          ) : null}
        </div>
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
