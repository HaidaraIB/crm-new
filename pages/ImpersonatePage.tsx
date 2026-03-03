import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getCompanyRoute } from '../utils/routing';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_KEY = import.meta.env.VITE_API_KEY || '';

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
    const exchangeStartedRef = useRef(false);
    const successHandledRef = useRef(false);

    useEffect(() => {
        if (exchangeStartedRef.current) return;
        exchangeStartedRef.current = true;

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code')?.trim();

        // Do NOT clear session here: clearing + setCurrentUser(null)/setIsLoggedIn(false) triggers
        // logout logic elsewhere (e.g. subscription check or !isLoggedIn redirect) and redirects to /login
        // before the exchange request completes. We clear and set new session only after we get the new tokens.

        if (!code) {
            setStatus('error');
            setMessage('Missing code parameter.');
            return;
        }

        const apiRoot = getApiRoot();
        const url = `${apiRoot}/auth/impersonate-exchange/?code=${encodeURIComponent(code)}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (API_KEY) headers['X-API-Key'] = API_KEY;

        fetch(url, { method: 'GET', headers })
            .then(async (res) => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    let msg = (err && typeof err.error === 'string' ? err.error : '') || 'Invalid or expired code.';
                    if (res.status === 404 && err?.hint) msg += ` (${err.hint})`;
                    else if (res.status === 404) msg = 'الرمز غير صالح أو منتهي. تأكد أن لوحة التحكم تستخدم نفس عنوان الـ API الذي تستخدمه لوحة الإدارة.';
                    throw new Error(msg.trim().replace(/^\.+/, ''));
                }
                return res.json();
            })
            .then((data) => {
                if (successHandledRef.current) return;
                successHandledRef.current = true;
                // Replace previous session only after we have the new tokens (avoids triggering logout redirect)
                if (data.access) localStorage.setItem('accessToken', data.access);
                if (data.refresh) localStorage.setItem('refreshToken', data.refresh);
                const user = data.user;
                if (user) {
                    const company = user.company != null
                        ? {
                            id: user.company,
                            name: user.company_name || '',
                            domain: user.company_name || '',
                        }
                        : null;
                    const userForState = { ...user, company };
                    setCurrentUser(userForState);
                    localStorage.setItem('currentUser', JSON.stringify(userForState));
                }
                localStorage.setItem('isLoggedIn', 'true');
                setIsLoggedIn(true);
                try { sessionStorage.setItem('impersonate_just_done', '1'); } catch { /* ignore */ }
                setStatus('success');
                const companyName = user?.company_name;
                const companyDomain = user?.company_name;
                const dashboardPath = companyName
                    ? getCompanyRoute(companyName, companyDomain, 'Dashboard')
                    : '/dashboard';
                // Brief delay so all localStorage writes are committed before full-page navigation
                requestAnimationFrame(() => {
                    window.location.replace(dashboardPath);
                });
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
