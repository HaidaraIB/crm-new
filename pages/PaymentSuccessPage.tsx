import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Loader } from '../components/index';
import { checkPaymentStatusAPI, zaincashReturnAPI } from '../services/api';

function clearClientSessionForLoginAfterPayment() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('pendingUserData');
    localStorage.removeItem('pendingSubscriptionId');
    sessionStorage.removeItem('2fa_username');
    sessionStorage.removeItem('2fa_password');
}

function redirectToLoginAfterPayment(t: (key: string) => string) {
    localStorage.setItem(
        'paymentSuccessMessage',
        JSON.stringify({
            message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active. Please sign in to continue.',
            timestamp: Date.now(),
        })
    );
    clearClientSessionForLoginAfterPayment();
    window.location.replace('/login?payment_success=true');
}

export const PaymentSuccessPage = () => {
    const { t, language } = useAppContext();
    const [error, setError] = useState<string | null>(null);
    const processingRef = useRef(false);

    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionIdParam = urlParams.get('subscription_id');
    const urlStatus = urlParams.get('status');
    const tranRef = urlParams.get('tranRef') || urlParams.get('tran_ref');
    const zaincashToken = urlParams.get('token');
    const subscriptionId = subscriptionIdParam ? parseInt(subscriptionIdParam, 10) : null;

    const checkPaymentCompleted = (statusResult: unknown): boolean => {
        if (!statusResult || typeof statusResult !== 'object') return false;
        const s = statusResult as Record<string, unknown>;

        const isActive =
            s.subscription_active === true ||
            s.subscription_active === 'true' ||
            s.subscription_active === 1 ||
            String(s.subscription_active).toLowerCase() === 'true';
        const isCompleted = s.payment_status === 'completed';
        const isApproved = s.paytabs_status === 'A' || s.paytabs_status === 'Approved';

        return isActive || isCompleted || isApproved;
    };

    useEffect(() => {
        if (processingRef.current) return;

        const handlePaymentSuccess = async () => {
            processingRef.current = true;
            try {
                if (urlStatus === 'failed') {
                    const message = urlParams.get('message');
                    setError(message || t('paymentFailed') || 'Payment failed. Please try again.');
                    processingRef.current = false;
                    return;
                }

                if (!subscriptionId) {
                    setError(t('paymentSubscriptionIdRequired') || 'Subscription ID is required');
                    processingRef.current = false;
                    return;
                }

                if (zaincashToken) {
                    try {
                        await zaincashReturnAPI(zaincashToken, subscriptionId);
                    } catch (err: unknown) {
                        console.error('Zain Cash payment verification failed:', err);
                        const msg = err instanceof Error ? err.message : String(err);
                        setError(msg || t('paymentVerificationFailed') || 'Payment verification failed. Please contact support.');
                        processingRef.current = false;
                        return;
                    }
                }

                let statusResult: unknown = null;
                let isPaymentCompleted = false;

                try {
                    statusResult = await checkPaymentStatusAPI(subscriptionId);
                    isPaymentCompleted = checkPaymentCompleted(statusResult);

                    if (isPaymentCompleted) {
                        redirectToLoginAfterPayment(t);
                        return;
                    }

                    const sr = statusResult as Record<string, unknown>;
                    if (
                        sr.payment_status === 'failed' ||
                        (sr.paytabs_status &&
                            sr.paytabs_status !== 'A' &&
                            sr.paytabs_status !== 'pending')
                    ) {
                        setError(t('paymentFailed') || 'Payment failed. Please try again.');
                        processingRef.current = false;
                        return;
                    }
                } catch (err: unknown) {
                    console.error('Error checking payment status:', err);
                    if (urlStatus === 'success' && tranRef) {
                        isPaymentCompleted = true;
                    } else {
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        if (
                            errorMessage.includes('404') ||
                            errorMessage.includes('Not Found') ||
                            errorMessage.includes('endpoint')
                        ) {
                            setError(
                                t('paymentStatusEndpointError') ||
                                    'Payment status endpoint not found. Please contact support.'
                            );
                        } else {
                            setError(
                                t('paymentStatusError') ||
                                    'Unable to check payment status. Please refresh the page or contact support.'
                            );
                        }
                        processingRef.current = false;
                        return;
                    }
                }

                if (urlStatus === 'success' && tranRef && !statusResult) {
                    isPaymentCompleted = true;
                }

                if (isPaymentCompleted) {
                    redirectToLoginAfterPayment(t);
                    return;
                }

                setError(t('paymentPending') || 'Payment is still being processed. Please wait and refresh.');
                processingRef.current = false;
            } catch (outerErr: unknown) {
                console.error('Error in payment success handler:', outerErr);
                const msg = outerErr instanceof Error ? outerErr.message : String(outerErr);
                setError(msg || t('paymentSuccessError') || 'Error processing payment success');
                processingRef.current = false;
            }
        };

        handlePaymentSuccess();
    }, [t, subscriptionId, urlStatus, tranRef, zaincashToken]);

    if (!error) {
        return (
            <div
                className={`min-h-screen flex items-center justify-center ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}
            >
                <div className="text-center">
                    <Loader />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                        {t('paymentProcessing') || 'Processing your payment...'}
                    </p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {t('redirectingToLoginAfterPayment') || 'Redirecting you to sign in...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`min-h-screen flex items-center justify-center ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}
        >
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <div className="text-red-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {t('paymentError') || 'Payment Error'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                <Button onClick={() => (window.location.href = '/login')} className="w-full">
                    {t('goToLogin') || 'Go to Login'}
                </Button>
            </div>
        </div>
    );
};
