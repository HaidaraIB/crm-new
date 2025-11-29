import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Loader } from '../components/index';
import { paytabsCallbackAPI } from '../services/api';

/**
 * PaymentCallbackPage - Handles PayTabs callback
 * This page is called by PayTabs (either via redirect or server-to-server)
 * It calls the backend API to process the callback
 */
export const PaymentCallbackPage = () => {
    const { t, language } = useAppContext();
    const [isProcessing, setIsProcessing] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get tran_ref from URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                const tranRef = urlParams.get('tran_ref') || urlParams.get('tranRef') || urlParams.get('tranref');
                const subscriptionId = urlParams.get('subscription_id');

                if (!tranRef) {
                    setError('Missing transaction reference');
                    setIsProcessing(false);
                    return;
                }

                // Call backend API to process callback
                try {
                    await paytabsCallbackAPI(tranRef);
                    console.log('Payment callback processed successfully');
                    
                    // Redirect to success page if we have subscription_id
                    if (subscriptionId) {
                        window.location.href = `/payment/success?subscription_id=${subscriptionId}&tranRef=${tranRef}`;
                    } else {
                        // Just show success message
                        setIsProcessing(false);
                    }
                } catch (err: any) {
                    console.error('Error processing callback:', err);
                    setError(err.message || 'Failed to process payment callback');
                    setIsProcessing(false);
                }
            } catch (err: any) {
                setError(err.message || 'Error processing callback');
                setIsProcessing(false);
            }
        };

        handleCallback();
    }, [t]);

    if (isProcessing) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
                <div className="text-center">
                    <Loader />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                        {t('paymentProcessing') || 'Processing payment callback...'}
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
                        {t('paymentError') || 'Payment Callback Error'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex items-center justify-center ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
            <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400">
                    Callback processed successfully
                </p>
            </div>
        </div>
    );
};
