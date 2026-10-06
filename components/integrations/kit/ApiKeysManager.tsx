import React, { useState } from 'react';
import { Button } from '../../Button';
import { Input } from '../../Input';
import { Modal } from '../../Modal';
import { FileTextIcon, PlusIcon, TrashIcon } from '../../icons';
import { useAppContext } from '../../../context/AppContext';
import {
  LeadApiKeySummary,
  createLeadApiKeyAPI,
  resolveLocalizedApiError,
  revokeLeadApiKeyAPI,
  rotateLeadApiKeyAPI,
} from '../../../services/api';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../../utils/dateUtils';
import { CopyField } from './CopyField';

export const ApiKeysManager: React.FC<{
  keys: LeadApiKeySummary[];
  canManage: boolean;
  disabled?: boolean;
  onChanged: () => void;
}> = ({ keys, canManage, disabled, onChanged }) => {
  const {
    t,
    language,
    showToast,
    setConfirmDeleteConfig,
    setIsConfirmDeleteModalOpen,
  } = useAppContext();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  const reveal = (apiKey: string) => {
    setSecret(apiKey);
    onChanged();
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('leadApiKeyNameRequired'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const data = await createLeadApiKeyAPI(trimmed);
      setName('');
      reveal(data.api_key);
    } catch (e: unknown) {
      setError(resolveLocalizedApiError(e, t, t('leadApiKeyCreateFailed')));
    } finally {
      setBusy(false);
    }
  };

  const rotate = async (keyId: number) => {
    setBusy(true);
    try {
      const data = await rotateLeadApiKeyAPI(keyId);
      reveal(data.api_key);
    } catch (e: unknown) {
      showToast(resolveLocalizedApiError(e, t, t('leadApiKeyRotateFailed')), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const dateLocale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US';
  const dateOpts = withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' });
  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleString(dateLocale, dateOpts) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('leadApiKeys')}</h3>
        {keys.length > 0 ? (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary-800 dark:text-primary-200">
            {keys.length}
          </span>
        ) : null}
      </div>
      {!canManage ? <p className="text-xs text-amber-600 dark:text-amber-400">{t('leadApiAdminOnly')}</p> : null}
      {canManage ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/40 p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('leadApiKeyName')}</label>
              <Input
                value={name}
                disabled={disabled || busy}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder={t('leadApiKeyNamePlaceholder')}
                className={error ? 'border-red-500 dark:border-red-500' : ''}
              />
              {error ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            </div>
            <Button
              className="shrink-0 w-full sm:w-auto"
              disabled={disabled || busy}
              loading={busy}
              onClick={create}
            >
              <PlusIcon className="h-4 w-4" />
              {t('leadApiGenerateKey')}
            </Button>
          </div>
        </div>
      ) : null}
      {keys.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-8 text-center">
          <FileTextIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('leadApiNoKeys')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {keys.map((key) => (
            <li
              key={key.id}
              className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/60 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{key.name}</p>
                <bdi
                  dir="ltr"
                  className="mt-1 block max-w-full rounded-md bg-gray-100 dark:bg-gray-900/80 px-2 py-1 font-mono text-xs text-gray-600 dark:text-gray-300 [unicode-bidi:isolate]"
                >
                  <span className="text-gray-900 dark:text-gray-100">{key.key_prefix}</span>
                  <span className="text-gray-400 select-none tracking-wider">{'\u2022'.repeat(12)}</span>
                  {key.key_suffix ? <span className="text-gray-900 dark:text-gray-100">{key.key_suffix}</span> : null}
                </bdi>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('leadApiKeyCreated')}: {formatDate(key.created_at) || '\u2014'}
                  {' · '}
                  {t('leadApiKeyLastUsed')}: {formatDate(key.last_used_at) || t('leadApiKeyNeverUsed')}
                </p>
              </div>
              {canManage ? (
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" className="text-sm" disabled={disabled || busy} onClick={() => rotate(key.id)}>
                    {t('leadApiRotateKey')}
                  </Button>
                  <Button
                    variant="danger"
                    className="text-sm inline-flex items-center gap-1.5"
                    disabled={disabled || busy}
                    onClick={() => {
                      setConfirmDeleteConfig({
                        title: t('leadApiRevokeKey'),
                        message: t('leadApiConfirmRevokeMessage'),
                        itemName: key.name,
                        onConfirm: async () => {
                          setBusy(true);
                          try {
                            await revokeLeadApiKeyAPI(key.id);
                            onChanged();
                            showToast(t('leadApiRevokeKey'), { variant: 'success' });
                          } catch (e: unknown) {
                            showToast(resolveLocalizedApiError(e, t, t('leadApiKeyRevokeFailed')), { variant: 'error' });
                          } finally {
                            setBusy(false);
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
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Modal isOpen={!!secret} onClose={() => setSecret(null)} title={t('leadApiNewKeyTitle')}>
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">{t('leadApiNewKeyWarning')}</p>
        <CopyField label={t('leadApiKeys')} value={secret || ''} />
      </Modal>
    </div>
  );
};
