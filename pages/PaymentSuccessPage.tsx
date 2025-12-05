import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Loader } from '../components/index';
import { getCurrentUserAPI, checkPaymentStatusAPI, requestTwoFactorAuthAPI, verifyTwoFactorAuthAPI } from '../services/api';
import { navigateToCompanyRoute, getCompanySubdomainUrl, getBaseDomain, isOnSubdomain } from '../utils/routing';

export const PaymentSuccessPage = () => {
    const { t, language, setCurrentUser, setIsLoggedIn, setCurrentPage, currentUser } = useAppContext();
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
                            
                            // Check if backend returned tokens in the response
                            if (statusResult.access && statusResult.refresh) {
                                console.log('🔑 Tokens found in payment status response!');
                                localStorage.setItem('accessToken', statusResult.access);
                                localStorage.setItem('refreshToken', statusResult.refresh);
                            }
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
                            
                            // Check if backend returned tokens in the response
                            if (statusResult.access && statusResult.refresh) {
                                console.log('🔑 Tokens found in payment status response!');
                                localStorage.setItem('accessToken', statusResult.access);
                                localStorage.setItem('refreshToken', statusResult.refresh);
                            }
                            
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
                
                // Check if we have tokens - if not, try to get them by re-authenticating
                let accessToken = localStorage.getItem('accessToken');
                let refreshToken = localStorage.getItem('refreshToken');
                
                // If no tokens, try to re-authenticate using sessionStorage credentials
                if (!accessToken || !refreshToken) {
                    console.log('🔑 No tokens found, attempting to re-authenticate...');
                    const storedUsername = sessionStorage.getItem('2fa_username');
                    const storedPassword = sessionStorage.getItem('2fa_password');
                    
                    if (storedUsername && storedPassword && pendingUserData?.username === storedUsername) {
                        try {
                            console.log('🔐 Re-authenticating with stored credentials...');
                            // Request 2FA token
                            const twoFAResponse = await requestTwoFactorAuthAPI(storedUsername, language);
                            
                            // Try to verify with empty code (backend might allow this after payment)
                            try {
                                const verifyResponse = await verifyTwoFactorAuthAPI({
                                    username: storedUsername,
                                    password: storedPassword,
                                    token: twoFAResponse.token,
                                    code: '', // Try empty code first
                                });
                                
                                // If successful, we now have tokens
                                if (verifyResponse.access && verifyResponse.refresh) {
                                    accessToken = verifyResponse.access;
                                    refreshToken = verifyResponse.refresh;
                                    localStorage.setItem('accessToken', accessToken);
                                    localStorage.setItem('refreshToken', refreshToken);
                                    console.log('🔑 Tokens obtained from re-authentication!');
                                }
                            } catch (verifyErr: any) {
                                console.log('⚠️ Empty code not accepted, will redirect to login');
                                // Continue without tokens - will redirect to login in catch block
                            }
                        } catch (err) {
                            console.error('❌ Error re-authenticating:', err);
                        }
                    }
                }
                
                // Get updated user data from API
                // If we don't have tokens, getCurrentUserAPI will fail with 401, and we'll handle it
                let userData;
                try {
                    console.log('🌐 Calling getCurrentUserAPI()...');
                    userData = await getCurrentUserAPI();
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
                        
                        // If company has domain, redirect to subdomain with auth data in URL
                        // localStorage is not shared between different subdomains
                        if (frontendUser.company?.domain) {
                            const accessToken = localStorage.getItem('accessToken');
                            const refreshToken = localStorage.getItem('refreshToken');
                            
                            // Encode tokens and user data to pass via URL
                            const authData = {
                                access: accessToken,
                                refresh: refreshToken,
                                user: frontendUser
                            };
                            
                            const encodedData = btoa(JSON.stringify(authData));
                            const subdomainUrl = getCompanySubdomainUrl(frontendUser.company.domain, 'Dashboard');
                            const redirectUrl = `${subdomainUrl}?auth=${encodeURIComponent(encodedData)}`;
                            
                            console.log('🔄 Redirecting to company subdomain after payment:', redirectUrl);
                            setTimeout(() => {
                                window.location.replace(redirectUrl);
                            }, 1000);
                        } else {
                            setTimeout(() => {
                                navigateToCompanyRoute(frontendUser.company?.name, frontendUser.company?.domain, 'Dashboard');
                                setCurrentPage('Dashboard');
                            }, 2000);
                        }
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
                            domain: userData.company.domain || pendingUserData.company?.domain,
                            specialization: userData.company.specialization,
                        } : pendingUserData.company,
                    };
                    
                    console.log('👤 Setting user data and logging in...');
                    console.log('👤 frontendUser:', frontendUser);
                    
                    // Clear old user data before setting new user
                    localStorage.removeItem('currentUser');
                    
                    setCurrentUser(frontendUser);
                    setIsLoggedIn(true);
                    localStorage.removeItem('pendingUserData');
                    console.log('✅ User logged in successfully!');
                    
                    // Store success message for dashboard
                    localStorage.setItem('paymentSuccessMessage', JSON.stringify({
                        message: t('paymentSuccessMessage') || 'Payment successful! Your subscription is now active.',
                        timestamp: Date.now()
                    }));
                    
                    // If company has domain, redirect to subdomain with auth data in URL
                    // localStorage is not shared between different subdomains
                    if (frontendUser.company?.domain) {
                        const accessToken = localStorage.getItem('accessToken');
                        const refreshToken = localStorage.getItem('refreshToken');
                        
                        // Encode tokens and user data to pass via URL
                        const authData = {
                            access: accessToken,
                            refresh: refreshToken,
                            user: frontendUser
                        };
                        
                        const encodedData = btoa(JSON.stringify(authData));
                        const subdomainUrl = getCompanySubdomainUrl(frontendUser.company.domain, 'Dashboard');
                        const redirectUrl = `${subdomainUrl}?auth=${encodeURIComponent(encodedData)}`;
                        
                        console.log('🔄 Redirecting to company subdomain after payment:', redirectUrl);
                        setTimeout(() => {
                            window.location.replace(redirectUrl);
                        }, 1000);
                    } else {
                        // Redirect to dashboard after 2 seconds
                        console.log('🔄 Redirecting to dashboard in 2 seconds...');
                        setTimeout(() => {
                            console.log('🔄 Executing redirect to dashboard...');
                            navigateToCompanyRoute(frontendUser.company?.name, frontendUser.company?.domain, 'Dashboard');
                            setCurrentPage('Dashboard');
                            setIsLoading(false);
                            processingRef.current = false;
                        }, 2000);
                    }
                } catch (err: any) {
                    console.error('❌ Error getting user data:', err);
                    console.error('❌ Error details:', err.message, err.stack);
                    console.error('❌ Error status:', err.status);
                    
                    // If API fails due to 401 (no tokens), try to use pendingUserData to login
                    if (err.status === 401 || err.message?.includes('401') || err.message?.includes('Unauthorized')) {
                        console.log('⚠️ No tokens available, but payment is complete. Using pendingUserData to proceed...');
                        
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
                            
                            console.log('👤 Using pendingUserData to login:', frontendUser);
                            
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
                                localStorage.setItem('pendingSubscriptionId', subscriptionId);
                            }
                            
                            // Redirect to login page
                            const loginUrl = isOnSubdomain() ? 
                                `${window.location.protocol}//${getBaseDomain()}${window.location.port ? ':' + window.location.port : ''}/login?payment_success=true` :
                                '/login?payment_success=true';
                            console.log('🔄 Redirecting to login page with payment success flag:', loginUrl);
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
                            
                            const loginUrl = isOnSubdomain() ? 
                                `${window.location.protocol}//${getBaseDomain()}${window.location.port ? ':' + window.location.port : ''}/login` :
                                '/login';
                            console.log('🔄 Redirecting to login page:', loginUrl);
                            window.location.href = loginUrl;
                            setIsLoading(false);
                            processingRef.current = false;
                            return;
                        }
                    }
                    
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
                            company: pendingUserData.company ? {
                                ...pendingUserData.company,
                                domain: pendingUserData.company.domain,
                            } : undefined,
                        };
                        
                        console.log('👤 Using pendingUserData:', frontendUser);
                        
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
                        
                        console.log('✅ User logged in using pendingUserData!');
                        
                        // If company has domain, redirect to subdomain with auth data in URL
                        // localStorage is not shared between different subdomains
                        if (frontendUser.company?.domain) {
                            const accessToken = localStorage.getItem('accessToken');
                            const refreshToken = localStorage.getItem('refreshToken');
                            
                            // Encode tokens and user data to pass via URL
                            const authData = {
                                access: accessToken,
                                refresh: refreshToken,
                                user: frontendUser
                            };
                            
                            const encodedData = btoa(JSON.stringify(authData));
                            const subdomainUrl = getCompanySubdomainUrl(frontendUser.company.domain, 'Dashboard');
                            const redirectUrl = `${subdomainUrl}?auth=${encodeURIComponent(encodedData)}`;
                            
                            console.log('🔄 Redirecting to company subdomain after payment:', redirectUrl);
                            setTimeout(() => {
                                window.location.replace(redirectUrl);
                            }, 1000);
                        } else {
                            setTimeout(() => {
                                navigateToCompanyRoute(frontendUser.company?.name, frontendUser.company?.domain, 'Dashboard');
                                setCurrentPage('Dashboard');
                                setIsLoading(false);
                                processingRef.current = false;
                            }, 2000);
                        }
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
