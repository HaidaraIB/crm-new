import React, { useState } from 'react';
import { Button, Modal } from '../../components/index';
import { useAppContext } from '../../context/AppContext';
import { getMetaHealthAPI, MetaHealthResponse, resolveLocalizedApiError } from '../../services/api';
import { localizeMetaTokenError } from '../../utils/metaTokenErrorDisplay';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';
import { SetupSteps } from '../../components/integrations/kit';

export const MetaHealthModal: React.FC<{
  accountId: number;
  onClose: () => void;
  onReconnect: (accountId: number) => void;
  reconnecting: boolean;
}> = ({ accountId, onClose, onReconnect, reconnecting }) => {
  const { t, language, showToast } = useAppContext();
  const [data, setData] = useState<MetaHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageId, setPageId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async (subscribe = false, selected?: string) => {
    setLoading(true);
    setError(null);
    try {
      const next = await getMetaHealthAPI(accountId, subscribe, selected);
      setData(next);
      const preferred =
        (selected && next.pages.some((p) => p.id === selected) ? selected : '') ||
        (next.selection.selected_page_id && next.pages.some((p) => p.id === next.selection.selected_page_id)
          ? next.selection.selected_page_id
          : '') ||
        next.pages[0]?.id ||
        '';
      setPageId(preferred);
    } catch (err: unknown) {
      const message = resolveLocalizedApiError(err as { message?: string }, t, t('metaHealthLoadFailed'));
      setError(message);
      showToast(message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
    // Load once when the modal opens for this account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  return (
    <Modal isOpen onClose={onClose} title={t('metaHealth')}>
      {error ? <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p> : null}
      {loading && !data ? <p className="text-sm text-gray-500">{t('loading')}</p> : null}
      {data ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('metaHealthHint')}</p>
          <section className="rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="font-semibold text-sm mb-2">{t('tokenStatus')}</div>
            <div className="text-sm">
              {data.token.valid ? (
                <span className="text-green-600 dark:text-green-400">{t('connected')}</span>
              ) : (
                <span className="text-red-600 dark:text-red-400">{t('connectionInvalid')}</span>
              )}
            </div>
            {data.token.valid && data.token.expires_at != null && Number(data.token.expires_at) > 0 ? (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('metaTokenExpiresAt')}:{' '}
                {new Date(Number(data.token.expires_at) * 1000).toLocaleString(
                  language === 'ar' ? ARABIC_DATE_LOCALE : undefined,
                  withLatinDigits(),
                )}
              </div>
            ) : null}
            {!data.token.valid ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-red-600 dark:text-red-400" dir="auto">
                  {(() => {
                    const errKey = data.token.error_key;
                    if (errKey) {
                      const byKey = t(errKey as 'connected');
                      if (byKey && byKey !== errKey) return byKey;
                    }
                    return localizeMetaTokenError(data.token.error, t);
                  })()}
                </p>
                <Button
                  onClick={() => {
                    onClose();
                    onReconnect(accountId);
                  }}
                  loading={reconnecting}
                >
                  {t('reconnect')}
                </Button>
              </div>
            ) : null}
          </section>
          <section className="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="font-semibold mb-2">{t('metaHealthSelection')}</div>
            <div>{t('selectedPage')}: {data.selection.selected_page_id || '-'}</div>
            <div>{t('leadForm')}: {data.selection.selected_form_id || '-'}</div>
            <div>
              {t('pageInMetadata')}: {data.selection.page_in_metadata ? t('yes') : t('no')}
            </div>
          </section>
          {data.conversion_leads ? (
            <section className="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm">
              <div className="font-semibold mb-2">{t('metaQualification')}</div>
              <div>{t('metaPixelId')}: {data.conversion_leads.pixel_id || '-'}</div>
              <div>
                {t('metaPixelConfigured')}: {data.conversion_leads.pixel_configured ? t('yes') : t('no')}
              </div>
            </section>
          ) : null}
          <section className="rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="font-semibold text-sm mb-2">{t('metaHealthPages')}</div>
            <select
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              className="w-full mb-3 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
            >
              {data.pages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="space-y-2 max-h-64 overflow-auto">
              {data.pages.map((p) => (
                <div key={p.id} className="rounded border border-gray-100 dark:border-gray-700 p-2 text-sm">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('appInstalled')}: {p.app_installed ? t('yes') : t('no')}
                    {' · '}
                    {t('leadgenSubscribed')}: {p.leadgen_subscribed ? t('yes') : t('no')}
                  </div>
                  {p.error ? (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1" dir="auto">
                      {localizeMetaTokenError(p.error, t)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
          <section className="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm">
            <div className="font-semibold mb-2">{t('recentActivity')}</div>
            <div>{t('leadsLast7Days')}: {data.recent_activity.leads_last_7d}</div>
            <div>{t('errorsLast7Days')}: {data.recent_activity.errors_last_7d}</div>
            <div>{t('lastLeadReceivedAt')}: {data.recent_activity.last_lead_received_at || '-'}</div>
          </section>
          <SetupSteps
            title={t('assignCrmGuideTitle')}
            steps={[1, 2, 3, 4, 5, 6, 7].map((n) => t(`assignCrmGuideStep${n}` as 'assignCrmGuideStep1'))}
          />
          <div className="flex justify-between gap-2">
            <Button
              variant="secondary"
              disabled={loading || !pageId}
              onClick={() => void load(true, pageId)}
            >
              {t('subscribeSelectedPage')}
            </Button>
            <Button onClick={onClose}>{t('close')}</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
