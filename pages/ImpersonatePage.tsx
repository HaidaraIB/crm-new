import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getCompanyRoute } from '../utils/routing';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_KEY = import.meta.env.VITE_API_KEY || '';

const IMPERSONATE_DEBUG_KEY = 'impersonate_debug_log';
const MAX_LOG_CHARS = 30000;

/** Persist log to localStorage so it survives redirect to login; also log to console */
function persistLog(label: string, detail?: Record<string, unknown>) {
    const payload = detail ? { ...detail } : {};
    const line = `[${new Date().toISOString()}] [Impersonate] ${label} ${Object.keys(payload).length ? JSON.stringify(payload) : ''}\n`;
    console.log('[Impersonate]', label, Object.keys(payload).length ? payload : '');
    try {
        const prev = localStorage.getItem(IMPERSONATE_DEBUG_KEY) || '';
        const next = (prev + line).slice(-MAX_LOG_CHARS);
        localStorage.setItem(IMPERSONATE_DEBUG_KEY, next);
    } catch {
        // ignore quota or other errors
    }
}

const log = persistLog;

/** Build API root: ensure it ends with /api so path is correct on prod (e.g. VITE_API_URL might be domain only) */
const getApiRoot = () => {
    if (!BASE_URL) return '';
    return BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;
};

/**
 * Exchange one-time impersonation code for tokens and log in as that user.
 * Route: /impersonate?code=...
 */
const ImpersonatePage: React.FC = () => {
    const { setCurrentUser, setIsLoggedIn } = useAppContext();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState<string>('');

    useEffect(() => {
        const fullUrl = window.location.href;
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code')?.trim();

        // Start fresh log for this run (survives redirect so you can copy from login page)
        localStorage.setItem(IMPERSONATE_DEBUG_KEY, '');

        log('page_load', {
            fullUrl,
            hasCode: !!code,
            codeLength: code?.length ?? 0,
            origin: window.location.origin,
        });

        // Clear previous company session immediately so we never flash old content (e.g. company A when switching to B)
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        setCurrentUser(null);
        setIsLoggedIn(false);
        log('session_cleared');

        // 1) Tokens in hash (redirect flow from API – no CORS): decode and apply
        const hash = window.location.hash?.replace(/^#/, '') || '';
        const hashParams = new URLSearchParams(hash);
        const tokensB64 = hashParams.get('tokens');
        if (tokensB64) {
            try {
                const padded = tokensB64 + '=='.slice(0, (4 - (tokensB64.length % 4)) % 4);
                const jsonStr = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
                const data = JSON.parse(jsonStr) as { access?: string; refresh?: string; user?: Record<string, unknown> };
                const hasAccess = !!data.access;
                const hasRefresh = !!data.refresh;
                const hasUser = !!data.user;
                log('tokens_from_hash', { hasAccess, hasRefresh, hasUser });

                if (data.access) localStorage.setItem('accessToken', data.access);
                if (data.refresh) localStorage.setItem('refreshToken', data.refresh);
                const user = data.user;
                if (user) {
                    const u = user as { company?: number; company_name?: string };
                    const company = u.company != null
                        ? { id: u.company, name: u.company_name || '', domain: u.company_name || '' }
                        : null;
                    const userForState = { ...user, company };
                    setCurrentUser(userForState);
                    localStorage.setItem('currentUser', JSON.stringify(userForState));
                }
                localStorage.setItem('isLoggedIn', 'true');
                setIsLoggedIn(true);
                setStatus('success');
                const companyName = (user as { company_name?: string })?.company_name;
                const companyDomain = companyName;
                const dashboardPath = companyName
                    ? getCompanyRoute(companyName, companyDomain, 'Dashboard')
                    : '/dashboard';
                log('redirect', { dashboardPath, companyName });
                window.location.replace(dashboardPath);
            } catch (e) {
                log('error', { reason: 'tokens_decode_failed', message: String(e) });
                setStatus('error');
                setMessage('Invalid tokens in URL.');
            }
            return;
        }

        if (!code) {
            log('error', { reason: 'missing_code' });
            setStatus('error');
            setMessage('Missing code parameter.');
            return;
        }

        // 2) Code in query: use redirect flow (no fetch = no CORS). Send user to API with redirect_uri; API will 302 back with #tokens=...
        const apiRoot = getApiRoot();
        const redirectUri = `${window.location.origin}/impersonate`;
        const exchangeUrl = `${apiRoot}/auth/impersonate-exchange/?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        log('redirect_to_api', { exchangeUrl, redirectUri });
        window.location.replace(exchangeUrl);
    }, [setCurrentUser, setIsLoggedIn]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center max-w-sm px-4">
                    <div className="inline-block w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">جاري تغيير الحساب</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">جاري الدخول كمالك الشركة الجديدة...</p>
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
                        الذهاب لتسجيل الدخول
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <div className="inline-block w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-600 dark:text-gray-400">جاري التحويل إلى لوحة التحكم...</p>
            </div>
        </div>
    );
};

export default ImpersonatePage;
