
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, Loader, PaymentGatewaySelector, Modal } from '../components/index';
import { getPublicPlansAPI, createPaymentSessionAPI, checkPaymentStatusAPI, getCurrentUserAPI } from '../services/api';
import { CreditCardIcon } from '../components/icons';

type SubscriptionInfo = {
    id: number;
    isActive: boolean;
    plan?: {
        id?: number;
        name?: string;
        name_ar?: string;
        description?: string;
        description_ar?: string;
        price_monthly?: number;
        price_yearly?: number;
        users?: string;
        clients?: string;
        storage?: number;
    };
    startDate?: string;
    endDate?: string;
    billingCycle?: 'monthly' | 'yearly';
};

export const BillingPage = () => {
    const { t, language, currentUser } = useAppContext();
    const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRenewing, setIsRenewing] = useState(false);
    const [showRenewalModal, setShowRenewalModal] = useState(false);
    const [showChangePlanModal, setShowChangePlanModal] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState<number | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);
    const [plansLoading, setPlansLoading] = useState(false);

    // Load subscription info
    useEffect(() => {
        const loadSubscriptionInfo = async () => {
            if (!currentUser) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const userData = await getCurrentUserAPI();
                
                if (userData?.company?.subscription) {
                    const subscription = userData.company.subscription;
                    const subscriptionId = subscription.id;
                    
                    // Get detailed subscription status
                    let detailedStatus = null;
                    try {
                        detailedStatus = await checkPaymentStatusAPI(subscriptionId);
                    } catch (error) {
                        console.error('Error checking payment status:', error);
                    }

                    // Get plan details from public plans
                    let planDetails = null;
                    if (subscription.plan?.id) {
                        try {
                            const publicPlans = await getPublicPlansAPI();
                            const publicPlan = Array.isArray(publicPlans) 
                                ? publicPlans.find((p: any) => p.id === subscription.plan?.id)
                                : null;
                            if (publicPlan) {
                                planDetails = {
                                    id: publicPlan.id,
                                    name: publicPlan.name,
                                    name_ar: publicPlan.name_ar,
                                    description: publicPlan.description,
                                    description_ar: publicPlan.description_ar,
                                    price_monthly: publicPlan.price_monthly,
                                    price_yearly: publicPlan.price_yearly,
                                    users: publicPlan.users,
                                    clients: publicPlan.clients,
                                    storage: publicPlan.storage,
                                };
                            }
                        } catch (error) {
                            console.error('Error fetching plan details:', error);
                        }
                    }

                    // Determine billing cycle from subscription duration
                    let billingCycle: 'monthly' | 'yearly' = 'monthly';
                    if (subscription.start_date && subscription.end_date) {
                        const startDate = new Date(subscription.start_date);
                        const endDate = new Date(subscription.end_date);
                        const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        billingCycle = daysDiff >= 330 ? 'yearly' : 'monthly';
                    }

                    setSubscriptionInfo({
                        id: subscriptionId,
                        isActive: detailedStatus?.is_truly_active ?? subscription.is_active === true,
                        plan: planDetails || {
                            id: subscription.plan?.id,
                            name: subscription.plan?.name,
                            name_ar: subscription.plan?.name_ar,
                        },
                        startDate: subscription.start_date,
                        endDate: detailedStatus?.end_date || subscription.end_date,
                        billingCycle,
                    });
                } else {
                    setSubscriptionInfo(null);
                }
            } catch (error) {
                console.error('Error loading subscription info:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSubscriptionInfo();
    }, [currentUser]);

    // Load available plans for change plan modal
    useEffect(() => {
        if (showChangePlanModal) {
            const loadPlans = async () => {
                setPlansLoading(true);
                try {
                    const data = await getPublicPlansAPI();
                    setAvailablePlans(Array.isArray(data) ? data : []);
                } catch (error) {
                    console.error('Error loading plans:', error);
                } finally {
                    setPlansLoading(false);
                }
            };
            loadPlans();
        }
    }, [showChangePlanModal]);

    const handleRenewSubscription = async () => {
        if (!subscriptionInfo || !subscriptionInfo.id) {
            alert(t('subscriptionNotFound') || 'Subscription not found');
            return;
        }

        if (!selectedGateway) {
            alert(t('paymentGatewayRequired') || 'Please select a payment method');
            return;
        }

        try {
            setIsRenewing(true);
            const billingCycle = subscriptionInfo.billingCycle || 'monthly';

            const response = await createPaymentSessionAPI(
                subscriptionInfo.id,
                selectedGateway,
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
            alert(error?.message || t('errorRenewingSubscription') || 'Error renewing subscription');
        } finally {
            setIsRenewing(false);
            setShowRenewalModal(false);
        }
    };

    const handleChangePlan = async () => {
        if (!subscriptionInfo || !subscriptionInfo.id) {
            alert(t('subscriptionNotFound') || 'Subscription not found');
            return;
        }

        if (!selectedPlan) {
            alert(t('planRequired') || 'Please select a plan to continue');
            return;
        }

        if (!selectedGateway) {
            alert(t('paymentGatewayRequired') || 'Please select a payment method');
            return;
        }

        try {
            setIsRenewing(true);
            const response = await createPaymentSessionAPI(
                subscriptionInfo.id,
                selectedGateway,
                selectedPlan,
                billingCycle
            );
            
            if (response.redirect_url) {
                window.location.href = response.redirect_url;
            } else {
                alert(t('paymentRedirectError') || 'Failed to get payment URL');
            }
        } catch (error: any) {
            console.error('Error changing plan:', error);
            alert(error?.message || t('errorLoadingPaymentLink') || 'Error loading payment link');
        } finally {
            setIsRenewing(false);
            setShowChangePlanModal(false);
        }
    };

    const getDaysRemaining = () => {
        if (!subscriptionInfo?.endDate) return null;
        const endDate = new Date(subscriptionInfo.endDate);
        const now = new Date();
        const daysDiff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff;
    };

    const getPlanPrice = () => {
        if (!subscriptionInfo?.plan) return null;
        const cycle = subscriptionInfo.billingCycle || 'monthly';
        const price = cycle === 'monthly' 
            ? subscriptionInfo.plan.price_monthly 
            : subscriptionInfo.plan.price_yearly;
        return price || 0;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString(
            language === 'ar' ? 'ar' : 'en-US',
            { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    if (isLoading) {
        return (
            <PageWrapper title={t('billing') || 'Billing'}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    if (!currentUser) {
        return (
            <PageWrapper title={t('billing') || 'Billing'}>
                <Card>
                    <p className="text-gray-600 dark:text-gray-400">{t('pleaseLogin') || 'Please login to view billing information'}</p>
                </Card>
            </PageWrapper>
        );
    }

    const isRTL = language === 'ar';
    const daysRemaining = getDaysRemaining();
    const planPrice = getPlanPrice();

    return (
        <PageWrapper title={t('billing') || 'Billing'}>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Current Subscription Status */}
                <Card>
                    <div className="flex items-center gap-3 mb-6">
                        <CreditCardIcon className="w-8 h-8 text-primary" />
                        <h2 className="text-2xl font-semibold">{t('subscription') || 'Subscription'}</h2>
                    </div>

                    {subscriptionInfo ? (
                        <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {/* Status Badge */}
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t('subscriptionStatus') || 'Status'}
                                    </p>
                                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                                        subscriptionInfo.isActive 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    }`}>
                                        {subscriptionInfo.isActive ? t('active') : t('inactive')}
                                    </span>
                                </div>
                                {daysRemaining !== null && daysRemaining > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            {t('daysRemaining') || 'Days Remaining'}
                                        </p>
                                        <p className={`text-lg font-semibold ${
                                            daysRemaining <= 7 
                                                ? 'text-red-600 dark:text-red-400' 
                                                : daysRemaining <= 30 
                                                    ? 'text-amber-600 dark:text-amber-400' 
                                                    : 'text-green-600 dark:text-green-400'
                                        }`}>
                                            {daysRemaining} {t('days') || 'days'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Plan Details */}
                            {subscriptionInfo.plan && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            {t('currentPlan') || 'Current Plan'}
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {language === 'ar' && subscriptionInfo.plan.name_ar && subscriptionInfo.plan.name_ar.trim()
                                                ? subscriptionInfo.plan.name_ar
                                                : (subscriptionInfo.plan.name || '-')}
                                        </p>
                                        {subscriptionInfo.plan.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {language === 'ar' && subscriptionInfo.plan.description_ar && subscriptionInfo.plan.description_ar.trim()
                                                    ? subscriptionInfo.plan.description_ar
                                                    : subscriptionInfo.plan.description}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            {t('billingCycle') || 'Billing Cycle'}
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {subscriptionInfo.billingCycle === 'yearly' ? t('yearly') : t('monthly')}
                                        </p>
                                    </div>
                                    {planPrice !== null && planPrice > 0 && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                {t('price') || 'Price'}
                                            </p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(planPrice)} / {subscriptionInfo.billingCycle === 'yearly' ? t('year') : t('month')}
                                            </p>
                                        </div>
                                    )}
                                    {subscriptionInfo.plan.users && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                {t('usersIncluded') || 'Users'}
                                            </p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {subscriptionInfo.plan.users}
                                            </p>
                                        </div>
                                    )}
                                    {subscriptionInfo.plan.clients && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                {t('clientsIncluded') || 'Clients'}
                                            </p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {subscriptionInfo.plan.clients}
                                            </p>
                                        </div>
                                    )}
                                    {subscriptionInfo.plan.storage && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                {t('storageIncluded') || 'Storage'}
                                            </p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {subscriptionInfo.plan.storage} GB
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {subscriptionInfo.startDate && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            {t('startDate') || 'Start Date'}
                                        </p>
                                        <p className="text-base font-medium text-gray-900 dark:text-white">
                                            {formatDate(subscriptionInfo.startDate)}
                                        </p>
                                    </div>
                                )}
                                {subscriptionInfo.endDate && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            {t('subscriptionEndDate') || 'End Date'}
                                        </p>
                                        <p className="text-base font-medium text-gray-900 dark:text-white">
                                            {formatDate(subscriptionInfo.endDate)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Renewal Reminder */}
                            {subscriptionInfo.isActive && daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30 && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        {t('subscriptionRenewalReminder')?.replace('{days}', daysRemaining.toString()) || 
                                         `Your subscription will end in ${daysRemaining} day(s). Please renew to continue using our services.`}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                {subscriptionInfo.isActive && (
                                    <Button 
                                        onClick={() => setShowRenewalModal(true)}
                                        disabled={isRenewing}
                                        className="flex-1"
                                    >
                                        {t('renewSubscription') || 'Renew Subscription'}
                                    </Button>
                                )}
                                <Button 
                                    onClick={() => setShowChangePlanModal(true)}
                                    variant="outline"
                                    disabled={isRenewing}
                                    className="flex-1"
                                >
                                    {t('changePlan') || 'Change Plan'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {t('noSubscriptionFound') || 'No active subscription found'}
                            </p>
                            <Button onClick={() => setShowChangePlanModal(true)}>
                                {t('selectPlan') || 'Select a Plan'}
                            </Button>
                        </div>
                    )}
                </Card>

                {/* Billing History - Placeholder for future implementation */}
                <Card>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">
                        {t('billingHistory') || 'Billing History'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                        {t('billingHistoryComingSoon') || 'Billing history will be available soon'}
                    </p>
                </Card>
            </div>

            {/* Renew Subscription Modal */}
            <Modal
                isOpen={showRenewalModal}
                onClose={() => {
                    setShowRenewalModal(false);
                    setSelectedGateway(null);
                }}
                title={t('renewSubscription') || 'Renew Subscription'}
                maxWidth="lg"
            >
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('selectPaymentMethodForRenewal') || 'Select a payment method to renew your subscription'}
                    </p>
                    <PaymentGatewaySelector
                        selectedGateway={selectedGateway}
                        onSelect={setSelectedGateway}
                    />
                    <div className="flex justify-end gap-4 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowRenewalModal(false);
                                setSelectedGateway(null);
                            }}
                        >
                            {t('cancel') || 'Cancel'}
                        </Button>
                        <Button
                            onClick={handleRenewSubscription}
                            loading={isRenewing}
                            disabled={!selectedGateway || isRenewing}
                        >
                            {isRenewing ? (t('processing') || 'Processing...') : (t('proceedToPayment') || 'Proceed to Payment')}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Change Plan Modal */}
            <Modal
                isOpen={showChangePlanModal}
                onClose={() => {
                    setShowChangePlanModal(false);
                    setSelectedGateway(null);
                    setSelectedPlan(null);
                }}
                title={t('changePlan') || 'Change Plan'}
                maxWidth="2xl"
            >
                <div className="space-y-6">
                    {/* Billing Cycle Toggle */}
                    <div className="flex justify-center">
                        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-1">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    billingCycle === 'monthly'
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {t('monthly') || 'Monthly'}
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    billingCycle === 'yearly'
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {t('yearly') || 'Yearly'}
                            </button>
                        </div>
                    </div>

                    {/* Plans List */}
                    {plansLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader variant="primary" className="h-12" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                            {availablePlans.map((plan) => {
                                const price = billingCycle === 'monthly' 
                                    ? Number(plan.price_monthly || 0) 
                                    : Number(plan.price_yearly || 0);
                                const isSelected = selectedPlan === plan.id;
                                
                                return (
                                    <div
                                        key={plan.id}
                                        onClick={() => setSelectedPlan(plan.id)}
                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            isSelected
                                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold">
                                                {language === 'ar' && plan.name_ar && plan.name_ar.trim()
                                                    ? plan.name_ar
                                                    : plan.name}
                                            </h3>
                                            {isSelected && (
                                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            {language === 'ar' && plan.description_ar && plan.description_ar.trim()
                                                ? plan.description_ar
                                                : plan.description}
                                        </p>
                                        <p className="text-lg font-bold text-primary">
                                            {price === 0 ? t('free') : formatCurrency(price)} / {billingCycle === 'monthly' ? t('month') : t('year')}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Payment Gateway Selection */}
                    <PaymentGatewaySelector
                        selectedGateway={selectedGateway}
                        onSelect={setSelectedGateway}
                    />

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowChangePlanModal(false);
                                setSelectedGateway(null);
                                setSelectedPlan(null);
                            }}
                        >
                            {t('cancel') || 'Cancel'}
                        </Button>
                        <Button
                            onClick={handleChangePlan}
                            loading={isRenewing}
                            disabled={!selectedPlan || !selectedGateway || isRenewing}
                        >
                            {isRenewing ? (t('processing') || 'Processing...') : (t('changePlan') || 'Change Plan')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </PageWrapper>
    );
};

