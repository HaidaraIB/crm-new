import React, { useEffect, useState } from 'react';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { IntegrationPlatformIcon } from '../../components/integrations/IntegrationPlatformIcon';
import {
  IntegrationPageLayout,
  SecretField,
  SettingsFormCard,
  SmsProviderPolicyBanners,
} from '../../components/integrations/kit';
import { useAppContext } from '../../context/AppContext';
import { useQuery } from '@tanstack/react-query';
import { getIntegrationPolicyAPI, getTwilioSettingsAPI, resolveLocalizedApiError, updateTwilioSettingsAPI } from '../../services/api';
import { clearFieldError } from '../../utils/formFieldErrors';
import { navigateToCompanyRoute } from '../../utils/routing';
import { writePersistedTab } from '../../hooks/usePersistedTab';
import { integrationByPage } from './registry';

type Provider = 'twilio' | 'otpiq';

export const SmsIntegrationPage = () => {
  const entry = integrationByPage('Twilio')!;
  const { t, currentUser, setCurrentPage } = useAppContext();
  const policyQuery = useQuery({ queryKey: ['integrationPolicy'], queryFn: getIntegrationPolicyAPI });
  const map = policyQuery.data;
  const [provider, setProvider] = useState<Provider>('twilio');
  const [accountSid, setAccountSid] = useState('');
  const [twilioNumber, setTwilioNumber] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [otpiqApiKey, setOtpiqApiKey] = useState('');
  const [senderId, setSenderId] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [authTokenMasked, setAuthTokenMasked] = useState<string | null>(null);
  const [otpiqApiKeyMasked, setOtpiqApiKeyMasked] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTwilioSettingsAPI()
      .then((data) => {
        if (cancelled) return;
        setProvider(data.provider === 'otpiq' ? 'otpiq' : 'twilio');
        setAccountSid(data.account_sid || '');
        setTwilioNumber(data.twilio_number || '');
        setSenderId(data.sender_id || '');
        setIsEnabled(!!data.is_enabled);
        setAuthTokenMasked(data.auth_token_masked ?? null);
        setOtpiqApiKeyMasked(data.otpiq_api_key_masked ?? null);
      })
      .catch(() => { if (!cancelled) setErrors({ general: t('failedToLoadTwilioSettings') }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [t]);

  const twilioOff = map?.twilio?.enabled === false;
  const otpiqOff = map?.otpiq?.enabled === false;
  const selectedOff = (provider === 'twilio' && twilioOff) || (provider === 'otpiq' && otpiqOff);
  const touch = () => setDirty(true);

  const save = () => {
    const next: Record<string, string> = {};
    if (provider === 'twilio') {
      if (!accountSid.trim()) next.accountSid = t('accountSidRequired');
      if (!twilioNumber.trim()) next.twilioNumber = t('twilioNumberRequired');
      if (!authToken.trim() && !authTokenMasked) next.authToken = t('authTokenRequired');
    } else if (!otpiqApiKey.trim() && !otpiqApiKeyMasked) {
      next.otpiqApiKey = t('otpiqApiKeyRequired');
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    setSuccess(null);
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
    } else if (otpiqApiKey) {
      payload.otpiq_api_key = otpiqApiKey;
    }
    updateTwilioSettingsAPI(payload)
      .then((data) => {
        setSuccess(t('saveSucceeded'));
        setDirty(false);
        setAuthToken('');
        setOtpiqApiKey('');
        setAuthTokenMasked(data.auth_token_masked ?? authTokenMasked);
        setOtpiqApiKeyMasked(data.otpiq_api_key_masked ?? otpiqApiKeyMasked);
      })
      .catch((e: { fields?: Record<string, string | string[]>; message?: string }) => {
        const apiFields = e?.fields;
        const mapped: Record<string, string> = {};
        if (apiFields) {
          const pick = (key: string, stateKey: string) => {
            const raw = apiFields[key];
            if (raw == null) return;
            mapped[stateKey] = Array.isArray(raw) ? raw.join(' ') : String(raw);
          };
          pick('account_sid', 'accountSid');
          pick('twilio_number', 'twilioNumber');
          pick('auth_token', 'authToken');
          pick('otpiq_api_key', 'otpiqApiKey');
          pick('sender_id', 'senderId');
        }
        setErrors(Object.keys(mapped).length ? mapped : { general: resolveLocalizedApiError(e, t, t('failedToSaveTwilioSettings')) });
      })
      .finally(() => setSaving(false));
  };

  return (
    <IntegrationPageLayout
      title={t('twilioSmsIntegration')}
      platform="sms"
      helpVideoPageKey={entry.helpVideoPageKey}
      loading={loading}
    >
      <SmsProviderPolicyBanners
        providers={[
          { key: 'twilio', label: 'Twilio', enabled: map?.twilio?.enabled !== false, message: map?.twilio?.message, scope: map?.twilio?.scope },
          { key: 'otpiq', label: 'OTPIQ', enabled: map?.otpiq?.enabled !== false, message: map?.otpiq?.message, scope: map?.otpiq?.scope },
        ]}
      />
      <SettingsFormCard
        title={t('twilioSmsIntegration')}
        description={
          <>
            <p className="text-amber-600 dark:text-amber-400 font-medium">{t('smsProviderNote')}</p>
            <p className="mt-2">{t('twilioNewLeadSmsHint')}</p>
          </>
        }
        icon={<IntegrationPlatformIcon platform="sms" size="lg" />}
        enabled={isEnabled}
        onEnabledChange={(value) => { setIsEnabled(value); touch(); }}
        enabledLabel={t('twilioIntegrationEnabled')}
        enableDisabled={selectedOff}
        dirty={dirty}
        saving={saving}
        onSave={save}
        saveDisabled={selectedOff}
        error={errors.general}
        success={success}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('smsProvider')}</label>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as Provider);
              touch();
              setErrors({});
            }}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="twilio" disabled={twilioOff}>Twilio{twilioOff ? ` (${t('smsProviderUnavailable')})` : ''}</option>
            <option value="otpiq" disabled={otpiqOff}>OTPIQ{otpiqOff ? ` (${t('smsProviderUnavailable')})` : ''}</option>
          </select>
        </div>
        {provider === 'twilio' ? (
          <>
            <SecretField
              id="sms-account-sid"
              label={t('accountSid')}
              value={accountSid}
              onChange={(value) => { setAccountSid(value); touch(); clearFieldError(setErrors, 'accountSid'); }}
              placeholder={t('accountSidPlaceholder')}
              error={errors.accountSid}
              autoComplete="off"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('twilioNumber')}</label>
              <Input
                value={twilioNumber}
                onChange={(e) => { setTwilioNumber(e.target.value); touch(); clearFieldError(setErrors, 'twilioNumber'); }}
                placeholder={t('twilioNumberPlaceholder')}
                className={errors.twilioNumber ? 'border-red-500' : ''}
              />
              {errors.twilioNumber ? <p className="mt-1 text-sm text-red-600">{errors.twilioNumber}</p> : null}
            </div>
            <SecretField
              id="sms-auth-token"
              label={t('authToken')}
              value={authToken}
              masked={authTokenMasked}
              onChange={(value) => { setAuthToken(value); touch(); clearFieldError(setErrors, 'authToken'); }}
              placeholder={t('leaveBlankToKeepCurrent')}
              error={errors.authToken}
            />
          </>
        ) : (
          <SecretField
            id="sms-otpiq-key"
            label={t('otpiqApiKey')}
            value={otpiqApiKey}
            masked={otpiqApiKeyMasked}
            onChange={(value) => { setOtpiqApiKey(value); touch(); clearFieldError(setErrors, 'otpiqApiKey'); }}
            placeholder={t('leaveBlankToKeepCurrent')}
            error={errors.otpiqApiKey}
            hint={t('otpiqApiKeyHelp')}
          />
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('senderId')}</label>
          <Input value={senderId} onChange={(e) => { setSenderId(e.target.value); touch(); }} placeholder={t('senderIdPlaceholder')} />
          <p className="mt-1 text-xs text-gray-500">{provider === 'twilio' ? t('twilioSenderIdHelp') : t('otpiqSenderIdHelp')}</p>
          {provider === 'otpiq' ? <p className="text-xs text-amber-700 dark:text-amber-300">{t('otpiqSenderIdTestHint')}</p> : null}
        </div>
        <Button
          variant="secondary"
          type="button"
          onClick={() => {
            writePersistedTab('settings', 'NewLeadSms');
            navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Settings');
            setCurrentPage('Settings');
          }}
        >
          {t('twilioOpenNewLeadSmsSettings')}
        </Button>
      </SettingsFormCard>
    </IntegrationPageLayout>
  );
};
