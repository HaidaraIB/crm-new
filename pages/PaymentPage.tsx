import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Loader, Card, PaymentGatewaySelector } from '../components/index';
import {
    createPaymentSessionAPI,
    checkPaymentStatusAPI,
    type CreatePaymentSessionResult,
    type CheckPaymentStatusResponse,
} from '../services/api';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../utils/dateUtils';
import { hydratePaymentAccessToken, paymentLoginUrl } from '../utils/paymentAuth';
import {
    getFibPaymentSession,
    resolveSubscriptionIdFromContext,
    setFibPaymentSession,
    setPendingSubscriptionId,
    paymentSuccessUrl,
    type FibPaymentSessionPayload,
} from '../utils/paymentSession';
import { setPaymentCheckoutContext } from '../utils/paymentFeedback';

type FibPaymentData = {
    payment_id: string;
    qr_code: string | null;
    readable_code: string | null;
    business_app_link: string | null;
    corporate_app_link: string | null;
    personal_app_link: string | null;
    valid_until: string | null;
};

function toFibPaymentData(parsed: FibPaymentSessionPayload): FibPaymentData {
    return {
        payment_id: String(parsed.payment_id),
        qr_code: (parsed.qr_code as string) || null,
        readable_code: (parsed.readable_code as string) || null,
        business_app_link: (parsed.business_app_link as string) || null,
        corporate_app_link: (parsed.corporate_app_link as string) || null,
        personal_app_link: (parsed.personal_app_link as string) || null,
        valid_until: (parsed.valid_until as string) || null,
    };
}

const FIB_INITIAL_STATUS_DELAY_MS = 15000;
const FIB_POLL_INTERVAL_MS = 5000;

