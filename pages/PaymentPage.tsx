import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Loader, Card, PaymentGatewaySelector } from '../components/index';
import { createPaymentSessionAPI } from '../services/api';

export const PaymentPage = () => {
    const { t, language, theme } = useAppContext();
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    const [selectedGateway, setSelectedGateway] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showGatewaySelection, setShowGatewaySelection] = useState(true);

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

    const handleProceedToPayment = async () => {
        if (!selectedGateway || !subscriptionId) {
            setError(t('paymentGatewayRequired') || 'Please select a payment method');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const result = await createPaymentSessionAPI(parseInt(subscriptionId), selectedGateway);
            
            if (result.redirect_url) {
                // Redirect to payment gateway page
                window.location.href = result.redirect_url;
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

