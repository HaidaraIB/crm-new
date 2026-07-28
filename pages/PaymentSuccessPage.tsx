import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Loader } from '../components/index';
import { checkPaymentStatusAPI, zaincashReturnAPI } from '../services/api';
import { hydratePaymentAccessToken, paymentLoginUrl } from '../utils/paymentAuth';
import {
    consumePaymentCheckoutContext,
    hasLoggedInPaymentSession,
    pathForPaymentReturn,
    peekPaymentCheckoutContext,
    setPaymentFeedback,
    type PaymentReturnTo,
} from '../utils/paymentFeedback';
import { clearPaymentSessionHandoff, paymentPageUrl } from '../utils/paymentSession';

function clearClientSessionForLoginAfterPayment(subscriptionId?: number | null) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('pendingUserData');
    clearPaymentSessionHandoff(subscriptionId);
    sessionStorage.removeItem('2fa_username');
    sessionStorage.removeItem('2fa_password');
}

function isAuthError(err: unknown): boolean {
    const errObj = err as { status?: number; code?: string; message?: string };
    if (errObj.status === 401 || errObj.status === 403) return true;
    if (errObj.code === 'authentication_required' || errObj.code === 'not_authenticated') return true;
    const msg = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : '';
    return (
        msg.includes('authentication required') ||
        msg.includes('not authenticated') ||
        msg.includes('credentials were not provided') ||
        msg.includes('unauthorized')
    );
}

