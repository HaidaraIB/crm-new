
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, Loader, PaymentGatewaySelector } from '../components/index';
import { getPublicPlansAPI, createPaymentSessionAPI } from '../services/api';

type PublicPlan = {
    id: number;
    name: string;
    name_ar?: string;
    description: string;
    description_ar?: string;
    price_monthly: number;
    price_yearly: number;
    trial_days: number;
    users: string;
    clients: string;
    storage: number;
};

export const ChangePlanPage = () => {
    const { t, language, theme, currentUser } = useAppContext();
    const [plans, setPlans] = useState<PublicPlan[]>([]);
    const [plansLoading, setPlansLoading] = useState<boolean>(true);
    const [plansError, setPlansError] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedGateway, setSelectedGateway] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

    useEffect(() => {
        // Get subscription_id from URL
        const urlParams = new URLSearchParams(window.location.search);
        const subId = urlParams.get('subscription_id');
        if (subId) {
            setSubscriptionId(subId);
        } else {
            // Try to get from currentUser if logged in
            if (currentUser?.company) {
                // Try to get subscription ID from API
                const loadSubscriptionId = async () => {
                    try {
                        const { getCurrentUserAPI } = await import('../services/api');
                        const userData = await getCurrentUserAPI();
                        if (userData?.company?.subscription?.id) {
                            setSubscriptionId(userData.company.subscription.id.toString());
                        }
                    } catch (error) {
                        console.error('Error loading subscription ID:', error);
                        // Fallback to localStorage
                        const pendingSubId = localStorage.getItem('pendingSubscriptionId');
                        if (pendingSubId) {
                            setSubscriptionId(pendingSubId);
                        }
                    }
                };
                loadSubscriptionId();
            } else {
                // Try to get from localStorage
                const pendingSubId = localStorage.getItem('pendingSubscriptionId');
                if (pendingSubId) {
                    setSubscriptionId(pendingSubId);
                }
            }
        }

        // Load plans
        const loadPlans = async () => {
            setPlansLoading(true);
            setPlansError(null);
            try {
                const data = await getPublicPlansAPI();
                const normalizedPlans = (Array.isArray(data) ? data : []).map((plan: any): PublicPlan => ({
                    id: plan.id,
                    name: plan.name || '',
                    name_ar: plan.name_ar || '',
                    description: plan.description || '',
                    description_ar: plan.description_ar || '',
                    price_monthly: Number(plan.price_monthly || 0),
                    price_yearly: Number(plan.price_yearly || 0),
                    trial_days: Number(plan.trial_days || 0),
                    users: plan.users,
                    clients: plan.clients,
                    storage: Number(plan.storage || 0),
                }));
                setPlans(normalizedPlans);
            } catch (error: any) {
                setPlansError(error.message || t('failedToLoadPlans') || 'Failed to load plans');
            } finally {
                setPlansLoading(false);
            }
        };

        loadPlans();
    }, [t, currentUser]);

    const getPlanPriceLabel = (plan: PublicPlan) => {
        const price = billingCycle === 'monthly' ? Number(plan.price_monthly || 0) : Number(plan.price_yearly || 0);
        if (price === 0) {
            return t('free') || 'Free';
        }
        const formattedPrice = new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
        return `${formattedPrice}/${billingCycle === 'monthly' ? t('month') || 'month' : t('year') || 'year'}`;
    };

    const handleChangePlan = async () => {
        if (!selectedPlan) {
            alert(t('planRequired') || 'Please select a plan to continue');
            return;
        }

        if (!selectedGateway) {
            alert(t('paymentGatewayRequired') || 'Please select a payment method');
            return;
        }

        if (!subscriptionId) {
            alert(t('paymentSubscriptionIdRequired') || 'Subscription ID is required');
            return;
        }

        try {
            setIsProcessing(true);
            // Create payment session with plan_id and billing_cycle to upgrade/downgrade plan
            // The backend should handle plan change even if subscription is active
            const response = await createPaymentSessionAPI(
                parseInt(subscriptionId),
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
            // Show user-friendly error message
            const errorMessage = error?.message || t('errorLoadingPaymentLink') || 'Error loading payment link';
            
            // If error mentions "already active", explain that plan change is still possible
            if (errorMessage.toLowerCase().includes('already active')) {
                alert(t('subscriptionActiveButCanUpgrade') || 'Your subscription is active. You can still upgrade or downgrade your plan. Please try again or contact support.');
            } else {
                alert(errorMessage);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const isRTL = language === 'ar';

    return (
        <PageWrapper title={t('changePlan') || 'Change Plan'}>
            <div className="max-w-6xl mx-auto space-y-6">
                <Card>
                    <h2 className="text-2xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">
                        {t('changePlan') || 'Change Plan'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {t('changePlanDescription') || 'Select a new plan for your subscription'}
                    </p>

                    {/* Billing Cycle Toggle */}
                    <div className="flex justify-center mb-6">
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
                    {plansLoading && (
                        <div className="flex justify-center py-8">
                            <Loader variant="primary" className="h-12" />
                        </div>
                    )}

                    {plansError && !plansLoading && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md">
                            {plansError}
                        </div>
                    )}

                    {!plansLoading && !plansError && plans.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            {t('noPlansAvailable') || 'No plans available'}
                        </div>
                    )}

                    {!plansLoading && !plansError && plans.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                                        selectedPlan === plan.id
                                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-semibold">
                                            {language === 'ar' && plan.name_ar && plan.name_ar.trim()
                                                ? plan.name_ar
                                                : plan.name}
                                        </h3>
                                        {selectedPlan === plan.id && (
                                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                                        {language === 'ar' && plan.description_ar && plan.description_ar.trim()
                                            ? plan.description_ar
                                            : (plan.description || (t('planDefaultDescription') || 'All CRM essentials included.'))}
                                    </p>
                                    <div className="text-2xl font-bold text-primary mb-4">
                                        {getPlanPriceLabel(plan)}
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>{t('usersIncluded') || 'Users'}: {plan.users}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>{t('clientsIncluded') || 'Clients'}: {plan.clients}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>{t('storageIncluded') || 'Storage'}: {plan.storage} GB</span>
                                        </div>
                                        {plan.trial_days > 0 && (
                                            <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>{`${plan.trial_days} ${t('trialDaysLabel') || 'trial days'}`}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Payment Gateway Selection */}
                    <div className="mb-6">
                        <PaymentGatewaySelector
                            selectedGateway={selectedGateway}
                            onSelect={setSelectedGateway}
                        />
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-end gap-4">
                        <Button
                            variant="outline"
                            onClick={() => window.location.href = '/login'}
                        >
                            {t('cancel') || 'Cancel'}
                        </Button>
                        <Button
                            onClick={handleChangePlan}
                            loading={isProcessing}
                            disabled={!selectedPlan || !selectedGateway || isProcessing || !subscriptionId}
                            className="min-w-[150px]"
                        >
                            {isProcessing ? (t('loadingPaymentLink') || 'Loading...') : (t('changePlan') || 'Change Plan')}
                        </Button>
                    </div>
                </Card>
            </div>
        </PageWrapper>
    );
};

