import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getCompanyRoute } from '../utils/routing';
import {
  BASE_URL,
  readJsonResponse,
  unwrapApiSuccess,
  getApiErrorMessage,
  getCurrentUserAPI,
} from '../services/api';
import {
  announceNewImpersonationSession,
  getOrStartExchange,
  getTabId,
  writeImpersonation,
  type ImpersonationMeta,
} from '../utils/impersonation';
import { normalizeUser } from '../utils/userUtils';
import { normalizeRole } from '../utils/roles';

const API_KEY = import.meta.env.VITE_API_KEY_WEB || import.meta.env.VITE_API_KEY || '';

type ExchangePayload = {
  access?: string;
  refresh?: string;
  user?: any;
  impersonated_by?: ImpersonationMeta['impersonatedBy'];
  impersonation?: Partial<ImpersonationMeta> & {
    company_name?: string;
    company_id?: number | null;
    target_user?: ImpersonationMeta['targetUser'];
    impersonated_by?: ImpersonationMeta['impersonatedBy'];
  };
};

/**
 * Exchange one-time impersonation code for tokens and log in as that user.
 * Route: /impersonate?code=...
 */
const ImpersonatePage: React.FC = () => {
  const { setCurrentUser, setIsLoggedIn } = useAppContext();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const successHandledRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code')?.trim();

    if (!code) {
      setStatus('error');
      setMessage('Missing code parameter.');
      return;
    }

    const runExchange = () =>
      getOrStartExchange(code, async () => {
        const url = `${BASE_URL}/auth/impersonate-exchange/?code=${encodeURIComponent(code)}`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (API_KEY) headers['X-API-Key'] = API_KEY;

        const res = await fetch(url, { method: 'GET', headers });
        const raw = await readJsonResponse(res);
        if (!res.ok) {
          let msg = getApiErrorMessage(raw, 'Invalid or expired code.');
          const err = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
          if (res.status === 404 && err?.hint) msg += ` (${err.hint})`;
          else if (res.status === 404) {
            msg =
              'Invalid or expired code. Ensure the admin panel and CRM app use the same API URL.';
          }
          throw new Error(msg.trim().replace(/^\.+/, ''));
        }
        return unwrapApiSuccess<ExchangePayload>(raw);
      });

    runExchange()
      .then(async (data) => {
        if (successHandledRef.current) return;
        successHandledRef.current = true;

        if (data.access) localStorage.setItem('accessToken', data.access);
        if (data.refresh) localStorage.setItem('refreshToken', data.refresh);

        const user = data.user;
        const companyName =
          data.impersonation?.company_name ||
          data.impersonation?.companyName ||
          user?.company_name ||
          '';
        const companyId =
          data.impersonation?.company_id ??
          data.impersonation?.companyId ??
          (typeof user?.company === 'number' ? user.company : user?.company?.id) ??
          null;

        const impersonationMeta: ImpersonationMeta = {
          active: true,
          sid: data.impersonation?.sid ?? '',
          companyId,
          companyName,
          ownerTabId: getTabId(),
          startedAt: Date.now(),
          targetUser:
            data.impersonation?.target_user ||
            data.impersonation?.targetUser || {
              id: user?.id,
              username: user?.username,
              email: user?.email,
              first_name: user?.first_name,
              last_name: user?.last_name,
            },
          impersonatedBy:
            data.impersonation?.impersonated_by ||
            data.impersonation?.impersonatedBy ||
            data.impersonated_by || {
              id: 0,
              email: '',
            },
        };
        writeImpersonation(impersonationMeta);
        announceNewImpersonationSession(impersonationMeta);

        if (user) {
          const company =
            user.company != null && typeof user.company === 'object'
              ? user.company
              : user.company != null
                ? {
                    id: user.company,
                    name: companyName || user.company_name || '',
                    domain: user.company_name || companyName || '',
                  }
                : null;
          const userForState = { ...user, company, role: normalizeRole(user.role) };
          setCurrentUser(userForState);
          localStorage.setItem('currentUser', JSON.stringify(userForState));
        }
        localStorage.setItem('isLoggedIn', 'true');
        setIsLoggedIn(true);

        // Hydrate full company/subscription shape without kicking inactive tenants out.
        try {
          const full = await getCurrentUserAPI();
          const frontendUser = normalizeUser(full);
          setCurrentUser(frontendUser);
          localStorage.setItem('currentUser', JSON.stringify(frontendUser));
        } catch {
          // Keep exchange payload user; API may still be warming up.
        }

        setStatus('success');
        const dashboardPath = companyName
          ? getCompanyRoute(companyName, companyName, 'Dashboard')
          : '/dashboard';
        window.location.replace(window.location.origin + dashboardPath);
      })
      .catch((err) => {
        if (successHandledRef.current) return;
        setStatus('error');
        const msg = err?.message || 'Invalid or expired code.';
        setMessage(msg.trim().replace(/^\.+/, ''));
      });
  }, [setCurrentUser, setIsLoggedIn]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-sm px-4">
          <div className="inline-block w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Switching account</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Signing in as the company owner…
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{message}</p>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Redirecting to dashboard…</p>
      </div>
    </div>
  );
};

export default ImpersonatePage;