export const PaymentPage = () => {
    const { t, language, theme } = useAppContext();
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    const [selectedGateway, setSelectedGateway] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showGatewaySelection, setShowGatewaySelection] = useState(true);
    const [fibPaymentData, setFibPaymentData] = useState<FibPaymentData | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        hydratePaymentAccessToken();

        const urlParams = new URLSearchParams(window.location.search);
        const subIdFromUrl = urlParams.get('subscription_id');
        const status = urlParams.get('status');
        const gatewayId = urlParams.get('gateway_id');
        const subId = resolveSubscriptionIdFromContext(subIdFromUrl);

        if (status && subId) {
            window.location.href = paymentSuccessUrl(subId, status);
            return;
        }

        if (!subId) {
            setError(t('paymentSubscriptionIdRequired') || 'Subscription ID is required');
            setShowGatewaySelection(false);
            return;
        }

        setPendingSubscriptionId(subId);
        if (!subIdFromUrl) {
            window.history.replaceState({}, '', `/payment?subscription_id=${subId}`);
        }

        setSubscriptionId(subId);

        const cachedFibData = getFibPaymentSession(subId);
        if (cachedFibData) {
            setFibPaymentData(toFibPaymentData(cachedFibData));
            setShowGatewaySelection(false);
        }

        if (gatewayId) {
            setSelectedGateway(parseInt(gatewayId, 10));
            setShowGatewaySelection(false);
        }
    }, [t]);

    // When we have subscriptionId + selectedGateway and came with gateway_id, auto-proceed to payment
    const hasAutoProceeded = useRef(false);
    useEffect(() => {
        if (!subscriptionId || !selectedGateway || showGatewaySelection || hasAutoProceeded.current) return;
        hasAutoProceeded.current = true;
        handleProceedToPayment();
    }, [subscriptionId, selectedGateway, showGatewaySelection]);

    // FIB best practice: wait ~15s for callback, then poll every 5s until paid or expired.
    useEffect(() => {
        if (!fibPaymentData || !subscriptionId) return;

        const validUntilMs = fibPaymentData.valid_until ? new Date(fibPaymentData.valid_until).getTime() : null;

        const check = async () => {
            try {
                if (validUntilMs && Date.now() > validUntilMs) {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                    if (pollStartTimeoutRef.current) clearTimeout(pollStartTimeoutRef.current);
                    pollStartTimeoutRef.current = null;
                    setFibPaymentData(null);
                    setError(t('paymentRequestExpired'));
                    return;
                }

                const data: CheckPaymentStatusResponse = await checkPaymentStatusAPI(parseInt(subscriptionId));
                if (data.subscription_active || data.payment_status === 'completed') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                    if (pollStartTimeoutRef.current) clearTimeout(pollStartTimeoutRef.current);
                    pollStartTimeoutRef.current = null;
                    window.location.href = paymentSuccessUrl(subscriptionId, 'success');
                } else if (data.gateway_status === 'declined' || data.payment_status === 'failed') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                    if (pollStartTimeoutRef.current) clearTimeout(pollStartTimeoutRef.current);
                    pollStartTimeoutRef.current = null;
                    setFibPaymentData(null);
                    setError(t('paymentDeclinedOrCancelled'));
                }
            } catch (_) {}
        };

        pollStartTimeoutRef.current = setTimeout(() => {
            check();
            pollIntervalRef.current = setInterval(check, FIB_POLL_INTERVAL_MS);
        }, FIB_INITIAL_STATUS_DELAY_MS);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (pollStartTimeoutRef.current) clearTimeout(pollStartTimeoutRef.current);
        };
    }, [fibPaymentData, subscriptionId, language]);

    const handleProceedToPayment = async () => {
        if (!selectedGateway || !subscriptionId) {
            setError(t('paymentGatewayRequired') || 'Please select a payment method');
            return;
        }

        try {
            setShowGatewaySelection(false);
            setIsLoading(true);
            setError(null);
            setFibPaymentData(null);
            if (!hydratePaymentAccessToken()) {
                setError(t('paymentAuthRequired'));
                setIsLoading(false);
                setShowGatewaySelection(true);
                return;
            }
            const result: CreatePaymentSessionResult = await createPaymentSessionAPI(parseInt(subscriptionId), selectedGateway);
            
            if (result.redirect_url) {
                setPaymentCheckoutContext({ returnTo: 'Login' });
                window.location.href = result.redirect_url;
            } else if (result.payment_id != null && (result.qr_code || result.readable_code || result.personal_app_link)) {
                setPaymentCheckoutContext({ returnTo: 'Login' });
                const fibPayload = {
                    payment_id: String(result.payment_id),
                    qr_code: result.qr_code || null,
                    readable_code: result.readable_code || null,
                    business_app_link: result.business_app_link || null,
                    corporate_app_link: result.corporate_app_link || null,
                    personal_app_link: result.personal_app_link || null,
                    valid_until: result.valid_until || null,
                };
                setFibPaymentSession(subscriptionId, fibPayload);
                setFibPaymentData(fibPayload);
                setIsLoading(false);
            } else {
                setError(t('paymentRedirectError') || 'Failed to get payment URL');
                setIsLoading(false);
                setShowGatewaySelection(true);
            }
        } catch (err: any) {
            // If error is about subscription already active, redirect to success
            if (err.message && err.message.includes('already active')) {
                window.location.href = paymentSuccessUrl(subscriptionId, 'success');
                return;
            }
            if (err.code === 'phone_verification_required') {
                setError(t('phoneVerificationRequiredPayment'));
                setIsLoading(false);
                setShowGatewaySelection(true);
                return;
            }
            if (
                err.status === 401 ||
                err.code === 'authentication_required' ||
                (typeof err.message === 'string' && /auth|unauthor/i.test(err.message))
            ) {
                setError(t('paymentAuthRequired'));
                setIsLoading(false);
                setShowGatewaySelection(true);
                window.setTimeout(() => {
                    window.location.href = paymentLoginUrl(subscriptionId);
                }, 2000);
                return;
            }

            setError(err.message || t('paymentInitError') || 'Failed to initialize payment');
            setIsLoading(false);
            setShowGatewaySelection(true);
        }
    };

    // FIB / in-progress payment UI must render above gateway selection; otherwise selection stays
    // mounted while fibPaymentData is set and status polling runs in the background.
    if (fibPaymentData && subscriptionId) {
        // High contrast on dark cards (primary purple was hard to read on dark gray)
        const linkClass =
            'block mt-2 text-sm font-medium text-teal-700 underline underline-offset-2 decoration-teal-600/70 hover:text-teal-900 hover:decoration-teal-800 dark:text-teal-300 dark:decoration-teal-400/80 dark:hover:text-teal-200 dark:hover:decoration-teal-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-sm';
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
                <Card className="max-w-lg w-full">
                    <div className="flex items-center gap-3 mb-2 border-b pb-2 dark:border-gray-700">
                        <img src="/fib_logo.png" alt="FIB" className="h-10 w-auto object-contain" />
                        <h2 className="text-xl font-semibold">
                            {t('fibPayTitle')}
                        </h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        {t('fibPayHint')}
                    </p>
                    {fibPaymentData.qr_code && (
                        <div className="flex justify-center mb-4">
                            <img src={fibPaymentData.qr_code} alt="FIB QR Code" className="w-48 h-48 object-contain border border-gray-200 dark:border-gray-600 rounded-lg" />
                        </div>
                    )}
                    {fibPaymentData.readable_code && (
                        <p className="text-center text-gray-700 dark:text-gray-300 font-mono mb-4">
                            {t('fibCodeLabel')} {fibPaymentData.readable_code}
                        </p>
                    )}
                    <div className="space-y-2 text-sm">
                        {fibPaymentData.personal_app_link && (
                            <a href={fibPaymentData.personal_app_link} target="_blank" rel="noopener noreferrer" className={linkClass}>
                                {t('fibOpenPersonalApp')}
                            </a>
                        )}
                        {fibPaymentData.business_app_link && (
                            <a href={fibPaymentData.business_app_link} target="_blank" rel="noopener noreferrer" className={linkClass}>
                                {t('fibOpenBusinessApp')}
                            </a>
                        )}
                        {fibPaymentData.corporate_app_link && (
                            <a href={fibPaymentData.corporate_app_link} target="_blank" rel="noopener noreferrer" className={linkClass}>
                                {t('fibOpenCorporateApp')}
                            </a>
                        )}
                    </div>
                    <p className="text-center text-gray-500 dark:text-gray-400 text-xs mt-4">
                        {t('fibWaitingCallback')}
                    </p>
                    {fibPaymentData.valid_until && (
                        <p className="text-center text-gray-500 dark:text-gray-400 text-xs mt-2">
                            {t('fibValidUntil')}{' '}
                            {new Date(fibPaymentData.valid_until).toLocaleString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' }))}
                        </p>
                    )}
                </Card>
            </div>
        );
    }

    if (showGatewaySelection && subscriptionId) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
                <Card className="max-w-2xl w-full">
                    <h2 className="text-2xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">
                        {t('selectPaymentMethod') || 'Select Payment Method'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {t('selectPaymentMethodDescription') || 'Choose your preferred payment method to complete your subscription'}
                    </p>
                    
                    {error && (
                        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <PaymentGatewaySelector
                            selectedGateway={selectedGateway}
                            onSelect={setSelectedGateway}
                        />
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            variant="secondary"
                            onClick={() => window.location.href = '/register'}
                        >
                            {t('cancel') || 'Cancel'}
                        </Button>
                        <Button
                            onClick={handleProceedToPayment}
                            loading={isLoading}
                            disabled={!selectedGateway || isLoading}
                        >
                            {t('proceedToPayment') || 'Proceed to Payment'}
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
                <div className="text-center">
                    <Loader />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                        {t('paymentRedirecting') || 'Redirecting to payment gateway...'}
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        const missingSubId = !subscriptionId;
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
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
                                    setError(null);
                                    setShowGatewaySelection(true);
                                    setFibPaymentData(null);
                                }}
                                className="w-full"
                            >
                                {t('tryAgain') || 'Try again'}
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            onClick={() => {
                                window.location.href = missingSubId
                                    ? '/login'
                                    : paymentLoginUrl(subscriptionId);
                            }}
                            className="w-full"
                        >
                            {t('goToLogin') || 'Go to Login'}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => (window.location.href = '/register')}
                            className="w-full"
                        >
                            {t('backToRegistration') || 'Back to Registration'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

