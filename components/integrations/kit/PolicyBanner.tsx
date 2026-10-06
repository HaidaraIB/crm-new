import React from 'react';
import { Alert } from '../../Alert';
import { useAppContext } from '../../../context/AppContext';
import { resolveIntegrationPolicyMessage } from '../../../utils/integrationPolicyMessage';

export type PolicyNotice = {
  message?: string | null;
  scope?: string | null;
  title?: string;
};

/** Amber banner shown when an integration (or one of its tabs) is turned off. */
export const PolicyBanner: React.FC<{ policy: PolicyNotice | null | undefined }> = ({ policy }) => {
  const { t } = useAppContext();
  if (!policy) return null;
  return (
    <Alert variant="warning" title={policy.title || t('integrationStatusDisabled')} className="mb-4">
      {resolveIntegrationPolicyMessage(policy.message, policy.scope, t)}
    </Alert>
  );
};

/** One banner per disabled SMS provider (Twilio and OTPIQ are independent). */
export const SmsProviderPolicyBanners: React.FC<{
  providers: Array<{ key: string; label: string; message?: string | null; scope?: string | null; enabled: boolean }>;
}> = ({ providers }) => {
  const { t } = useAppContext();
  const disabled = providers.filter((p) => !p.enabled);
  if (!disabled.length) return null;
  return (
    <>
      {disabled.map((provider) => (
        <Alert
          key={provider.key}
          variant="warning"
          className="mb-4"
          title={(t('smsProviderDisabledTitle') || '{provider}').replace('{provider}', provider.label)}
        >
          {resolveIntegrationPolicyMessage(provider.message, provider.scope, t)}
        </Alert>
      ))}
    </>
  );
};