export const PaymentSuccessPage = () => {
    const { t, language } = useAppContext();
    const [error, setError] = useState<string | null>(null);
    const [redirectHint, setRedirectHint] = useState<'login' | 'app'>(() => {
        const ctx = peekPaymentCheckoutContext();
        return (ctx?.returnTo && ctx.returnTo !== 'Login') || hasLoggedInPaymentSession()
            ? 'app'
            : 'login';
    });
    const processingRef = useRef(false);

    const finishAfterSuccessfulPayment = (subscriptionIdValue: number | null) => {
        const ctx = consumePaymentCheckoutContext();
        const returnTo: PaymentReturnTo | undefined =
            ctx?.returnTo && ctx.returnTo !== 'Login'
                ? ctx.returnTo
                : hasLoggedInPaymentSession()
                  ? 'Billing'
                  : undefined;
        const stayInApp = !!returnTo && hasLoggedInPaymentSession();

        setPaymentFeedback({
            status: 'success',
            messageKey: ctx?.messageKey || 'paymentSuccessMessage',
            titleKey: ctx?.titleKey || 'paymentSuccess',
            subscriptionId: subscriptionIdValue,
        });

        if (stayInApp && returnTo) {
            clearPaymentSessionHandoff(subscriptionIdValue);
            setRedirectHint('app');
            window.location.replace(pathForPaymentReturn(returnTo));
            return;
        }

        clearClientSessionForLoginAfterPayment(subscriptionIdValue);
        window.location.replace('/login?payment_success=true');
    };

    const recordPaymentFailure = (message: string) => {
        const ctx = peekPaymentCheckoutContext();
        setPaymentFeedback({
            status: 'failed',
            messageKey: 'paymentFailed',
            titleKey: 'paymentError',
            message,
            subscriptionId,
        });
        setError(message);
        if ((ctx?.returnTo && ctx.returnTo !== 'Login') || hasLoggedInPaymentSession()) {
            setRedirectHint('app');
        }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionIdParam = urlParams.get('subscription_id');
    const urlStatus = urlParams.get('status');
    const tranRef = urlParams.get('tranRef') || urlParams.get('tran_ref');
    const sessionId = urlParams.get('session_id');
    const zaincashToken = urlParams.get('token');
    const subscriptionId = subscriptionIdParam ? parseInt(subscriptionIdParam, 10) : null;
    const gatewayMarkedSuccess =
        urlStatus === 'success' && !!(tranRef || sessionId || zaincashToken);

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
                    recordPaymentFailure(message || t('paymentFailed') || 'Payment failed. Please try again.');
                    processingRef.current = false;
                    return;
                }

                if (!subscriptionId) {
                    recordPaymentFailure(t('paymentSubscriptionIdRequired') || 'Subscription ID is required');
                    processingRef.current = false;
                    return;
                }

                hydratePaymentAccessToken();

                if (zaincashToken) {
                    try {
                        await zaincashReturnAPI(zaincashToken, subscriptionId);
                    } catch (err: unknown) {
                        console.error('Zain Cash payment verification failed:', err);
                        const msg = err instanceof Error ? err.message : String(err);
                        recordPaymentFailure(msg || t('paymentVerificationFailed'));
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
                        finishAfterSuccessfulPayment(subscriptionId);
                        return;
                    }

                    const sr = statusResult as Record<string, unknown>;
                    if (
                        sr.payment_status === 'failed' ||
                        (sr.paytabs_status &&
                            sr.paytabs_status !== 'A' &&
                            sr.paytabs_status !== 'pending')
                    ) {
                        recordPaymentFailure(t('paymentFailed') || 'Payment failed. Please try again.');
                        processingRef.current = false;
                        return;
                    }
                } catch (err: unknown) {
                    console.error('Error checking payment status:', err);
                    // Backend return URL already finalized PayTabs/Stripe — don't mark paid checkouts as auth failures
                    if (gatewayMarkedSuccess) {
                        isPaymentCompleted = true;
                    } else if (isAuthError(err)) {
                        if (hasLoggedInPaymentSession()) {
                            // Token/header glitch while already signed in: keep session, send to billing with pending note
                            setPaymentFeedback({
                                status: 'pending',
                                messageKey: 'paymentPending',
                                titleKey: 'paymentPending',
                                subscriptionId,
                            });
                            clearPaymentSessionHandoff(subscriptionId);
                            window.location.replace(pathForPaymentReturn('Billing'));
                            return;
                        }
                        setPaymentFeedback({
                            status: 'pending',
                            messageKey: 'paymentAuthRequired',
                            titleKey: 'paymentError',
                            subscriptionId,
                        });
                        setError(t('paymentAuthRequired'));
                        processingRef.current = false;
                        window.setTimeout(() => {
                            window.location.href = paymentLoginUrl(subscriptionId);
                        }, 2000);
                        return;
                    } else {
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        if (
                            errorMessage.includes('404') ||
                            errorMessage.includes('Not Found') ||
                            errorMessage.includes('endpoint')
                        ) {
                            recordPaymentFailure(
                                t('paymentStatusEndpointError') ||
                                    'Payment status endpoint not found. Please contact support.'
                            );
                        } else {
                            recordPaymentFailure(
                                t('paymentStatusError') ||
                                    'Unable to check payment status. Please refresh the page or contact support.'
                            );
                        }
                        processingRef.current = false;
                        return;
                    }
                }

                if (gatewayMarkedSuccess && !isPaymentCompleted) {
                    isPaymentCompleted = true;
                }

                if (isPaymentCompleted) {
                    finishAfterSuccessfulPayment(subscriptionId);
                    return;
                }

                setPaymentFeedback({
                    status: 'pending',
                    messageKey: 'paymentPending',
                    titleKey: 'paymentPending',
                    subscriptionId,
                });
                setError(t('paymentPending') || 'Payment is still being processed. Please wait and refresh.');
                processingRef.current = false;
            } catch (outerErr: unknown) {
                console.error('Error in payment success handler:', outerErr);
                const msg = outerErr instanceof Error ? outerErr.message : String(outerErr);
                recordPaymentFailure(msg || t('paymentSuccessError') || 'Error processing payment success');
                processingRef.current = false;
            }
        };

        handlePaymentSuccess();
    }, [t, subscriptionId, urlStatus, tranRef, zaincashToken, gatewayMarkedSuccess, sessionId]);

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
                        {redirectHint === 'app'
                            ? (t('redirectingAfterPayment') || 'Taking you back...')
                            : (t('redirectingToLoginAfterPayment') || 'Redirecting you to sign in...')}
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
                <div className="flex flex-col gap-3">
                    {subscriptionId && (
                        <Button
                            onClick={() => {
                                window.location.href = paymentPageUrl(subscriptionId);
                            }}
                            className="w-full"
                        >
                            {t('tryAgain') || 'Try again'}
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        onClick={() => {
                            const ctx = peekPaymentCheckoutContext();
                            const returnTo = ctx?.returnTo as PaymentReturnTo | undefined;
                            if (hasLoggedInPaymentSession()) {
                                window.location.href = pathForPaymentReturn(
                                    returnTo && returnTo !== 'Login' ? returnTo : 'Billing',
                                );
                                return;
                            }
                            window.location.href = subscriptionId
                                ? paymentLoginUrl(subscriptionId)
                                : '/login';
                        }}
                        className="w-full"
                    >
                        {redirectHint === 'app'
                            ? (t('backToBilling') || 'Back to billing')
                            : (t('goToLogin') || 'Go to Login')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
