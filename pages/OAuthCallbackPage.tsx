import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../components/index';
import { useAppContext } from '../context/AppContext';

/**
 * Shown inside the OAuth popup after redirect from provider (Meta, etc.).
 * Displays "Connection succeeded" or "Connection failed" and asks the user to close the window.
 * Notifies the opener via postMessage so the integrations page can refresh.
 */
export const OAuthCallbackPage = () => {
    const { t } = useAppContext();
    const [params] = useState(() => {
        if (typeof window === 'undefined') return { connected: null as string | null, accountId: null as string | null, error: null as string | null };
        const p = new URLSearchParams(window.location.search);
        return {
            connected: p.get('connected'),
            accountId: p.get('account_id'),
            error: p.get('error') || null,
        };
    });
    const sentRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.opener || sentRef.current) return;
        sentRef.current = true;
        const connected = params.connected === 'true';
        const accountId = params.accountId ? parseInt(params.accountId, 10) : undefined;
        const error = params.error || null;
        window.opener.postMessage(
            connected
                ? { type: 'oauth_connected', accountId }
                : { type: 'oauth_failed', error: error || 'Connection failed' },
            window.location.origin
        );
        window.history.replaceState({}, document.title, window.location.pathname);
    }, [params.connected, params.accountId, params.error]);

    const succeeded = params.connected === 'true';
    const failed = params.connected === 'false' || (!succeeded && params.connected !== null);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="text-center max-w-sm">
                {succeeded && (
                    <>
                        <p className="text-lg font-medium text-green-600 dark:text-green-400 mb-2">
                            {t('connectionSuccessful') || 'Connection succeeded'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {t('closePopupToSeeIntegrations') || 'You can close this window. The integrations page will update to show your connected account.'}
                        </p>
                    </>
                )}
                {(failed || (!succeeded && !failed && params.connected !== null)) && (
                    <>
                        <p className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
                            {t('connectionFailed') || 'Connection failed'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {params.error || (t('closePopupTryAgain') || 'Something went wrong. You can close this window and try again from the integrations page.')}
                        </p>
                    </>
                )}
                {params.connected === null && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        {t('noConnectionResult') || 'No connection result. You can close this window.'}
                    </p>
                )}
                <Button variant="primary" onClick={() => window.close()}>
                    {t('closeWindow') || 'Close this window'}
                </Button>
            </div>
        </div>
    );
};
