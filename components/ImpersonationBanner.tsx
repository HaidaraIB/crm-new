import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { impersonateEndAPI } from '../services/api';
import {
  clearImpersonation,
  readImpersonation,
  type ImpersonationMeta,
} from '../utils/impersonation';

function displayName(actor?: ImpersonationMeta['targetUser'] | ImpersonationMeta['impersonatedBy']): string {
  if (!actor) return '';
  const full = `${actor.first_name || ''} ${actor.last_name || ''}`.trim();
  return full || actor.username || actor.email || `#${actor.id}`;
}

/**
 * Sticky amber bar shown while a super-admin support session is active.
 */
const ImpersonationBanner: React.FC = () => {
  const { t, language } = useAppContext();
  const [exiting, setExiting] = useState(false);
  const meta = useMemo(() => readImpersonation(), []);

  if (!meta?.active) return null;

  const ownerLabel = displayName(meta.targetUser);
  const companyLabel = meta.companyName || t('impersonationUnknownCompany');
  const adminLabel = meta.impersonatedBy?.email || displayName(meta.impersonatedBy);

  const handleExit = async () => {
    if (exiting) return;
    setExiting(true);
    try {
      await impersonateEndAPI();
    } catch {
      // Still clear local session even if audit/end call fails.
    }
    clearImpersonation();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isCompanySubscriptionInactive');

    // Prefer closing the tab (admin panel remains open). Fallback: ended page.
    window.close();
    setTimeout(() => {
      // If the browser blocked window.close (tab not script-opened), show a clear end state.
      document.body.innerHTML = '';
      const root = document.createElement('div');
      root.style.cssText =
        'min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:24px;text-align:center;background:#f9fafb;color:#111827;';
      root.innerHTML = `<div><h1 style="font-size:1.25rem;font-weight:600;margin-bottom:8px;">${t(
        'impersonationEndedTitle'
      )}</h1><p style="color:#6b7280;margin-bottom:16px;">${t(
        'impersonationEndedMessage'
      )}</p><a href="/login" style="color:#7c3aed;text-decoration:underline;">${t(
        'impersonationBackToLogin'
      )}</a></div>`;
      document.body.appendChild(root);
    }, 150);
  };

  return (
    <div
      className={`w-full bg-amber-500 text-amber-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm font-medium shadow-sm ${
        language === 'ar' ? 'flex-row-reverse' : ''
      }`}
      role="status"
      aria-live="polite"
    >
      <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600/30 text-amber-950 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
          </svg>
        </span>
        <span>
          {t('impersonationBannerPrefix')}{' '}
          <strong>{ownerLabel}</strong>
          {' · '}
          <strong>{companyLabel}</strong>
          {adminLabel ? (
            <>
              {' — '}
              {t('impersonationBannerBy')} {adminLabel}
            </>
          ) : null}
        </span>
      </div>
      <button
        type="button"
        onClick={handleExit}
        disabled={exiting}
        className="shrink-0 px-3 py-1.5 rounded-md bg-amber-950 text-amber-50 hover:bg-black disabled:opacity-60 transition-colors"
      >
        {exiting ? t('impersonationExiting') : t('impersonationExit')}
      </button>
    </div>
  );
};

export default ImpersonationBanner;
