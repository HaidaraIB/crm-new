import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Loader } from '../components/index';
import { getCurrentUserAPI, checkPaymentStatusAPI } from '../services/api';

export const PaymentSuccessPage = () => {
    const { t, language, setCurrentUser, setIsLoggedIn, setCurrentPage } = useAppContext();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const processingRef = React.useRef(false);

    useEffect(() => {
        // Prevent multiple executions
        if (processingRef.current) {
            console.log('Payment processing already in progress, skipping...');
            return;
        }
        
        const handlePaymentSuccess = async () => {
            processingRef.current = true;
            console.log('🚀 Starting payment success handler...');
            try {
                // Get subscription_id from URL (PayTabs redirects to backend, backend redirects here)
                const urlParams = new URLSearchParams(window.location.search);
                const subscriptionId = urlParams.get('subscription_id');
                const urlStatus = urlParams.get('status');
                const tranRef = urlParams.get('tranRef') || urlParams.get('tran_ref');
                
                // Check URL status parameter if present
                if (urlStatus === 'failed') {
                    const message = urlParams.get('message');
                    setError(message || t('paymentFailed') || 'Payment failed. Please try again.');
                    setIsLoading(false);
                    return;
                }
                
                if (!subscriptionId) {
                    setError(t('paymentSubscriptionIdRequired') || 'Subscription ID is required');
                    setIsLoading(false);
                    return;
                }
                
                // If status is success and we have tranRef, backend already confirmed payment
                // Just do a quick verification and proceed
                if (urlStatus === 'success' && tranRef) {
                    console.log('Backend confirmed payment success, proceeding with verification...');
                }
                
                let pollAttempts = 0;
                let maxPollAttempts = 10; // Reduced to 10 attempts (20 seconds max)
                const pollInterval = 2000; // 2 seconds
                let paymentCompleted = false;
                
                // Helper function to check if payment is completed
                const checkPaymentCompleted = (statusResult: any): boolean => {
                    if (!statusResult) return false;
                    
                    // Handle both boolean true and string "true"
                    const isActive = statusResult.subscription_active === true || 
                                    statusResult.subscription_active === 'true' || 
                                    statusResult.subscription_active === 1 ||
                                    String(statusResult.subscription_active).toLowerCase() === 'true';
                    const isCompleted = statusResult.payment_status === 'completed';
                    const isApproved = statusResult.paytabs_status === 'A' || 
                                    statusResult.paytabs_status === 'Approved';
                    
                    console.log('Payment check:', {
                        isActive,
                        isCompleted,
                        isApproved,
                        subscription_active: statusResult.subscription_active,
                        payment_status: statusResult.payment_status,
                        paytabs_status: statusResult.paytabs_status
                    });
                    
                    return isActive || isCompleted || isApproved;
                };
                
                // If status is success and we have tranRef, backend already confirmed payment
                // Do ONE quick check, and if subscription is active, proceed immediately
                if (urlStatus === 'success' && tranRef) {
                    console.log('Backend confirmed payment success with status=success and tranRef, checking subscription status...');
                    try {
                        const statusResult = await checkPaymentStatusAPI(parseInt(subscriptionId));
                        console.log('=== PAYMENT STATUS CHECK RESULT ===');
                        console.log('Full response:', JSON.stringify(statusResult, null, 2));
                        console.log('subscription_active:', statusResult?.subscription_active, 'type:', typeof statusResult?.subscription_active);
                        console.log('payment_status:', statusResult?.payment_status, 'type:', typeof statusResult?.payment_status);
                        console.log('paytabs_status:', statusResult?.paytabs_status, 'type:', typeof statusResult?.paytabs_status);
                        
                        const completed = checkPaymentCompleted(statusResult);
                        console.log('=== PAYMENT COMPLETED CHECK ===');
                        console.log('Result:', completed);
                        
                        if (completed) {
                            // Skip polling, proceed to login
                            console.log('✅ Payment confirmed! Setting paymentCompleted = true');
                            paymentCompleted = true;
                            console.log('✅ paymentCompleted is now:', paymentCompleted);
                            console.log('✅ Will skip polling loop and proceed to login...');
                        } else {
                            // If not yet updated, start polling but with fewer attempts
                            console.log('⚠️ Payment not yet updated in database, will poll a few times...');
                            maxPollAttempts = 5; // Only poll 5 times (10 seconds) if backend said success
                        }
                    } catch (err: any) {
                        console.error('❌ Error checking payment status:', err);
                        console.error('Error details:', err.message, err.stack);
                        // If backend said success but API fails, still try polling
                        console.log('Will try polling as fallback...');
                    }
                }
                
                // If payment already confirmed, skip polling entirely
                if (paymentCompleted) {
                    console.log('✅✅✅ Payment already confirmed! Skipping polling and proceeding directly to login...');
                } else {
                    // Poll payment status - backend handles PayTabs callback/return
                    // We just need to check if payment completed
                    console.log('🔍 Payment not yet confirmed, starting to poll...');
                    console.log('⏳ Starting to poll payment status for subscription:', subscriptionId);
                    
                    while (pollAttempts < maxPollAttempts && !paymentCompleted) {
                    console.log(`🔄 Entering polling loop - attempt ${pollAttempts + 1}, paymentCompleted: ${paymentCompleted}`);
                    try {
                        const statusResult = await checkPaymentStatusAPI(parseInt(subscriptionId));
                        console.log(`Poll attempt ${pollAttempts + 1}:`, JSON.stringify(statusResult, null, 2));
                        
                        // Check if payment is completed using helper function
                        if (checkPaymentCompleted(statusResult)) {
                            paymentCompleted = true;
                            console.log('✅ Payment completed during polling! Breaking loop...');
                            break;
                        }
                        
                        // Check if payment failed
                        if (statusResult.payment_status === 'failed' || 
                            (statusResult.paytabs_status && statusResult.paytabs_status !== 'A' && statusResult.paytabs_status !== 'pending')) {
                            setError(t('paymentFailed') || 'Payment failed. Please try again.');
                            setIsLoading(false);
                            return;
                        }
                    } catch (err: any) {
                        console.error(`Error polling payment status (attempt ${pollAttempts + 1}):`, err);
                        // If it's a 404 or endpoint error, stop polling immediately
                        if (err.message && (err.message.includes('404') || err.message.includes('Not Found') || err.message.includes('endpoint'))) {
                            console.error('Payment status endpoint error. Stopping polling.');
                            setError(t('paymentStatusEndpointError') || 'Payment status endpoint not found. Please contact support.');
                            setIsLoading(false);
                            return;
                        }
                        // For other errors, stop after 3 failed attempts to prevent infinite loop
                        if (pollAttempts >= 3) {
                            console.error('Too many errors, stopping polling');
                            setError(t('paymentStatusError') || 'Unable to check payment status. Please refresh the page or contact support.');
                            setIsLoading(false);
                            return;
                        }
                    }
                    
                        await new Promise(resolve => setTimeout(resolve, pollInterval));
                        pollAttempts++;
                    }
                }
                
                // Final check - if still not completed, show error
                console.log('🔍 Final check - paymentCompleted:', paymentCompleted);
                if (!paymentCompleted) {
                    console.log('❌ Payment not completed after polling, showing error');
                    setError(t('paymentPending') || 'Payment is still being processed. Please wait a moment and refresh.');
                    setIsLoading(false);
                    processingRef.current = false;
                    return;
                }
                
                console.log('✅✅✅ Payment confirmed! Proceeding to get user data and login...');
                
                // Payment completed - get user data and log in
                console.log('📦 Checking for pendingUserData in localStorage...');
                const pendingUserDataStr = localStorage.getItem('pendingUserData');
                console.log('📦 pendingUserData exists:', !!pendingUserDataStr);
                
                if (!pendingUserDataStr) {
                    console.error('❌ No pendingUserData found in localStorage');
                    // Store success message even if we redirect to login
                    localStorage.setItem('paymentSuccessMessage', JSON.stringify({
                        message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active.',
                        timestamp: Date.now()
                    }));
                    
                    setError(t('paymentSuccessNoData') || 'Payment successful but user data not found. Please login.');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 3000);
                    setIsLoading(false);
                    processingRef.current = false;
                    return;
                }
                
                console.log('📦 Parsing pendingUserData...');
                const pendingUserData = JSON.parse(pendingUserDataStr);
                console.log('📦 pendingUserData parsed:', pendingUserData);
                
                // Get updated user data from API
                try {
                    console.log('🌐 Calling getCurrentUserAPI()...');
                    const userData = await getCurrentUserAPI();
                    console.log('🌐 getCurrentUserAPI response:', userData);
                    
                    // Verify subscription is active
                    console.log('🔍 Checking subscription status...');
                    console.log('🔍 userData.company:', userData.company);
                    console.log('🔍 userData.company?.subscription:', userData.company?.subscription);
                    console.log('🔍 userData.company?.subscription?.is_active:', userData.company?.subscription?.is_active);
                    
                    if (!userData.company?.subscription?.is_active) {
                        console.log('⚠️ Subscription not active yet, waiting 2 seconds and retrying...');
                        // Wait a bit more and check again
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        console.log('🔄 Retrying getCurrentUserAPI()...');
                        const retryUserData = await getCurrentUserAPI();
                        console.log('🔄 Retry response:', retryUserData);
                        console.log('🔍 Retry subscription is_active:', retryUserData.company?.subscription?.is_active);
                        
                        if (!retryUserData.company?.subscription?.is_active) {
                            console.error('❌ Subscription still not active after retry');
                            setError(t('paymentPending') || 'Payment was successful but subscription activation is delayed. Please wait a moment and refresh.');
                            setIsLoading(false);
                            processingRef.current = false;
                            return;
                        }
                        // Use retry data
                        const frontendUser = {
                            id: retryUserData.id,
                            name: `${retryUserData.first_name || ''} ${retryUserData.last_name || ''}`.trim() || retryUserData.username,
                            username: retryUserData.username,
                            email: retryUserData.email,
                            role: retryUserData.role || 'Owner',
                            phone: retryUserData.phone || '',
                            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(retryUserData.username)}&background=random`,
                            company: retryUserData.company ? {
                                id: retryUserData.company.id,
                                name: retryUserData.company.name,
                                specialization: retryUserData.company.specialization,
                            } : pendingUserData.company,
                        };
                        
                        // Store success message for dashboard
                        localStorage.setItem('paymentSuccessMessage', JSON.stringify({
                            message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active.',
                            timestamp: Date.now()
                        }));
                        
                        setCurrentUser(frontendUser);
                        setIsLoggedIn(true);
                        localStorage.removeItem('pendingUserData');
                        
                        setTimeout(() => {
                            window.history.replaceState({}, '', '/');
                            setCurrentPage('Dashboard');
                        }, 2000);
                        setIsLoading(false);
                        processingRef.current = false;
                        return;
                    }
                    
                    // Payment successful and subscription is active
                    const frontendUser = {
                        id: userData.id,
                        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role || 'Owner',
                        phone: userData.phone || '',
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`,
                        company: userData.company ? {
                            id: userData.company.id,
                            name: userData.company.name,
                            specialization: userData.company.specialization,
                        } : pendingUserData.company,
                    };
                    
                    console.log('👤 Setting user data and logging in...');
                    console.log('👤 frontendUser:', frontendUser);
                    setCurrentUser(frontendUser);
                    setIsLoggedIn(true);
                    localStorage.removeItem('pendingUserData');
                    console.log('✅ User logged in successfully!');
                    
                    // Store success message for dashboard
                    localStorage.setItem('paymentSuccessMessage', JSON.stringify({
                        message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active.',
                        timestamp: Date.now()
                    }));
                    
                    // Redirect to dashboard after 2 seconds
                    console.log('🔄 Redirecting to dashboard in 2 seconds...');
                    setTimeout(() => {
                        console.log('🔄 Executing redirect to dashboard...');
                        window.history.replaceState({}, '', '/');
                        setCurrentPage('Dashboard');
                        setIsLoading(false);
                        processingRef.current = false;
                    }, 2000);
                } catch (err: any) {
                    console.error('❌ Error getting user data:', err);
                    console.error('❌ Error details:', err.message, err.stack);
                    
                    // If API fails but we have pendingUserData, use that instead
                    if (pendingUserData) {
                        console.log('⚠️ API failed, but using pendingUserData from localStorage...');
                        const frontendUser = {
                            id: pendingUserData.id || pendingUserData.user?.id,
                            name: pendingUserData.name || `${pendingUserData.user?.first_name || ''} ${pendingUserData.user?.last_name || ''}`.trim() || pendingUserData.user?.username,
                            username: pendingUserData.username || pendingUserData.user?.username,
                            email: pendingUserData.email || pendingUserData.user?.email,
                            role: pendingUserData.role || pendingUserData.user?.role || 'Owner',
                            phone: pendingUserData.phone || pendingUserData.user?.phone || '',
                            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingUserData.username || pendingUserData.user?.username || 'User')}&background=random`,
                            company: pendingUserData.company,
                        };
                        
                        console.log('👤 Using pendingUserData:', frontendUser);
                        
                        // Store success message for dashboard
                        localStorage.setItem('paymentSuccessMessage', JSON.stringify({
                            message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active.',
                            timestamp: Date.now()
                        }));
                        
                        setCurrentUser(frontendUser);
                        setIsLoggedIn(true);
                        localStorage.removeItem('pendingUserData');
                        
                        console.log('✅ User logged in using pendingUserData!');
                        setTimeout(() => {
                            window.history.replaceState({}, '', '/');
                            setCurrentPage('Dashboard');
                            setIsLoading(false);
                            processingRef.current = false;
                        }, 2000);
                        return;
                    }
                    
                    setError(t('paymentSuccessError') || 'Payment successful but failed to load user data. Please login.');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 3000);
                    setIsLoading(false);
                    processingRef.current = false;
                }
            } catch (err: any) {
                console.error('❌ Error processing payment:', err);
                setError(err.message || t('paymentSuccessError') || 'Error processing payment success');
                setIsLoading(false);
                processingRef.current = false;
            } finally {
                // Reset processing flag after a delay to allow for retries if needed
                setTimeout(() => {
                    processingRef.current = false;
                }, 5000);
            }
        };

        handlePaymentSuccess();
        
        // Cleanup function
        return () => {
            console.log('Payment success handler cleanup');
        };
    }, [t, setCurrentUser, setIsLoggedIn, setCurrentPage]);

    if (isLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
                <div className="text-center">
                    <Loader />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                        {t('paymentProcessing') || 'Processing your payment...'}
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
                    <Button onClick={() => window.location.href = '/login'} className="w-full">
                        {t('goToLogin') || 'Go to Login'}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
            <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center">
                <div className="mb-6">
                    <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('paymentSuccess') || 'Payment Successful!'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {t('paymentSuccessMessage') || 'Your payment has been processed successfully. Your account is now active.'}
                    </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center mb-2">
                        <Loader />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('redirectingToDashboard') || 'Redirecting you to your dashboard...'}
                    </p>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('paymentSuccessNote') || 'You will be automatically redirected in a few seconds'}
                </div>
            </div>
        </div>
    );
};
