import React, { useEffect, useState } from 'react';
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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code')?.trim();
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
                    const msg = (err && typeof err.error === 'string' ? err.error : '') || (res.status === 404 ? 'الرابط غير موجود على السيرفر (404). تأكد من تحديث ونشر الـ API ثم إعادة تشغيل الخدمة.' : 'Invalid or expired code.');
                    throw new Error(msg.trim().replace(/^\.+/, ''));
                }
                return res.json();
            })
            .then((data) => {
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
                    // Persist to localStorage so after full-page redirect the app restores session (isLoggedIn + currentUser)
                    localStorage.setItem('currentUser', JSON.stringify(userForState));
                }
                localStorage.setItem('isLoggedIn', 'true');
                setIsLoggedIn(true);
                setStatus('success');
                const companyName = user?.company_name;
                const companyDomain = user?.company_name;
                const dashboardPath = companyName
                    ? getCompanyRoute(companyName, companyDomain, 'Dashboard')
                    : '/dashboard';
                window.location.replace(dashboardPath);
            })
            .catch((err) => {
                setStatus('error');
                const msg = err?.message || 'Invalid or expired code.';
                setMessage(msg.trim().replace(/^\.+/, ''));
            });
    }, [setCurrentUser, setIsLoggedIn]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="inline-block w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">جاري تسجيل الدخول...</p>
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
                <p className="text-gray-600 dark:text-gray-400">جاري التحويل...</p>
            </div>
        </div>
    );
};

export default ImpersonatePage;
