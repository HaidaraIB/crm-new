


import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Input, Button, Loader, EmailVerificationModal } from '../components/index';
import { changeEmailAPI, getCurrentUserAPI, updateUserAPI, createPaytabsPaymentSessionAPI } from '../services/api';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const ProfilePage = () => {
    const {
        t,
        currentUser,
        setCurrentUser,
        setIsChangePasswordModalOpen,
        isEmailVerificationModalOpen,
        setIsEmailVerificationModalOpen,
        language
    } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [subscriptionInfo, setSubscriptionInfo] = useState<{ 
        id: number; 
        isActive: boolean; 
        plan?: { name?: string; name_ar?: string };
        endDate?: string;
        startDate?: string;
    } | null>(null);
    const [isRenewing, setIsRenewing] = useState(false);
    
    // Split name into first and last name
    const nameParts = currentUser?.name?.split(' ') || [];
    const initialFirstName = nameParts[0] || '';
    const initialLastName = nameParts.slice(1).join(' ') || '';
    
    const [firstName, setFirstName] = useState(initialFirstName);
    const [lastName, setLastName] = useState(initialLastName);
    const [email, setEmail] = useState(currentUser?.email || '');
    const [phone, setPhone] = useState(currentUser?.phone || '');
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Load subscription info
    useEffect(() => {
        const loadSubscriptionInfo = async () => {
            try {
                const { getCurrentUserAPI, getPublicPlansAPI } = await import('../services/api');
                const userData = await getCurrentUserAPI();
                if (userData?.company?.subscription) {
                    const subscriptionPlan = userData.company.subscription.plan;
                    let planWithArabic: { name?: string; name_ar?: string } | undefined = undefined;
                    
                    // If plan has name_ar, use it directly
                    if (subscriptionPlan?.name_ar) {
                        planWithArabic = {
                            name: subscriptionPlan.name,
                            name_ar: subscriptionPlan.name_ar,
                        };
                    } else if (subscriptionPlan?.id) {
                        // If plan doesn't have name_ar, try to get it from public plans
                        try {
                            const publicPlans = await getPublicPlansAPI();
                            const publicPlan = Array.isArray(publicPlans) 
                                ? publicPlans.find((p: any) => p.id === subscriptionPlan.id)
                                : null;
                            if (publicPlan) {
                                planWithArabic = {
                                    name: publicPlan.name || subscriptionPlan.name,
                                    name_ar: publicPlan.name_ar || subscriptionPlan.name,
                                };
                            } else {
                                planWithArabic = {
                                    name: subscriptionPlan.name,
                                    name_ar: subscriptionPlan.name, // Fallback to English name
                                };
                            }
                        } catch (err) {
                            console.error('Error fetching public plans:', err);
                            planWithArabic = {
                                name: subscriptionPlan.name,
                                name_ar: subscriptionPlan.name, // Fallback to English name
                            };
                        }
                    } else if (subscriptionPlan?.name) {
                        planWithArabic = {
                            name: subscriptionPlan.name,
                            name_ar: subscriptionPlan.name, // Fallback to English name
                        };
                    }
                    
                    setSubscriptionInfo({
                        id: userData.company.subscription.id,
                        isActive: userData.company.subscription.is_active === true,
                        plan: planWithArabic,
                        endDate: userData.company.subscription.end_date,
                        startDate: userData.company.subscription.start_date,
                    });
                } else {
                    // Clear subscription info if no subscription
                    setSubscriptionInfo(null);
                }
            } catch (error) {
                console.error('Error loading subscription info:', error);
            }
        };
        if (currentUser) {
            loadSubscriptionInfo();
        }
    }, [currentUser]);

    // Update form when currentUser changes
    useEffect(() => {
        if (currentUser) {
            const nameParts = currentUser.name?.split(' ') || [];
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');
            setEmail(currentUser.email || '');
            setPhone(currentUser.phone || '');
        }
    }, [currentUser]);

    if (!currentUser) return null;

    const handleSave = async () => {
        if (!currentUser) return;
        
        try {
            const fullName = `${firstName} ${lastName}`.trim();
            await updateUserAPI(currentUser.id, {
                first_name: firstName,
                last_name: lastName,
                phone: phone,
            });
            
            setCurrentUser({
                ...currentUser,
                name: fullName,
                phone: phone
            });
            
            // Refresh user data to get latest info
            const userData = await getCurrentUserAPI();
            if (userData) {
                setCurrentUser({
                    id: userData.id,
                    name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
                    username: userData.username,
                    email: userData.email,
                    role: userData.role || 'User',
                    phone: userData.phone || '',
                    avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`,
                    company: userData.company,
                    emailVerified: userData.email_verified || userData.is_email_verified || false,
                });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const handleChangeEmail = async (newEmail: string) => {
        if (!currentUser) return;
        
        setIsUpdatingEmail(true);
        try {
            await changeEmailAPI(currentUser.email, newEmail);
            // Update local email state
            setEmail(newEmail);
            setCurrentUser({
                ...currentUser,
                email: newEmail,
            });
        } catch (error: any) {
            throw error;
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const handleVerificationSuccess = async () => {
        // Refresh user data after successful verification
        try {
            const userData = await getCurrentUserAPI();
            if (userData) {
                setCurrentUser({
                    id: userData.id,
                    name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
                    username: userData.username,
                    email: userData.email,
                    role: userData.role || 'User',
                    phone: userData.phone || '',
                    avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`,
                    company: userData.company,
                    emailVerified: userData.email_verified || userData.is_email_verified || false,
                });
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    };

    const handleRenewSubscription = async () => {
        if (!subscriptionInfo || !subscriptionInfo.id) {
            alert(t('subscriptionNotFound') || 'Subscription not found');
            return;
        }

        try {
            setIsRenewing(true);
            // Determine billing cycle from current subscription duration
            let billingCycle: 'monthly' | 'yearly' = 'monthly';
            
            if (subscriptionInfo.endDate && subscriptionInfo.startDate) {
                const startDate = new Date(subscriptionInfo.startDate);
                const endDate = new Date(subscriptionInfo.endDate);
                const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                // If subscription is 330+ days, it's yearly
                billingCycle = daysDiff >= 330 ? 'yearly' : 'monthly';
            }

            // Create payment session for renewal (no plan_id change, just extend subscription)
            const response = await createPaytabsPaymentSessionAPI(
                subscriptionInfo.id,
                undefined, // No plan change
                billingCycle
            );
            
            if (response.redirect_url) {
                window.location.href = response.redirect_url;
            } else {
                alert(t('paymentRedirectError') || 'Failed to get payment URL');
            }
        } catch (error: any) {
            console.error('Error renewing subscription:', error);
            const errorMessage = error?.message || t('errorRenewingSubscription') || 'Error renewing subscription';
            alert(errorMessage);
        } finally {
            setIsRenewing(false);
        }
    };

    
    if (loading) {
        return (
            <PageWrapper title={t('profile')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    const isRTL = language === 'ar';

    return (
        <PageWrapper title={t('profile')}>
            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">{t('profileSettings')}</h2>
                    <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="profile-first-name">{t('firstName') || 'First Name'}</Label>
                                <Input 
                                    id="profile-first-name" 
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="profile-last-name">{t('lastName') || 'Last Name'}</Label>
                                <Input 
                                    id="profile-last-name" 
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="profile-email">{t('email')}</Label>
                            <Input 
                                id="profile-email" 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={currentUser.emailVerified}
                                className={currentUser.emailVerified ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}
                            />
                            {currentUser.emailVerified ? (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    {t('emailVerified') || 'Email verified'}
                                </p>
                            ) : (
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                        {t('emailNotVerified') || 'Email not verified. Please check your inbox for verification email.'}
                                    </p>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setIsEmailVerificationModalOpen(true)}
                                        className="text-xs px-3 py-1.5 h-auto"
                                    >
                                        {t('verifyEmail') || 'Verify Email'}
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="profile-phone">{t('phone')}</Label>
                            <Input 
                                id="profile-phone" 
                                type="tel" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={true}
                                className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">{t('security')}</h2>
                    <Button onClick={() => setIsChangePasswordModalOpen(true)}>
                        {t('changePassword')}
                    </Button>
                </Card>

                {subscriptionInfo && (
                    <Card>
                        <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">{t('subscription')}</h2>
                        <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div>
                                <Label htmlFor="subscription-status">{t('subscriptionStatus')}</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        subscriptionInfo.isActive 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    }`}>
                                        {subscriptionInfo.isActive ? t('active') : t('inactive')}
                                    </span>
                                </div>
                            </div>
                            {subscriptionInfo.plan && (
                                <div>
                                    <Label htmlFor="current-plan">{t('currentPlan')}</Label>
                                    <p className="mt-1 text-gray-700 dark:text-gray-300">
                                        {language === 'ar' && subscriptionInfo.plan.name_ar && subscriptionInfo.plan.name_ar.trim()
                                            ? subscriptionInfo.plan.name_ar
                                            : (subscriptionInfo.plan.name || '')}
                                    </p>
                                </div>
                            )}
                            {subscriptionInfo.endDate && (
                                <div>
                                    <Label htmlFor="subscription-end-date">{t('subscriptionEndDate') || 'End Date'}</Label>
                                    <p className="mt-1 text-gray-700 dark:text-gray-300">
                                        {new Date(subscriptionInfo.endDate).toLocaleDateString(
                                            language === 'ar' ? 'ar' : 'en-US',
                                            { 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit'
                                            }
                                        )}
                                    </p>
                                    {(() => {
                                        if (!subscriptionInfo.isActive || !subscriptionInfo.endDate) return null;
                                        
                                        const endDate = new Date(subscriptionInfo.endDate);
                                        const now = new Date();
                                        const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                        
                                        // Only show reminder if subscription ends within 30 days
                                        if (daysUntilEnd > 0 && daysUntilEnd <= 30) {
                                            return (
                                                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                                                    {t('subscriptionRenewalReminder') || `Your subscription will end in ${daysUntilEnd} day(s). Please renew to continue using our services.`}
                                                </p>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            )}
                            {subscriptionInfo.isActive && (
                                <div className="pt-2">
                                    <Button 
                                        onClick={handleRenewSubscription}
                                        loading={isRenewing}
                                        disabled={isRenewing}
                                        className="w-full sm:w-auto"
                                    >
                                        {isRenewing ? (t('processing') || 'Processing...') : (t('renewSubscription') || 'Renew Subscription')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
                
                <div className="flex justify-end">
                    <Button onClick={handleSave}>{t('saveProfile')}</Button>
                </div>
            </div>
            
            <EmailVerificationModal
                isOpen={isEmailVerificationModalOpen}
                onClose={() => setIsEmailVerificationModalOpen(false)}
                email={currentUser.email}
                onVerificationSuccess={handleVerificationSuccess}
                allowEmailChange={!currentUser.emailVerified}
                onEmailChange={handleChangeEmail}
            />
        </PageWrapper>
    );
};
