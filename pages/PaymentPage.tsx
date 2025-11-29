import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Loader } from '../components/index';
import { createPaytabsPaymentSessionAPI } from '../services/api';

export const PaymentPage = () => {
    const { t, language, theme } = useAppContext();
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
        // Get subscription_id from URL
        const urlParams = new URLSearchParams(window.location.search);
        const subId = urlParams.get('subscription_id');
        const status = urlParams.get('status');
        
        // If we have status parameter, we're coming back from Paytabs - redirect to success
        if (status && subId) {
            window.location.href = `/payment/success?subscription_id=${subId}&status=${status}`;
            return;
        }
        
        // If no subscription_id, show error and redirect to login
        if (!subId) {
            console.error('No subscription_id found in payment page');
            setError(t('paymentSubscriptionIdRequired') || 'Subscription ID is required');
            setIsLoading(false);
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
            return;
        }
        
        setSubscriptionId(subId);
    }, []);

    useEffect(() => {
        // Prevent multiple initializations
        if (hasInitialized || !subscriptionId) {
            return;
        }

        const initPayment = async () => {
            setHasInitialized(true);
            
            try {
                setIsLoading(true);
                const result = await createPaytabsPaymentSessionAPI(parseInt(subscriptionId));
                
                if (result.redirect_url) {
                    // Redirect to Paytabs payment page
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
                setHasInitialized(false); // Allow retry
            }
        };

        initPayment();
    }, [subscriptionId, t, hasInitialized]);

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

