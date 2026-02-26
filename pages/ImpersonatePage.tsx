import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getCompanyRoute } from '../utils/routing';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

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

        const url = `${BASE_URL.replace(/\/$/, '')}/auth/impersonate-exchange/?code=${encodeURIComponent(code)}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (API_KEY) headers['X-API-Key'] = API_KEY;

        fetch(url, { method: 'GET', headers })
            .then(async (res) => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Invalid or expired code.');
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
                    setCurrentUser({
                        ...user,
                        company,
                    });
                }
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
                setMessage(err?.message || 'Invalid or expired code.');
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
