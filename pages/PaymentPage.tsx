import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Loader, Card, PaymentGatewaySelector } from '../components/index';
import { createPaymentSessionAPI, checkPaymentStatusAPI } from '../services/api';

type FibPaymentData = {
    payment_id: string;
    qr_code: string | null;
    readable_code: string | null;
    business_app_link: string | null;
    corporate_app_link: string | null;
    personal_app_link: string | null;
    valid_until: string | null;
};

export const PaymentPage = () => {
    const { t, language, theme } = useAppContext();
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    const [selectedGateway, setSelectedGateway] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showGatewaySelection, setShowGatewaySelection] = useState(true);
    const [fibPaymentData, setFibPaymentData] = useState<FibPaymentData | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Get subscription_id from URL
        const urlParams = new URLSearchParams(window.location.search);
        const subId = urlParams.get('subscription_id');
        const status = urlParams.get('status');
        const gatewayId = urlParams.get('gateway_id');
        
        // If we have status parameter, we're coming back from payment gateway - redirect to success
        if (status && subId) {
            window.location.href = `/payment/success?subscription_id=${subId}&status=${status}`;
            return;
        }
        
        // If no subscription_id, show error and redirect to login
        if (!subId) {
            console.error('No subscription_id found in payment page');
            setError(t('paymentSubscriptionIdRequired') || 'Subscription ID is required');
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
            return;
        }
        
        setSubscriptionId(subId);
        
        // If gateway_id is provided in URL, use it and proceed
        if (gatewayId) {
            setSelectedGateway(parseInt(gatewayId));
            setShowGatewaySelection(false);
        }
    }, [t]);

    // Poll payment status when FIB payment is showing
    useEffect(() => {
        if (!fibPaymentData || !subscriptionId) return;
        const check = async () => {
            try {
                const data = await checkPaymentStatusAPI(parseInt(subscriptionId));
                if (data.subscription_active || data.payment_status === 'completed') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                    window.location.href = `/payment/success?subscription_id=${subscriptionId}&status=success`;
                }
            } catch (_) {}
        };
        pollIntervalRef.current = setInterval(check, 4000);
        check();
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [fibPaymentData, subscriptionId]);

    const handleProceedToPayment = async () => {
        if (!selectedGateway || !subscriptionId) {
            setError(t('paymentGatewayRequired') || 'Please select a payment method');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            setFibPaymentData(null);
            const result = await createPaymentSessionAPI(parseInt(subscriptionId), selectedGateway);
            
            if (result.redirect_url) {
                window.location.href = result.redirect_url;
            } else if (result.payment_id && (result.qr_code || result.readable_code || result.personal_app_link)) {
                // FIB: show QR and app links, poll for completion
                setFibPaymentData({
                    payment_id: result.payment_id,
                    qr_code: result.qr_code || null,
                    readable_code: result.readable_code || null,
                    business_app_link: result.business_app_link || null,
                    corporate_app_link: result.corporate_app_link || null,
                    personal_app_link: result.personal_app_link || null,
                    valid_until: result.valid_until || null,
                });
                setIsLoading(false);
            } else {
                setError(t('paymentRedirectError') || 'Failed to get payment URL');
                setIsLoading(false);
            }
        } catch (err: any) {
            // If error is about subscription already active, redirect to success
            if (err.message && err.message.includes('already active')) {
                window.location.href = `/payment/success?subscription_id=${subscriptionId}&status=success`;
                return;
            }
            
            setError(err.message || t('paymentInitError') || 'Failed to initialize payment');
            setIsLoading(false);
        }
    };

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
                            variant="outline"
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

    if (fibPaymentData && subscriptionId) {
        const linkClass = 'text-primary hover:underline block mt-2';
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
                <Card className="max-w-lg w-full">
                    <h2 className="text-xl font-semibold mb-2 border-b pb-2 dark:border-gray-700">
                        {language === 'ar' ? 'الدفع عبر FIB (البنك العراقي الأول)' : 'Pay with FIB (First Iraqi Bank)'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        {language === 'ar' ? 'امسح رمز QR بتطبيق FIB أو استخدم الرابط أدناه للدفع.' : 'Scan the QR code with the FIB app or use the link below to pay.'}
                    </p>
                    {fibPaymentData.qr_code && (
                        <div className="flex justify-center mb-4">
                            <img src={fibPaymentData.qr_code} alt="FIB QR Code" className="w-48 h-48 object-contain border border-gray-200 dark:border-gray-600 rounded-lg" />
                        </div>
                    )}
                    {fibPaymentData.readable_code && (
                        <p className="text-center text-gray-700 dark:text-gray-300 font-mono mb-4">
                            {language === 'ar' ? 'الكود: ' : 'Code: '}{fibPaymentData.readable_code}
                        </p>
                    )}
                    <div className="space-y-2 text-sm">
                        {fibPaymentData.personal_app_link && (
                            <a href={fibPaymentData.personal_app_link} target="_blank" rel="noopener noreferrer" className={linkClass}>
                                {language === 'ar' ? 'فتح تطبيق FIB الشخصي' : 'Open FIB Personal App'}
                            </a>
                        )}
                        {fibPaymentData.business_app_link && (
                            <a href={fibPaymentData.business_app_link} target="_blank" rel="noopener noreferrer" className={linkClass}>
                                {language === 'ar' ? 'فتح تطبيق FIB للأعمال' : 'Open FIB Business App'}
                            </a>
                        )}
                        {fibPaymentData.corporate_app_link && (
                            <a href={fibPaymentData.corporate_app_link} target="_blank" rel="noopener noreferrer" className={linkClass}>
                                {language === 'ar' ? 'فتح تطبيق FIB للشركات' : 'Open FIB Corporate App'}
                            </a>
                        )}
                    </div>
                    <p className="text-center text-gray-500 dark:text-gray-400 text-xs mt-4">
                        {language === 'ar' ? 'جاري انتظار إتمام الدفع...' : 'Waiting for payment...'}
                    </p>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        {t('paymentError') || 'Payment Error'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <Button onClick={() => window.location.href = '/register'} className="w-full">
                        {t('backToRegistration') || 'Back to Registration'}
                    </Button>
                </div>
            </div>
        );
    }

    return null;
};

