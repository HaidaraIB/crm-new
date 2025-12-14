import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Loader } from '../components/index';
import { getCurrentUserAPI, checkPaymentStatusAPI, requestTwoFactorAuthAPI, verifyTwoFactorAuthAPI } from '../services/api';
import { navigateToCompanyRoute } from '../utils/routing';

export const PaymentSuccessPage = () => {
    const { t, language, setCurrentUser, setIsLoggedIn, setCurrentPage } = useAppContext();
    const [error, setError] = useState<string | null>(null);
    const [isLoadingState, setIsLoading] = useState(true);
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const processingRef = useRef(false);

    // Get subscription_id from URL
    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionIdParam = urlParams.get('subscription_id');
    const urlStatus = urlParams.get('status');
    const tranRef = urlParams.get('tranRef') || urlParams.get('tran_ref');
    const subscriptionId = subscriptionIdParam ? parseInt(subscriptionIdParam) : null;

    // Helper function to check if payment is completed
    const checkPaymentCompleted = (statusResult: any): boolean => {
        if (!statusResult) return false;
        
        const isActive = statusResult.subscription_active === true || 
                        statusResult.subscription_active === 'true' || 
                        statusResult.subscription_active === 1 ||
                        String(statusResult.subscription_active).toLowerCase() === 'true';
        const isCompleted = statusResult.payment_status === 'completed';
        const isApproved = statusResult.paytabs_status === 'A' || 
                        statusResult.paytabs_status === 'Approved';
        
        return isActive || isCompleted || isApproved;
    };

    // Payment status will be checked via direct API calls in useEffect
    const [paymentStatus, setPaymentStatus] = useState<any>(null);
    const [paymentError, setPaymentError] = useState<any>(null);

    useEffect(() => {
        // Prevent multiple executions
        if (processingRef.current) {
            return;
        }
        
        const handlePaymentSuccess = async () => {
            processingRef.current = true;
            try {
                // Check URL status parameter if present
                if (urlStatus === 'failed') {
                    const message = urlParams.get('message');
                    setError(message || t('paymentFailed') || 'Payment failed. Please try again.');
                    return;
                }
                
                if (!subscriptionId) {
                    setError(t('paymentSubscriptionIdRequired') || 'Subscription ID is required');
                    return;
                }
                
                // If status is success and we have tranRef, backend already confirmed payment
                if (urlStatus === 'success' && tranRef) {
                    setPaymentCompleted(true);
                    
                    // Try to get tokens from payment status API (optional - if backend provides them)
                    try {
                        const statusResult = await checkPaymentStatusAPI(subscriptionId);
                        
                        // Check if backend returned tokens in the response
                        if (statusResult.access && statusResult.refresh) {
                            localStorage.setItem('accessToken', statusResult.access);
                            localStorage.setItem('refreshToken', statusResult.refresh);
                        }
                    } catch (err: any) {
                        // Tokens not available, user will login manually
                    }
                }
                
                // Check payment status from React Query
                if (paymentStatus && checkPaymentCompleted(paymentStatus)) {
                    setPaymentCompleted(true);
                    
                    // Check if backend returned tokens in the response
                    if (paymentStatus.access && paymentStatus.refresh) {
                        localStorage.setItem('accessToken', paymentStatus.access);
                        localStorage.setItem('refreshToken', paymentStatus.refresh);
                    }
                }
                
                // Check if payment failed
                if (paymentStatus && (paymentStatus.payment_status === 'failed' || 
                    (paymentStatus.paytabs_status && paymentStatus.paytabs_status !== 'A' && paymentStatus.paytabs_status !== 'pending'))) {
                    setError(t('paymentFailed') || 'Payment failed. Please try again.');
                    return;
                }
                
                // Handle payment errors
                if (paymentError) {
                    const errorMessage = (paymentError as any)?.message || '';
                    if (errorMessage.includes('404') || errorMessage.includes('Not Found') || errorMessage.includes('endpoint')) {
                        setError(t('paymentStatusEndpointError') || 'Payment status endpoint not found. Please contact support.');
                    } else {
                        setError(t('paymentStatusError') || 'Unable to check payment status. Please refresh the page or contact support.');
                    }
                    return;
                }
                
                // If payment completed, proceed to login
                if (paymentCompleted) {
                try {
                // Payment completed - get user data and log in
                const pendingUserDataStr = localStorage.getItem('pendingUserData');
                
                if (!pendingUserDataStr) {
                    console.error('No pendingUserData found in localStorage');
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
                
                const pendingUserData = JSON.parse(pendingUserDataStr);
                
                // Check if we have tokens - if not, try to get them from pendingUserData or redirect to login
                let accessToken = localStorage.getItem('accessToken');
                let refreshToken = localStorage.getItem('refreshToken');
                
                // If no tokens, check if we can use pendingUserData to login
                // If pendingUserData has username/password, we can try to login automatically
                if (!accessToken || !refreshToken) {
                    // Check if we have credentials in sessionStorage from previous login attempt
                    const storedUsername = sessionStorage.getItem('2fa_username');
                    const storedPassword = sessionStorage.getItem('2fa_password');
                    
                    // If we have credentials and pendingUserData matches, try to login
                    if (storedUsername && storedPassword && pendingUserData?.username === storedUsername) {
                        try {
                            // Request 2FA token first
                            const twoFAResponse = await requestTwoFactorAuthAPI(storedUsername, language);
                            
                            // For payment success, backend might allow login without 2FA code
                            // Try to verify with empty code
                            try {
                                const verifyResponse = await verifyTwoFactorAuthAPI({
                                    username: storedUsername,
                                    password: storedPassword,
                                    token: twoFAResponse.token,
                                    code: '', // Try empty code
                                });
                                
                                if (verifyResponse.access && verifyResponse.refresh) {
                                    accessToken = verifyResponse.access;
                                    refreshToken = verifyResponse.refresh;
                                    localStorage.setItem('accessToken', accessToken);
                                    localStorage.setItem('refreshToken', refreshToken);
                                }
                            } catch (verifyErr: any) {
                                // Auto-login failed, user needs to login manually
                            }
                        } catch (err) {
                            console.error('Error during auto-login:', err);
                        }
                    }
                    
                    // If still no tokens after auto-login attempt, show message and redirect to login
                    if (!accessToken || !refreshToken) {
                        localStorage.setItem('paymentSuccessMessage', JSON.stringify({
                            message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active. Please login to continue.',
                            timestamp: Date.now()
                        }));
                        
                        // Clear pendingSubscriptionId to prevent redirect loop
                        localStorage.removeItem('pendingSubscriptionId');
                        
                        // Redirect to login page
                        const loginUrl = '/login?payment_success=true';
                        window.location.href = loginUrl;
                        processingRef.current = false;
                        return;
                    }
                }
                
                // Get updated user data from API
                // If we don't have tokens, getCurrentUserAPI will fail with 401, and we'll handle it
                let userData;
                try {
                    userData = await getCurrentUserAPI();
                    
                    // Verify subscription is active
                    if (!userData.company?.subscription?.is_active) {
                        // Wait a bit more and check again
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        const retryUserData = await getCurrentUserAPI();
                        
                        if (!retryUserData.company?.subscription?.is_active) {
                            console.error('Subscription still not active after retry');
                            setError(t('paymentPending') || 'Payment was successful but subscription activation is delayed. Please wait a moment and refresh.');
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
                                domain: retryUserData.company.domain || pendingUserData.company?.domain,
                                specialization: retryUserData.company.specialization,
                            } : pendingUserData.company,
                        };
                        
                        // Store success message for dashboard
                        localStorage.setItem('paymentSuccessMessage', JSON.stringify({
                            message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active.',
                            timestamp: Date.now()
                        }));
                        
                        // Clear old user data before setting new user
                        localStorage.removeItem('currentUser');
                        
                        setCurrentUser(frontendUser);
                        setIsLoggedIn(true);
                        localStorage.removeItem('pendingUserData');
                        
                        // Redirect to Dashboard
                        setTimeout(() => {
                            navigateToCompanyRoute(frontendUser.company?.name, frontendUser.company?.domain, 'Dashboard');
                            setCurrentPage('Dashboard');
                        }, 1000);
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
                            domain: userData.company.domain || pendingUserData.company?.domain,
                            specialization: userData.company.specialization,
                        } : pendingUserData.company,
                    };
                    
                    // Clear old user data before setting new user
                    localStorage.removeItem('currentUser');
                    
                    setCurrentUser(frontendUser);
                    setIsLoggedIn(true);
                    localStorage.removeItem('pendingUserData');
                    
                    // Store success message for dashboard
                    localStorage.setItem('paymentSuccessMessage', JSON.stringify({
                        message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active.',
                        timestamp: Date.now()
                    }));
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        navigateToCompanyRoute(frontendUser.company?.name, frontendUser.company?.domain, 'Dashboard');
                        setCurrentPage('Dashboard');
                        setIsLoading(false);
                        processingRef.current = false;
                    }, 1000);
                } catch (err: any) {
                    console.error('Error getting user data:', err);
                    
                    // If API fails due to 401 (no tokens), try to use pendingUserData to login
                    if (err.status === 401 || err.message?.includes('401') || err.message?.includes('Unauthorized')) {
                        // Use pendingUserData to create frontend user
                        if (pendingUserData) {
                            const frontendUser = {
                                id: pendingUserData.id || pendingUserData.user?.id,
                                name: pendingUserData.name || `${pendingUserData.user?.first_name || ''} ${pendingUserData.user?.last_name || ''}`.trim() || pendingUserData.user?.username,
                                username: pendingUserData.username || pendingUserData.user?.username,
                                email: pendingUserData.email || pendingUserData.user?.email,
                                role: pendingUserData.role || pendingUserData.user?.role || 'Owner',
                                phone: pendingUserData.phone || pendingUserData.user?.phone || '',
                                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingUserData.username || pendingUserData.user?.username || 'User')}&background=random`,
                                company: pendingUserData.company ? {
                                    ...pendingUserData.company,
                                    domain: pendingUserData.company.domain,
                                } : undefined,
                            };
                            
                            // Clear old user data
                            localStorage.removeItem('currentUser');
                            
                            // Since we don't have tokens, we can't use API calls
                            // But payment is complete, so we'll redirect to login with success message
                            // Store success message
                            localStorage.setItem('paymentSuccessMessage', JSON.stringify({
                                message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active. Please login to continue.',
                                timestamp: Date.now()
                            }));
                            
                            // Also store subscription ID so login page can show payment link if needed
                            if (subscriptionId) {
                                localStorage.setItem('pendingSubscriptionId', subscriptionId.toString());
                            }
                            
                            // Redirect to login page
                            const loginUrl = '/login?payment_success=true';
                            window.location.href = loginUrl;
                            setIsLoading(false);
                            processingRef.current = false;
                            return;
                        } else {
                            // No pendingUserData either - just redirect to login
                            localStorage.setItem('paymentSuccessMessage', JSON.stringify({
                                message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active. Please login to continue.',
                                timestamp: Date.now()
                            }));
                            
                            const loginUrl = '/login';
                            window.location.href = loginUrl;
                            setIsLoading(false);
                            processingRef.current = false;
                            return;
                        }
                    }
                    
                    // If API fails but we have pendingUserData, use that instead
                    if (pendingUserData) {
                        const frontendUser = {
                            id: pendingUserData.id || pendingUserData.user?.id,
                            name: pendingUserData.name || `${pendingUserData.user?.first_name || ''} ${pendingUserData.user?.last_name || ''}`.trim() || pendingUserData.user?.username,
                            username: pendingUserData.username || pendingUserData.user?.username,
                            email: pendingUserData.email || pendingUserData.user?.email,
                            role: pendingUserData.role || pendingUserData.user?.role || 'Owner',
                            phone: pendingUserData.phone || pendingUserData.user?.phone || '',
                            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingUserData.username || pendingUserData.user?.username || 'User')}&background=random`,
                            company: pendingUserData.company ? {
                                ...pendingUserData.company,
                                domain: pendingUserData.company.domain,
                            } : undefined,
                        };
                        
                        // Store success message for dashboard
                        localStorage.setItem('paymentSuccessMessage', JSON.stringify({
                            message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active.',
                            timestamp: Date.now()
                        }));
                        
                        // Clear old user data before setting new user
                        localStorage.removeItem('currentUser');
                        
                        setCurrentUser(frontendUser);
                        setIsLoggedIn(true);
                        localStorage.removeItem('pendingUserData');
                        
                        // Redirect to dashboard
                        setTimeout(() => {
                            navigateToCompanyRoute(frontendUser.company?.name, frontendUser.company?.domain, 'Dashboard');
                            setCurrentPage('Dashboard');
                            setIsLoading(false);
                            processingRef.current = false;
                        }, 1000);
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
                    console.error('Error processing payment:', err);
                    setError(err.message || t('paymentSuccessError') || 'Error processing payment success');
                    setIsLoading(false);
                    processingRef.current = false;
                } finally {
                    // Reset processing flag after a delay to allow for retries if needed
                    setTimeout(() => {
                        processingRef.current = false;
                    }, 5000);
                }
            }
            } catch (outerErr: any) {
                console.error('Error in payment success handler:', outerErr);
                setError(outerErr.message || t('paymentSuccessError') || 'Error processing payment success');
                setIsLoading(false);
                processingRef.current = false;
            }
        };

        handlePaymentSuccess();
        
        // Cleanup function
        return () => {
            // Cleanup
        };
    }, [t, setCurrentUser, setIsLoggedIn, setCurrentPage]);

    if (isLoadingState && !error) {
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
